#!/usr/bin/env node
// Bounded streaming I/O for review-package.sh. Commands are captured without
// shell buffering, source files are copied through held descriptors, and a
// byte limit is enforced before another chunk reaches disk.
// @spec:018-project-integrity-hardening#S2
import { spawn } from 'node:child_process';
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  openSync,
  readSync,
  writeSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chunkBytes = 64 * 1024;
const noFollow = constants.O_NOFOLLOW ?? 0;
const closeOnExec = constants.O_CLOEXEC ?? 0;
const nonBlock = constants.O_NONBLOCK ?? 0;

function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function parseLimit(value) {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit <= 0) fail('byte limit must be a positive integer');
  return limit;
}

function writeAll(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset);
    if (written <= 0) fail('bounded output write made no progress');
    offset += written;
  }
}

function finalizeOutput(descriptor, expectedBytes) {
  fchmodSync(descriptor, 0o600);
  fsyncSync(descriptor);
  const information = fstatSync(descriptor);
  if (!information.isFile() || information.size !== expectedBytes) {
    fail('bounded output descriptor does not match the streamed byte count');
  }
  if ((information.mode & 0o777) !== 0o600) {
    fail('bounded output descriptor mode must be 0600');
  }
}

function openExclusiveOutput(path) {
  return openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow | closeOnExec,
    0o600,
  );
}

async function captureCommand({
  command,
  commandArguments,
  label,
  limit,
  mergeStderr,
  output,
  spawnProcess,
}) {
  const descriptor = openExclusiveOutput(output);
  let bytesWritten = 0;
  let exceeded = false;
  let streamingError = null;
  let child;
  try {
    child = spawnProcess(command, commandArguments, {
      stdio: ['ignore', 'pipe', mergeStderr ? 'pipe' : 'inherit'],
    });
    const consume = (chunk) => {
      if (exceeded || streamingError) return;
      try {
        if (bytesWritten + chunk.length > limit) {
          exceeded = true;
          child.kill('SIGKILL');
          return;
        }
        writeAll(descriptor, chunk);
        bytesWritten += chunk.length;
      } catch (error) {
        streamingError = error;
        child.kill('SIGKILL');
      }
    };
    child.stdout.on('data', consume);
    if (mergeStderr) child.stderr.on('data', consume);
    const { code, signal } = await new Promise((resolvePromise, rejectPromise) => {
      child.once('error', rejectPromise);
      child.once('close', (exitCode, exitSignal) => {
        resolvePromise({ code: exitCode, signal: exitSignal });
      });
    });
    if (streamingError) throw streamingError;
    if (exceeded) fail(`${label} exceeds its ${String(limit)}-byte streaming limit`);
    if (signal) fail(`${label} command terminated by signal ${signal}`);
    if (code !== 0) {
      const preservedCode = Number.isInteger(code) && code > 0 && code < 256 ? code : 1;
      fail(`${label} command failed with exit ${String(code)}`, preservedCode);
    }
    finalizeOutput(descriptor, bytesWritten);
  } finally {
    closeSync(descriptor);
  }
}

function copyFileBounded({ label, limit, output, source }) {
  let sourceDescriptor;
  try {
    sourceDescriptor = openSync(source, constants.O_RDONLY | noFollow | closeOnExec | nonBlock);
  } catch (error) {
    if (['ELOOP', 'EMLINK'].includes(error.code)) {
      fail(`${label} source must be a regular file, not a symbolic link`);
    }
    throw error;
  }
  let outputDescriptor;
  let bytesWritten = 0;
  try {
    const openedSource = fstatSync(sourceDescriptor);
    if (!openedSource.isFile()) {
      fail(`${label} source must be a regular file, not a symbolic link`);
    }
    if (openedSource.size > limit) fail(`${label} exceeds its streaming byte limit`);
    outputDescriptor = openExclusiveOutput(output);
    const buffer = Buffer.allocUnsafe(chunkBytes);
    while (true) {
      const bytesRead = readSync(sourceDescriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      if (bytesWritten + bytesRead > limit) fail(`${label} exceeds its streaming byte limit`);
      writeAll(outputDescriptor, buffer.subarray(0, bytesRead));
      bytesWritten += bytesRead;
    }
    const finalSource = fstatSync(sourceDescriptor);
    if (
      finalSource.dev !== openedSource.dev ||
      finalSource.ino !== openedSource.ino ||
      finalSource.size !== bytesWritten
    ) {
      fail(`${label} source changed during streaming copy`);
    }
    finalizeOutput(outputDescriptor, bytesWritten);
  } finally {
    if (outputDescriptor !== undefined) closeSync(outputDescriptor);
    closeSync(sourceDescriptor);
  }
}

export async function runReviewPackageIo({
  arguments_ = process.argv.slice(2),
  spawnProcess = spawn,
} = {}) {
  const [operation, limitValue, label, output, ...remaining] = arguments_;
  const limit = parseLimit(limitValue);
  if (operation === 'capture') {
    const [stderrMode, command, ...commandArguments] = remaining;
    if (!output || !label || !command || !['inherit', 'merge'].includes(stderrMode)) {
      fail(
        'usage: review-package-io.mjs capture <limit> <label> <output> <inherit|merge> <command> [args...]',
      );
    }
    await captureCommand({
      command,
      commandArguments,
      label,
      limit,
      mergeStderr: stderrMode === 'merge',
      output,
      spawnProcess,
    });
    return;
  }
  if (operation === 'copy') {
    const [source] = remaining;
    if (!output || !label || !source) {
      fail('usage: review-package-io.mjs copy <limit> <label> <output> <source>');
    }
    copyFileBounded({ label, limit, output, source });
    return;
  }
  fail('review-package-io operation must be capture or copy');
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runReviewPackageIo().catch((error) => {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = error.exitCode ?? 1;
  });
}
