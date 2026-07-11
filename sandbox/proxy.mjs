#!/usr/bin/env node
import { lookup } from 'node:dns/promises';
import { lstat, readFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createConnection, isIP } from 'node:net';
import { dirname, resolve } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { domainToASCII, fileURLToPath } from 'node:url';

const HELP =
  'serve --allowlist <path> --phase <bootstrap|agent> --listen 127.0.0.1:<port> --agent-uid <uid>';

function normalizeHostname(value) {
  if (typeof value !== 'string' || value.length === 0 || value.endsWith('..')) {
    return null;
  }

  const withoutRootDot = value.endsWith('.') ? value.slice(0, -1) : value;
  const ascii = domainToASCII(withoutRootDot.toLowerCase());
  if (
    !ascii ||
    ascii.length > 253 ||
    ascii.includes(':') ||
    isIP(ascii) !== 0 ||
    ascii.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    return null;
  }
  return ascii;
}

function parseAuthority(value) {
  if (typeof value !== 'string' || value.includes('@') || value.includes('[')) {
    return null;
  }
  const match = /^([^:]+):(\d+)$/.exec(value);
  if (match === null || match[2] !== '443') {
    return null;
  }
  const hostname = normalizeHostname(match[1]);
  return hostname === null ? null : { hostname, port: 443 };
}

function identityCanWrite(stats, uid) {
  return ((stats.mode & 0o200) !== 0 && stats.uid === uid) || (stats.mode & 0o002) !== 0;
}

async function validatePolicyPath(path, trustedOwnerUid, agentUid) {
  const [fileStats, directoryStats] = await Promise.all([lstat(path), lstat(dirname(path))]);
  if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
    throw new Error('allowlist symlink or non-file is forbidden');
  }
  if (fileStats.uid !== trustedOwnerUid) {
    throw new Error('allowlist owner is not trusted');
  }
  if ((fileStats.mode & 0o022) !== 0 || identityCanWrite(fileStats, agentUid)) {
    throw new Error('allowlist is writable by an untrusted identity');
  }
  if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
    throw new Error('allowlist directory is replaceable');
  }
  if ((directoryStats.mode & 0o022) !== 0 || identityCanWrite(directoryStats, agentUid)) {
    throw new Error('allowlist directory is writable or replaceable by the agent');
  }
}

function parsePolicy(contents) {
  const lines = contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.shift() !== 'version 1') {
    throw new Error('unsupported allowlist version');
  }

  const phases = { agent: new Set(), bootstrap: new Set() };
  for (const line of lines) {
    const match = /^(bootstrap|agent)\s+(\S+)$/u.exec(line);
    const authority = match === null ? null : parseAuthority(match[2]);
    if (match === null || authority === null) {
      throw new Error('invalid allowlist entry');
    }
    phases[match[1]].add(`${authority.hostname}:${authority.port}`);
  }
  return phases;
}

async function loadPolicy(path, phase, trustedOwnerUid, agentUid) {
  if (!['bootstrap', 'agent'].includes(phase)) {
    throw new Error('invalid proxy phase');
  }
  await validatePolicyPath(path, trustedOwnerUid, agentUid);
  const policy = parsePolicy(await readFile(path, 'utf8'));
  return policy[phase];
}

function requestAuthority(request) {
  const authority = parseAuthority(request.url);
  if (authority === null) {
    return null;
  }

  const hostHeaders = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index];
    const value = request.rawHeaders[index + 1];
    if (/\r|\n|\t/u.test(name) || /\r|\n|\t/u.test(value)) {
      return null;
    }
    if (name.toLowerCase() === 'host') {
      hostHeaders.push(value);
    }
  }
  if (hostHeaders.length !== 1) {
    return null;
  }
  const hostAuthority = parseAuthority(hostHeaders[0]);
  if (
    hostAuthority === null ||
    hostAuthority.hostname !== authority.hostname ||
    hostAuthority.port !== authority.port
  ) {
    return null;
  }
  return authority;
}

function readUint24(buffer, offset) {
  return buffer.readUIntBE(offset, 3);
}

function parseServerNameExtension(data) {
  if (data.length < 2 || data.readUInt16BE(0) !== data.length - 2) {
    return null;
  }
  const names = [];
  let offset = 2;
  while (offset < data.length) {
    if (offset + 3 > data.length) {
      return null;
    }
    const type = data[offset];
    const length = data.readUInt16BE(offset + 1);
    offset += 3;
    if (offset + length > data.length) {
      return null;
    }
    if (type === 0) {
      const encoded = data.subarray(offset, offset + length);
      if (encoded.length === 0 || encoded.some((byte) => byte > 0x7f)) {
        return null;
      }
      names.push(encoded.toString('ascii'));
    }
    offset += length;
  }
  return names.length === 1 ? normalizeHostname(names[0]) : null;
}

function parseClientHello(buffer, maximumBytes) {
  if (buffer.length > maximumBytes) {
    return { status: 'deny' };
  }
  if (buffer.length === 0) {
    return { status: 'wait' };
  }
  if (buffer[0] !== 0x16) {
    return { status: 'deny' };
  }
  if (buffer.length < 5) {
    return { status: 'wait' };
  }

  const recordLength = buffer.readUInt16BE(3);
  const recordEnd = 5 + recordLength;
  if (recordEnd > maximumBytes) {
    return { status: 'deny' };
  }
  if (buffer.length < recordEnd) {
    return { status: 'wait' };
  }

  const record = buffer.subarray(5, recordEnd);
  if (record.length < 4 || record[0] !== 1) {
    return { status: 'deny' };
  }
  const helloLength = readUint24(record, 1);
  if (helloLength + 4 !== record.length) {
    return { status: 'deny' };
  }

  let offset = 4;
  const canRead = (length) => offset + length <= record.length;
  if (!canRead(35)) {
    return { status: 'deny' };
  }
  offset += 34;
  const sessionLength = record[offset];
  offset += 1;
  if (!canRead(sessionLength + 2)) {
    return { status: 'deny' };
  }
  offset += sessionLength;
  const cipherLength = record.readUInt16BE(offset);
  offset += 2;
  if (cipherLength < 2 || cipherLength % 2 !== 0 || !canRead(cipherLength + 1)) {
    return { status: 'deny' };
  }
  offset += cipherLength;
  const compressionLength = record[offset];
  offset += 1;
  if (compressionLength < 1 || !canRead(compressionLength + 2)) {
    return { status: 'deny' };
  }
  offset += compressionLength;
  const extensionsLength = record.readUInt16BE(offset);
  offset += 2;
  if (offset + extensionsLength !== record.length) {
    return { status: 'deny' };
  }

  const extensionsEnd = offset + extensionsLength;
  let serverName = null;
  while (offset < extensionsEnd) {
    if (offset + 4 > extensionsEnd) {
      return { status: 'deny' };
    }
    const type = record.readUInt16BE(offset);
    const length = record.readUInt16BE(offset + 2);
    offset += 4;
    if (offset + length > extensionsEnd || type === 0xfe0d) {
      return { status: 'deny' };
    }
    if (type === 0) {
      if (serverName !== null) {
        return { status: 'deny' };
      }
      serverName = parseServerNameExtension(record.subarray(offset, offset + length));
      if (serverName === null) {
        return { status: 'deny' };
      }
    }
    offset += length;
  }

  return serverName === null
    ? { status: 'deny' }
    : { status: 'allow', hostname: serverName, bytes: buffer };
}

function readValidatedClientHello(socket, initialData, maximumBytes, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    let buffered = Buffer.from(initialData);
    while (buffered.length >= 2 && buffered[0] === 0x0d && buffered[1] === 0x0a) {
      buffered = buffered.subarray(2);
    }
    let settled = false;
    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('close', onClose);
      socket.off('error', onError);
      if (error === null) {
        resolvePromise(result);
      } else {
        rejectPromise(error);
      }
    };
    const evaluate = () => {
      const result = parseClientHello(buffered, maximumBytes);
      if (result.status === 'allow') {
        finish(null, result);
      } else if (result.status === 'deny') {
        finish(new Error('invalid TLS ClientHello'));
      }
    };
    const onData = (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      evaluate();
    };
    const onClose = () => finish(new Error('client closed before TLS ClientHello'));
    const onError = () => finish(new Error('client failed before TLS ClientHello'));
    const timer = setTimeout(() => finish(new Error('TLS ClientHello timed out')), timeoutMs);
    socket.on('data', onData);
    socket.on('close', onClose);
    socket.on('error', onError);
    socket.resume();
    evaluate();
  });
}

function deny(socket) {
  if (!socket.destroyed) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  }
}

async function handleConnect({
  request,
  client,
  initialData,
  allowedAuthorities,
  resolveHost,
  connectUpstream,
  maxClientHelloBytes,
  clientHelloTimeoutMs,
}) {
  const authority = requestAuthority(request);
  if (authority === null || !allowedAuthorities.has(`${authority.hostname}:${authority.port}`)) {
    deny(client);
    return;
  }

  client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  try {
    const hello = await readValidatedClientHello(
      client,
      initialData,
      maxClientHelloBytes,
      clientHelloTimeoutMs,
    );
    if (hello.hostname !== authority.hostname) {
      throw new Error('TLS SNI does not match CONNECT authority');
    }
    const addresses = await resolveHost(authority.hostname);
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('hostname did not resolve');
    }
    const upstream = await connectUpstream({ ...authority, addresses });
    upstream.on?.('error', () => client.destroy());
    client.on('error', () => upstream.destroy?.());
    upstream.write(hello.bytes);
    client.pipe(upstream).pipe(client);
  } catch {
    client.end();
  }
}

export async function createConnectProxy({
  allowlistPath,
  phase,
  trustedOwnerUid = 0,
  agentUid,
  resolveHost = async (hostname) =>
    (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address),
  connectUpstream = async ({ port, addresses }) =>
    await new Promise((resolvePromise, rejectPromise) => {
      const socket = createConnection({ host: addresses[0], port });
      socket.once('connect', () => resolvePromise(socket));
      socket.once('error', rejectPromise);
    }),
  maxClientHelloBytes = 16_384,
  clientHelloTimeoutMs = 2_000,
}) {
  if (!Number.isSafeInteger(agentUid) || agentUid < 0) {
    throw new Error('agent UID is required');
  }
  if (!Number.isSafeInteger(maxClientHelloBytes) || maxClientHelloBytes < 64) {
    throw new Error('invalid ClientHello byte limit');
  }
  if (!Number.isSafeInteger(clientHelloTimeoutMs) || clientHelloTimeoutMs < 1) {
    throw new Error('invalid ClientHello timeout');
  }

  const allowedAuthorities = await loadPolicy(allowlistPath, phase, trustedOwnerUid, agentUid);
  const server = createHttpServer();
  server.on('connect', (request, client, initialData) => {
    void handleConnect({
      request,
      client,
      initialData,
      allowedAuthorities,
      resolveHost,
      connectUpstream,
      maxClientHelloBytes,
      clientHelloTimeoutMs,
    });
  });
  server.on('clientError', (_error, socket) => deny(socket));
  return server;
}

export function parseCliArguments(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${HELP}\n`);
    return null;
  }
  if (argv[0] !== 'serve') {
    throw new Error(`usage: ${HELP}`);
  }
  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || values.has(flag)) {
      throw new Error(`usage: ${HELP}`);
    }
    values.set(flag, value);
  }
  if (
    ![...values.keys()].every((flag) =>
      ['--allowlist', '--phase', '--listen', '--agent-uid'].includes(flag),
    )
  ) {
    throw new Error(`usage: ${HELP}`);
  }
  if (values.size !== 4) {
    throw new Error(`usage: ${HELP}`);
  }
  const listenMatch = /^127\.0\.0\.1:(\d{1,5})$/u.exec(values.get('--listen'));
  const port = listenMatch === null ? Number.NaN : Number(listenMatch[1]);
  const agentUid = Number(values.get('--agent-uid'));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || !Number.isSafeInteger(agentUid)) {
    throw new Error(`usage: ${HELP}`);
  }
  return {
    allowlistPath: resolve(values.get('--allowlist')),
    phase: values.get('--phase'),
    host: '127.0.0.1',
    port,
    agentUid,
  };
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  if (options === null) {
    return;
  }
  const server = await createConnectProxy(options);
  server.listen(options.port, options.host);
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`proxy: ${error.message}\n`);
    process.exitCode = 1;
  });
}
