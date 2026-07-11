import { EventEmitter } from 'node:events';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConnectProxy, parseCliArguments } from '../../sandbox/proxy.mjs';

// @spec:018-project-integrity-hardening#S4

const ownerUid = process.getuid?.() ?? 1_000;
const agentUid = ownerUid + 1;
const allowedHost = 'gateway.fixture.invalid';
const defaultPolicy = `version 1
bootstrap registry.fixture.invalid:443
agent ${allowedHost}:443
agent xn--bcher-kva.fixture.invalid:443
`;
const temporaryDirectories = new Set();

const uint16 = (value) => {
  const result = Buffer.alloc(2);
  result.writeUInt16BE(value);
  return result;
};

const uint24 = (value) => {
  const result = Buffer.alloc(3);
  result.writeUIntBE(value, 0, 3);
  return result;
};

const tlsExtension = (type, data = Buffer.alloc(0)) =>
  Buffer.concat([uint16(type), uint16(data.length), data]);

const serverNameData = (...names) => {
  const encodedNames = names.map((name) => {
    const bytes = Buffer.isBuffer(name) ? name : Buffer.from(name, 'ascii');
    return Buffer.concat([Buffer.from([0]), uint16(bytes.length), bytes]);
  });
  const entries = Buffer.concat(encodedNames);
  return Buffer.concat([uint16(entries.length), entries]);
};

const aClientHello = ({ sni = allowedHost, extensions = [], ech = false } = {}) => {
  const helloExtensions = [];
  if (sni !== null) {
    helloExtensions.push(tlsExtension(0, serverNameData(sni)));
  }
  helloExtensions.push(...extensions);
  if (ech) {
    helloExtensions.push(tlsExtension(0xfe0d, Buffer.from([0])));
  }
  const encodedExtensions = Buffer.concat(helloExtensions);
  const body = Buffer.concat([
    Buffer.from([0x03, 0x03]),
    Buffer.alloc(32, 0x5a),
    Buffer.from([0]),
    uint16(2),
    Buffer.from([0x13, 0x01]),
    Buffer.from([1, 0]),
    uint16(encodedExtensions.length),
    encodedExtensions,
  ]);
  const handshake = Buffer.concat([Buffer.from([1]), uint24(body.length), body]);
  return Buffer.concat([Buffer.from([0x16, 0x03, 0x01]), uint16(handshake.length), handshake]);
};

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.ended = false;
    this.writes = [];
    this.pipeTargets = [];
    this.endedPromise = new Promise((resolvePromise) => {
      this.resolveEnded = resolvePromise;
    });
    this.firstWritePromise = new Promise((resolvePromise) => {
      this.resolveFirstWrite = resolvePromise;
    });
  }

  write(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk));
    this.writes.push(bytes);
    this.resolveFirstWrite(bytes);
    return true;
  }

  end(chunk) {
    if (chunk !== undefined) {
      this.write(chunk);
    }
    this.ended = true;
    this.resolveEnded();
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this.emit('close');
    }
  }

  resume() {
    return this;
  }

  pipe(destination) {
    this.pipeTargets.push(destination);
    return destination;
  }

  output() {
    return Buffer.concat(this.writes).toString('latin1');
  }
}

const aPolicy = async ({
  contents = defaultPolicy,
  fileMode = 0o444,
  directoryMode = 0o555,
  asSymlink = false,
} = {}) => {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-mutation-proxy-'));
  temporaryDirectories.add(directory);
  const realPath = join(directory, 'allowlist.real.txt');
  const policyPath = asSymlink ? join(directory, 'allowlist.txt') : realPath;
  await writeFile(realPath, contents, { mode: 0o600 });
  await chmod(realPath, fileMode);
  if (asSymlink) {
    await symlink(realPath, policyPath);
  }
  await chmod(directory, directoryMode);
  return policyPath;
};

const createFixture = async ({
  policy,
  phase = 'agent',
  trustedOwnerUid = ownerUid,
  selectedAgentUid = agentUid,
  resolveHost = async (hostname) => [`192.0.2.${hostname === allowedHost ? '10' : '20'}`],
  connectUpstream,
  maxClientHelloBytes = 16_384,
  clientHelloTimeoutMs = 100,
} = {}) => {
  const allowlistPath = await aPolicy(policy);
  const resolverQueries = [];
  const connectCalls = [];
  const upstream = new FakeSocket();
  let resolveConnection;
  const connectionPromise = new Promise((resolvePromise) => {
    resolveConnection = resolvePromise;
  });
  const server = await createConnectProxy({
    allowlistPath,
    phase,
    trustedOwnerUid,
    agentUid: selectedAgentUid,
    maxClientHelloBytes,
    clientHelloTimeoutMs,
    resolveHost: async (hostname) => {
      resolverQueries.push(hostname);
      return resolveHost(hostname);
    },
    connectUpstream:
      connectUpstream ??
      (async (request) => {
        connectCalls.push(request);
        resolveConnection(request);
        return upstream;
      }),
  });
  return { server, resolverQueries, connectCalls, connectionPromise, upstream };
};

const request = (authority, { host = authority, rawHeaders } = {}) => ({
  url: authority,
  rawHeaders: rawHeaders ?? ['Host', host],
});

const emitConnect = (
  fixture,
  { authority = `${allowedHost}:443`, requestOptions, hello = aClientHello() } = {},
) => {
  const client = new FakeSocket();
  fixture.server.emit('connect', request(authority, requestOptions), client, hello);
  return client;
};

const expectDeniedAuthority = async (fixture, authority, requestOptions) => {
  const client = emitConnect(fixture, { authority, requestOptions });
  await client.endedPromise;
  expect(client.output()).toBe('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  expect(fixture.resolverQueries).toEqual([]);
  expect(fixture.connectCalls).toEqual([]);
};

const expectDeniedHello = async (fixture, hello, authority = `${allowedHost}:443`) => {
  const client = emitConnect(fixture, { authority, hello });
  await client.endedPromise;
  expect(client.output()).toBe('HTTP/1.1 200 Connection Established\r\n\r\n');
  expect(fixture.connectCalls).toEqual([]);
};

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(
    [...temporaryDirectories].map(async (directory) => {
      await chmod(directory, 0o700);
      await rm(directory, { recursive: true, force: true });
    }),
  );
  temporaryDirectories.clear();
});

describe('sandbox CONNECT proxy mutation boundary', () => {
  it('S4 routes an exact authority only after validating the matching TLS SNI', async () => {
    const fixture = await createFixture();
    const hello = aClientHello();
    const client = emitConnect(fixture, { hello });

    await fixture.upstream.firstWritePromise;

    await expect(fixture.connectionPromise).resolves.toEqual({
      hostname: allowedHost,
      port: 443,
      addresses: ['192.0.2.10'],
    });
    expect(fixture.resolverQueries).toEqual([allowedHost]);
    expect(fixture.upstream.writes).toEqual([hello]);
    expect(client.pipeTargets).toEqual([fixture.upstream]);
    expect(fixture.upstream.pipeTargets).toEqual([client]);
  });

  it('S4 strips leading CONNECT delimiter bytes before validating ClientHello', async () => {
    const fixture = await createFixture();
    const hello = aClientHello();
    emitConnect(fixture, { hello: Buffer.concat([Buffer.from('\r\n\r\n'), hello]) });

    await fixture.upstream.firstWritePromise;

    expect(fixture.upstream.writes).toEqual([hello]);
  });

  it('S4 accepts a fragmented ClientHello without opening upstream early', async () => {
    const fixture = await createFixture();
    const hello = aClientHello();
    const client = emitConnect(fixture, { hello: hello.subarray(0, 4) });

    expect(fixture.connectCalls).toEqual([]);
    client.emit('data', hello.subarray(4));
    await fixture.upstream.firstWritePromise;

    expect(fixture.upstream.writes).toEqual([hello]);
  });

  it.each([
    ['bootstrap-only host', 'registry.fixture.invalid:443', undefined],
    ['suffix confusion', `${allowedHost}.attacker.invalid:443`, undefined],
    ['userinfo', `${allowedHost}@attacker.invalid:443`, undefined],
    ['IPv4 literal', '192.0.2.10:443', undefined],
    ['bracketed IPv6 literal', '[::1]:443', undefined],
    ['wrong port', `${allowedHost}:8443`, undefined],
    ['missing port', allowedHost, undefined],
    ['two root dots', `${allowedHost}..:443`, undefined],
    ['different Host', `${allowedHost}:443`, { host: 'attacker.fixture.invalid:443' }],
    [
      'duplicate Host',
      `${allowedHost}:443`,
      { rawHeaders: ['Host', `${allowedHost}:443`, 'Host', `${allowedHost}:443`] },
    ],
    [
      'folded header',
      `${allowedHost}:443`,
      { rawHeaders: ['Host', `${allowedHost}:443`, 'X-Test', 'bad\tvalue'] },
    ],
  ])('S4 denies CONNECT authority with %s', async (_label, authority, requestOptions) => {
    const fixture = await createFixture();
    await expectDeniedAuthority(fixture, authority, requestOptions);
  });

  it('S4 normalizes case, one root dot and IDNA without broadening exact matching', async () => {
    const fixture = await createFixture();
    const client = emitConnect(fixture, {
      authority: 'XN--BCHER-KVA.FIXTURE.INVALID.:443',
      requestOptions: { host: 'xn--bcher-kva.fixture.invalid:443' },
      hello: aClientHello({ sni: 'XN--BCHER-KVA.FIXTURE.INVALID.' }),
    });

    await fixture.upstream.firstWritePromise;

    await expect(fixture.connectionPromise).resolves.toMatchObject({
      hostname: 'xn--bcher-kva.fixture.invalid',
      port: 443,
    });
    expect(client.ended).toBe(false);
  });

  it.each([
    ['plaintext', Buffer.from('GET / HTTP/1.1\r\n\r\n')],
    ['oversized input', Buffer.alloc(16_385, 0x16)],
    [
      'wrong handshake type',
      (() => {
        const hello = aClientHello();
        hello[5] = 2;
        return hello;
      })(),
    ],
    [
      'wrong handshake length',
      (() => {
        const hello = aClientHello();
        hello.writeUIntBE(1, 6, 3);
        return hello;
      })(),
    ],
    ['missing SNI', aClientHello({ sni: null })],
    ['cross-host SNI', aClientHello({ sni: 'sibling.fixture.invalid' })],
    ['encrypted ClientHello', aClientHello({ ech: true })],
    [
      'duplicate SNI extension',
      aClientHello({ extensions: [tlsExtension(0, serverNameData(allowedHost))] }),
    ],
    [
      'multiple server names',
      aClientHello({
        sni: null,
        extensions: [tlsExtension(0, serverNameData(allowedHost, 'other.invalid'))],
      }),
    ],
    [
      'empty server name',
      aClientHello({ sni: null, extensions: [tlsExtension(0, serverNameData(''))] }),
    ],
    [
      'non-ASCII server name',
      aClientHello({
        sni: null,
        extensions: [tlsExtension(0, serverNameData(Buffer.from([0xff])))],
      }),
    ],
  ])('S4 rejects TLS with %s', async (_label, hello) => {
    const fixture = await createFixture();
    await expectDeniedHello(fixture, hello);
  });

  it('S4 closes a client that disconnects before completing ClientHello', async () => {
    const fixture = await createFixture();
    const client = emitConnect(fixture, { hello: Buffer.from([0x16]) });

    client.emit('close');
    await client.endedPromise;

    expect(fixture.connectCalls).toEqual([]);
  });

  it('S4 closes a client that errors before completing ClientHello', async () => {
    const fixture = await createFixture();
    const client = emitConnect(fixture, { hello: Buffer.from([0x16]) });

    client.emit('error', new Error('fixture read error'));
    await client.endedPromise;

    expect(fixture.connectCalls).toEqual([]);
  });

  it('S4 times out an incomplete ClientHello without a fixed wait', async () => {
    vi.useFakeTimers();
    const fixture = await createFixture({ clientHelloTimeoutMs: 25 });
    const client = emitConnect(fixture, { hello: Buffer.from([0x16]) });

    await vi.advanceTimersByTimeAsync(25);
    await client.endedPromise;

    expect(fixture.resolverQueries).toEqual([]);
    expect(fixture.connectCalls).toEqual([]);
  });

  it.each([
    ['empty resolution', async () => []],
    ['non-array resolution', async () => '192.0.2.10'],
    [
      'resolver failure',
      async () => {
        throw new Error('fixture resolver failure');
      },
    ],
  ])('S4 fails closed after %s', async (_label, resolveHost) => {
    const fixture = await createFixture({ resolveHost });
    const client = emitConnect(fixture);

    await client.endedPromise;

    expect(fixture.connectCalls).toEqual([]);
  });

  it('S4 fails closed when the injected upstream connector rejects', async () => {
    const fixture = await createFixture({
      connectUpstream: async () => {
        throw new Error('fixture connect failure');
      },
    });
    const client = emitConnect(fixture);

    await client.endedPromise;

    expect(client.ended).toBe(true);
  });

  it('S4 tears down either side after an established tunnel errors', async () => {
    const fixture = await createFixture();
    const client = emitConnect(fixture);
    await fixture.upstream.firstWritePromise;

    fixture.upstream.emit('error', new Error('upstream failure'));
    expect(client.destroyed).toBe(true);

    const secondFixture = await createFixture();
    const secondClient = emitConnect(secondFixture);
    await secondFixture.upstream.firstWritePromise;
    secondClient.emit('error', new Error('client failure'));
    expect(secondFixture.upstream.destroyed).toBe(true);
  });

  it('S4 clientError receives the same fail-closed denial', async () => {
    const fixture = await createFixture();
    const client = new FakeSocket();

    fixture.server.emit('clientError', new Error('bad request'), client);
    await client.endedPromise;

    expect(client.output()).toBe('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  });

  it('S4 does not write a denial to an already-destroyed client', async () => {
    const fixture = await createFixture();
    const client = new FakeSocket();
    client.destroyed = true;

    fixture.server.emit('clientError', new Error('late parse error'), client);

    expect(client.output()).toBe('');
    expect(client.ended).toBe(false);
  });

  it.each([
    ['missing UID', { agentUid: undefined }, /agent UID is required/u],
    ['negative UID', { agentUid: -1 }, /agent UID is required/u],
    ['fractional UID', { agentUid: 1.5 }, /agent UID is required/u],
    [
      'small ClientHello limit',
      { agentUid, maxClientHelloBytes: 63 },
      /invalid ClientHello byte limit/u,
    ],
    [
      'fractional ClientHello limit',
      { agentUid, maxClientHelloBytes: 64.5 },
      /invalid ClientHello byte limit/u,
    ],
    ['zero timeout', { agentUid, clientHelloTimeoutMs: 0 }, /invalid ClientHello timeout/u],
    ['fractional timeout', { agentUid, clientHelloTimeoutMs: 1.5 }, /invalid ClientHello timeout/u],
  ])('S4 rejects proxy configuration with %s', async (_label, overrides, error) => {
    await expect(
      createConnectProxy({
        allowlistPath: '/unused-before-validation',
        phase: 'agent',
        ...overrides,
      }),
    ).rejects.toThrow(error);
  });

  it.each([
    ['an unsupported phase', { phase: 'release' }, /invalid proxy phase/u],
    ['the wrong owner', { trustedOwnerUid: agentUid }, /owner is not trusted/u],
    [
      'an agent-writable file',
      { selectedAgentUid: ownerUid, policy: { fileMode: 0o600, directoryMode: 0o555 } },
      /writable by an untrusted identity/u,
    ],
    [
      'a group-writable file',
      { policy: { fileMode: 0o464 } },
      /writable by an untrusted identity/u,
    ],
    [
      'an agent-replaceable directory',
      { selectedAgentUid: ownerUid, policy: { directoryMode: 0o700 } },
      /directory is writable or replaceable/u,
    ],
    [
      'a world-writable directory',
      { policy: { directoryMode: 0o557 } },
      /directory is writable or replaceable/u,
    ],
    ['a symlinked policy', { policy: { asSymlink: true } }, /symlink or non-file is forbidden/u],
    [
      'a wrong policy version',
      { policy: { contents: 'version 2\n' } },
      /unsupported allowlist version/u,
    ],
    [
      'a malformed policy line',
      { policy: { contents: 'version 1\nagent\n' } },
      /invalid allowlist entry/u,
    ],
    [
      'a policy port other than 443',
      { policy: { contents: 'version 1\nagent host.invalid:80\n' } },
      /invalid allowlist entry/u,
    ],
    [
      'an IP policy entry',
      { policy: { contents: 'version 1\nagent 192.0.2.1:443\n' } },
      /invalid allowlist entry/u,
    ],
  ])('S4 rejects policy with %s', async (_label, options, error) => {
    await expect(createFixture(options)).rejects.toThrow(error);
  });

  it('S4 isolates bootstrap and agent authority sets', async () => {
    const fixture = await createFixture({ phase: 'bootstrap' });
    const client = emitConnect(fixture, {
      authority: 'REGISTRY.FIXTURE.INVALID.:443',
      requestOptions: { host: 'registry.fixture.invalid:443' },
      hello: aClientHello({ sni: 'registry.fixture.invalid.' }),
    });

    await fixture.upstream.firstWritePromise;

    await expect(fixture.connectionPromise).resolves.toMatchObject({
      hostname: 'registry.fixture.invalid',
      port: 443,
    });
    expect(client.ended).toBe(false);
  });

  it('S4 parses the exact loopback CLI contract', () => {
    expect(
      parseCliArguments([
        'serve',
        '--phase',
        'agent',
        '--allowlist',
        './policy.txt',
        '--agent-uid',
        '501',
        '--listen',
        '127.0.0.1:8443',
      ]),
    ).toEqual({
      allowlistPath: resolve('./policy.txt'),
      phase: 'agent',
      host: '127.0.0.1',
      port: 8_443,
      agentUid: 501,
    });
  });

  it('S4 prints help without constructing a server', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    expect(parseCliArguments(['--help'])).toBeNull();
    expect(write).toHaveBeenCalledOnce();
    expect(String(write.mock.calls[0][0])).toMatch(/serve --allowlist <path>/u);
  });

  it.each([
    [[]],
    [['start']],
    [['serve', '--allowlist']],
    [['serve', 'allowlist', 'path']],
    [['serve', '--allowlist', '--phase']],
    [
      [
        'serve',
        '--unknown',
        'value',
        '--phase',
        'agent',
        '--listen',
        '127.0.0.1:1',
        '--agent-uid',
        '1',
      ],
    ],
    [
      [
        'serve',
        '--phase',
        'agent',
        '--phase',
        'agent',
        '--listen',
        '127.0.0.1:1',
        '--agent-uid',
        '1',
      ],
    ],
    [
      [
        'serve',
        '--allowlist',
        'a',
        '--phase',
        'agent',
        '--listen',
        '0.0.0.0:443',
        '--agent-uid',
        '1',
      ],
    ],
    [
      [
        'serve',
        '--allowlist',
        'a',
        '--phase',
        'agent',
        '--listen',
        '127.0.0.1:0',
        '--agent-uid',
        '1',
      ],
    ],
    [
      [
        'serve',
        '--allowlist',
        'a',
        '--phase',
        'agent',
        '--listen',
        '127.0.0.1:65536',
        '--agent-uid',
        '1',
      ],
    ],
    [
      [
        'serve',
        '--allowlist',
        'a',
        '--phase',
        'agent',
        '--listen',
        '127.0.0.1:443',
        '--agent-uid',
        '1.5',
      ],
    ],
  ])('S4 rejects malformed proxy CLI arguments %#', (arguments_) => {
    expect(() => parseCliArguments(arguments_)).toThrow(/^usage: serve/u);
  });
});
