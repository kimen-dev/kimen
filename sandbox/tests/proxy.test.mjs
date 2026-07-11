// @spec:018-project-integrity-hardening#S4
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const proxyUrl = new URL('../proxy.mjs', import.meta.url);
const proxyPath = fileURLToPath(proxyUrl);
const fixtureOwnerUid = process.getuid?.() ?? 1_000;
const distinctAgentUid = fixtureOwnerUid === 4_294_967_294 ? 1_000 : fixtureOwnerUid + 1;
const defaultPolicy = `version 1
bootstrap registry.fixture.invalid:443
agent gateway.fixture.invalid:443
agent xn--bcher-kva.fixture.invalid:443
`;
const sharedResolverMap = new Map([
  ['gateway.fixture.invalid', ['127.0.0.42']],
  ['sibling.fixture.invalid', ['127.0.0.42']],
  ['registry.fixture.invalid', ['127.0.0.43']],
  ['xn--bcher-kva.fixture.invalid', ['127.0.0.44']],
]);

function uint16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function uint24(value) {
  const buffer = Buffer.allocUnsafe(3);
  buffer.writeUIntBE(value, 0, 3);
  return buffer;
}

function tlsExtension(type, data = Buffer.alloc(0)) {
  return Buffer.concat([uint16(type), uint16(data.length), data]);
}

function serverNameExtension(hostname) {
  const hostnameBytes = Buffer.from(hostname, 'ascii');
  const serverName = Buffer.concat([Buffer.from([0]), uint16(hostnameBytes.length), hostnameBytes]);
  return tlsExtension(0, Buffer.concat([uint16(serverName.length), serverName]));
}

function aClientHello({ sni, ech = false } = {}) {
  const extensions = [];
  if (sni !== undefined) {
    extensions.push(serverNameExtension(sni));
  }
  if (ech) {
    extensions.push(tlsExtension(0xfe0d, Buffer.from([0])));
  }

  const encodedExtensions = Buffer.concat(extensions);
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
}

function withDeadline(promise, label, milliseconds = 1_000) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), milliseconds);
  });

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

async function aPolicyFixture(
  t,
  { contents = defaultPolicy, fileMode = 0o444, directoryMode = 0o555, asSymlink = false } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), 'kimen-proxy-policy-'));
  const realPath = join(directory, 'egress-allowlist.real.txt');
  const policyPath = asSymlink ? join(directory, 'egress-allowlist.txt') : realPath;

  await writeFile(realPath, contents, { mode: 0o600 });
  await chmod(realPath, fileMode);
  if (asSymlink) {
    await symlink(realPath, policyPath);
  }
  await chmod(directory, directoryMode);

  t.after(async () => {
    await chmod(directory, 0o700);
    await rm(directory, { recursive: true, force: true });
  });

  return policyPath;
}

async function loadProxyModule() {
  return import(proxyUrl.href);
}

async function createUnstartedProxy(
  t,
  {
    policy = {},
    phase = 'agent',
    trustedOwnerUid = fixtureOwnerUid,
    agentUid = distinctAgentUid,
    resolverMap = sharedResolverMap,
    resolveHost,
    maxClientHelloBytes = 16_384,
    clientHelloTimeoutMs = 100,
  } = {},
) {
  const { createConnectProxy } = await loadProxyModule();
  const allowlistPath = await aPolicyFixture(t, policy);
  const connectCalls = [];
  const resolverQueries = [];
  let observeConnection;
  const connectionObserved = new Promise((resolve) => {
    observeConnection = resolve;
  });

  const server = await createConnectProxy({
    allowlistPath,
    phase,
    trustedOwnerUid,
    agentUid,
    maxClientHelloBytes,
    clientHelloTimeoutMs,
    resolveHost:
      resolveHost ??
      (async (hostname) => {
        resolverQueries.push(hostname);
        const addresses = resolverMap.get(hostname);
        if (addresses === undefined) {
          throw new Error(`fixture has no address for ${hostname}`);
        }
        return addresses;
      }),
    connectUpstream: async (request) => {
      connectCalls.push(request);
      observeConnection(request);
      return new PassThrough();
    },
  });

  return { server, connectCalls, resolverQueries, connectionObserved };
}

async function startProxy(t, options) {
  const fixture = await createUnstartedProxy(t, options);
  fixture.server.listen(0, '127.0.0.1');
  await withDeadline(once(fixture.server, 'listening'), 'proxy listen');
  t.after(
    () =>
      new Promise((resolve) => {
        fixture.server.close(resolve);
      }),
  );

  return fixture;
}

async function connectClient(server) {
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');
  const socket = createConnection({ host: '127.0.0.1', port: address.port });
  await withDeadline(once(socket, 'connect'), 'loopback client connection');
  return socket;
}

function connectRequest(authority, { host = authority, extraHeaders = [] } = {}) {
  return `CONNECT ${authority} HTTP/1.1\r\nHost: ${host}\r\n${extraHeaders.join('\r\n')}\r\n\r\n`;
}

function readResponseHead(socket) {
  return withDeadline(
    new Promise((resolve) => {
      let received = Buffer.alloc(0);
      const finish = () => {
        socket.off('data', onData);
        socket.off('close', onClose);
        resolve(received.toString('latin1'));
      };
      const onData = (chunk) => {
        received = Buffer.concat([received, chunk]);
        if (received.includes(Buffer.from('\r\n\r\n'))) {
          finish();
        }
      };
      const onClose = () => finish();
      socket.on('data', onData);
      socket.on('close', onClose);
    }),
    'proxy response head',
  );
}

async function establishTunnel(server, authority, requestOptions) {
  const socket = await connectClient(server);
  const responsePromise = readResponseHead(socket);
  socket.write(connectRequest(authority, requestOptions));
  const response = await responsePromise;
  assert.match(response, /^HTTP\/1\.[01] 200(?: |\r)/);
  return socket;
}

async function waitForClose(socket) {
  if (socket.destroyed) {
    return;
  }
  await withDeadline(once(socket, 'close'), 'proxy denial');
}

async function assertAuthorityDenied(fixture, authority, requestOptions) {
  const socket = await connectClient(fixture.server);
  const responsePromise = readResponseHead(socket);
  socket.write(connectRequest(authority, requestOptions));
  const response = await responsePromise;
  assert.doesNotMatch(response, /^HTTP\/1\.[01] 200(?: |\r)/);
  socket.destroy();
  await waitForClose(socket);
  assert.deepEqual(fixture.connectCalls, []);
}

async function assertClientHelloDenied(fixture, hello, authority = 'gateway.fixture.invalid:443') {
  const socket = await establishTunnel(fixture.server, authority);
  socket.write(hello);
  await waitForClose(socket);
  assert.deepEqual(fixture.connectCalls, []);
}

async function assertTunnelAllowed(
  fixture,
  {
    authority = 'gateway.fixture.invalid:443',
    sni = 'gateway.fixture.invalid',
    requestOptions,
  } = {},
) {
  const socket = await establishTunnel(fixture.server, authority, requestOptions);
  socket.write(aClientHello({ sni }));
  const observed = await withDeadline(fixture.connectionObserved, 'validated upstream connection');
  socket.destroy();
  await waitForClose(socket);
  return observed;
}

test('S4 documents the fail-closed production proxy CLI', () => {
  const result = spawnSync(process.execPath, [proxyPath, '--help'], {
    encoding: 'utf8',
    env: { LC_ALL: 'C', PATH: process.env.PATH },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /serve --allowlist <path> --phase <bootstrap\|agent> --listen 127\.0\.0\.1:<port> --agent-uid <uid>/,
  );
});

test('S4 connects an exact agent-phase host only after matching TLS SNI', async (t) => {
  const fixture = await startProxy(t);

  const observed = await assertTunnelAllowed(fixture);

  assert.deepEqual(observed, {
    hostname: 'gateway.fixture.invalid',
    port: 443,
    addresses: ['127.0.0.42'],
  });
  assert.deepEqual(fixture.resolverQueries, ['gateway.fixture.invalid']);
});

test('S4 denies a bootstrap-only host during the agent phase', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'registry.fixture.invalid:443');
});

test('S4 uses the bootstrap allowlist without inheriting agent destinations', async (t) => {
  const fixture = await startProxy(t, { phase: 'bootstrap' });

  const bootstrap = await assertTunnelAllowed(fixture, {
    authority: 'REGISTRY.FIXTURE.INVALID.:443',
    sni: 'registry.fixture.invalid.',
  });

  assert.deepEqual(bootstrap, {
    hostname: 'registry.fixture.invalid',
    port: 443,
    addresses: ['127.0.0.43'],
  });
});

test('S4 normalizes case and one trailing root dot before exact comparison', async (t) => {
  const fixture = await startProxy(t);

  const observed = await assertTunnelAllowed(fixture, {
    authority: 'GATEWAY.FIXTURE.INVALID.:443',
    sni: 'GATEWAY.FIXTURE.INVALID.',
  });

  assert.equal(observed.hostname, 'gateway.fixture.invalid');
});

test('S4 rejects multiple trailing dots instead of over-normalizing authority', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid..:443');
});

test('S4 canonicalizes an IDNA allowlist entry to its exact ASCII hostname', async (t) => {
  const fixture = await startProxy(t, {
    policy: { contents: 'version 1\nagent b\u00fccher.fixture.invalid:443\n' },
  });

  const observed = await assertTunnelAllowed(fixture, {
    authority: 'xn--bcher-kva.fixture.invalid:443',
    sni: 'xn--bcher-kva.fixture.invalid',
  });

  assert.equal(observed.hostname, 'xn--bcher-kva.fixture.invalid');
});

test('S4 rejects suffix confusion instead of using endsWith matching', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid.attacker.invalid:443');
});

test('S4 rejects userinfo in CONNECT authority', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid@attacker.invalid:443');
});

test('S4 rejects IPv4 literals even when the resolver map contains that address', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, '127.0.0.42:443');
});

test('S4 rejects bracketed IPv6 literals', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, '[::1]:443');
});

test('S4 rejects undeclared CONNECT ports', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid:8443');
});

test('S4 rejects CONNECT authority without an explicit port', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid');
});

test('S4 rejects conflicting duplicate Host headers', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid:443', {
    extraHeaders: ['Host: attacker.fixture.invalid:443'],
  });
});

test('S4 rejects a Host header that differs from CONNECT authority', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid:443', {
    host: 'attacker.fixture.invalid:443',
  });
});

test('S4 rejects obsolete folded headers instead of accepting header smuggling', async (t) => {
  const fixture = await startProxy(t);

  await assertAuthorityDenied(fixture, 'gateway.fixture.invalid:443', {
    extraHeaders: ['X-Fixture: accepted', '\tHost: attacker.fixture.invalid:443'],
  });
});

test('S4 rejects cross-vhost SNI even when both hosts resolve to one shared IP', async (t) => {
  const fixture = await startProxy(t);

  await assertClientHelloDenied(fixture, aClientHello({ sni: 'sibling.fixture.invalid' }));

  assert.deepEqual(sharedResolverMap.get('gateway.fixture.invalid'), ['127.0.0.42']);
  assert.deepEqual(sharedResolverMap.get('sibling.fixture.invalid'), ['127.0.0.42']);
});

test('S4 rejects a TLS ClientHello without SNI', async (t) => {
  const fixture = await startProxy(t);

  await assertClientHelloDenied(fixture, aClientHello());
});

test('S4 rejects ECH instead of trusting an unverifiable outer name', async (t) => {
  const fixture = await startProxy(t);

  await assertClientHelloDenied(
    fixture,
    aClientHello({ sni: 'gateway.fixture.invalid', ech: true }),
  );
});

test('S4 rejects plaintext after CONNECT before opening upstream', async (t) => {
  const fixture = await startProxy(t);

  await assertClientHelloDenied(fixture, Buffer.from('GET / HTTP/1.1\r\n\r\n'));
});

test('S4 rejects malformed or truncated TLS ClientHello bytes', async (t) => {
  const fixture = await startProxy(t);

  await assertClientHelloDenied(
    fixture,
    aClientHello({ sni: 'gateway.fixture.invalid' }).subarray(0, 19),
  );
});

test('S4 rejects a ClientHello that exceeds the configured bound', async (t) => {
  const fixture = await startProxy(t, { maxClientHelloBytes: 64 });

  await assertClientHelloDenied(fixture, Buffer.alloc(65, 0x16));
});

test('S4 rejects a timed-out ClientHello without resolving or connecting', async (t) => {
  const fixture = await startProxy(t, { clientHelloTimeoutMs: 25 });
  const socket = await establishTunnel(fixture.server, 'gateway.fixture.invalid:443');

  await waitForClose(socket);

  assert.deepEqual(fixture.resolverQueries, []);
  assert.deepEqual(fixture.connectCalls, []);
});

test('S4 fails closed when exact-host resolution fails', async (t) => {
  const fixture = await startProxy(t, {
    resolveHost: async () => {
      throw new Error('fixture resolver failure');
    },
  });

  await assertClientHelloDenied(fixture, aClientHello({ sni: 'gateway.fixture.invalid' }));

  assert.deepEqual(fixture.connectCalls, []);
});

test('S4 rejects an allowlist not owned by the configured root identity', async (t) => {
  await assert.rejects(
    () => createUnstartedProxy(t, { trustedOwnerUid: distinctAgentUid }),
    /allowlist.*owner|owner.*allowlist/i,
  );
});

test('S4 rejects an allowlist writable by the agent identity', async (t) => {
  await assert.rejects(
    () =>
      createUnstartedProxy(t, {
        agentUid: fixtureOwnerUid,
        policy: { fileMode: 0o600, directoryMode: 0o700 },
      }),
    /allowlist.*writ|writ.*allowlist|agent.*writ/i,
  );
});

test('S4 rejects group- or world-writable allowlist content', async (t) => {
  await assert.rejects(
    () => createUnstartedProxy(t, { policy: { fileMode: 0o666 } }),
    /allowlist.*writ|writ.*allowlist/i,
  );
});

test('S4 rejects an allowlist inside an agent-replaceable directory', async (t) => {
  await assert.rejects(
    () => createUnstartedProxy(t, { policy: { directoryMode: 0o777 } }),
    /directory.*writ|writ.*directory|replace/i,
  );
});

test('S4 rejects a symlinked allowlist path', async (t) => {
  await assert.rejects(
    () => createUnstartedProxy(t, { policy: { asSymlink: true } }),
    /allowlist.*symlink|symlink.*allowlist/i,
  );
});

test('S4 rejects an unsupported allowlist schema version', async (t) => {
  await assert.rejects(
    () => createUnstartedProxy(t, { policy: { contents: 'version 2\nagent nope.invalid:443\n' } }),
    /allowlist.*version|version.*allowlist/i,
  );
});
