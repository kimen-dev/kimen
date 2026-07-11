// @spec:018-project-integrity-hardening#S2
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { setImmediate } from 'node:timers';

import { expect, it, onTestFinished } from 'vitest';

import { runReviewPackageIo } from '../lib/review-package-io.mjs';

async function temporaryDirectory() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-review-io-mutation-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

function controlledSpawn({ code = 0, error, signal = null, stderr = [], stdout = [] } = {}) {
  const calls = [];
  const kills = [];
  const spawnProcess = (...arguments_) => {
    calls.push(arguments_);
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = (value) => kills.push(value);
    setImmediate(() => {
      if (error) {
        child.emit('error', error);
        return;
      }
      for (const chunk of stdout) child.stdout.emit('data', chunk);
      for (const chunk of stderr) child.stderr.emit('data', chunk);
      child.emit('close', code, signal);
    });
    return child;
  };
  return { calls, kills, spawnProcess };
}

it('copies a bounded regular file exclusively and finalizes it as 0600', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'source.txt');
  const output = join(root, 'output.txt');
  await writeFile(source, 'bounded payload\n');

  await runReviewPackageIo({
    arguments_: ['copy', '1024', 'fixture copy', output, source],
  });

  expect(await readFile(output, 'utf8')).toBe('bounded payload\n');
  expect((await lstat(output)).mode & 0o777).toBe(0o600);
});

it('rejects symbolic-link sources before creating an output', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'source.txt');
  const linkedSource = join(root, 'source-link.txt');
  const output = join(root, 'output.txt');
  await writeFile(source, 'external bytes\n');
  await symlink(source, linkedSource);

  await expect(
    runReviewPackageIo({
      arguments_: ['copy', '1024', 'fixture copy', output, linkedSource],
    }),
  ).rejects.toThrowError(/regular file, not a symbolic link/u);
  await expect(lstat(output)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('never clobbers an existing bounded output', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'source.txt');
  const output = join(root, 'output.txt');
  await writeFile(source, 'replacement bytes\n');
  await writeFile(output, 'preserve bytes\n', { mode: 0o600 });

  await expect(
    runReviewPackageIo({
      arguments_: ['copy', '1024', 'fixture copy', output, source],
    }),
  ).rejects.toMatchObject({ code: 'EEXIST' });
  expect(await readFile(output, 'utf8')).toBe('preserve bytes\n');
});

it('rejects a copy above its byte limit without creating an output', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'source.txt');
  const output = join(root, 'output.txt');
  await writeFile(source, '12345');

  await expect(
    runReviewPackageIo({
      arguments_: ['copy', '4', 'fixture copy', output, source],
    }),
  ).rejects.toThrowError(/fixture copy exceeds its streaming byte limit/u);
  await expect(lstat(output)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('captures a real process through the injected spawn boundary', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const calls = [];

  await runReviewPackageIo({
    arguments_: [
      'capture',
      '1024',
      'fixture command',
      output,
      'inherit',
      process.execPath,
      '-e',
      "process.stdout.write('captured bytes\\n')",
    ],
    spawnProcess: (...arguments_) => {
      calls.push(arguments_);
      return spawn(...arguments_);
    },
  });

  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toBe(process.execPath);
  expect(calls[0][1]).toEqual(['-e', "process.stdout.write('captured bytes\\n')"]);
  expect(calls[0][2]).toEqual({ stdio: ['ignore', 'pipe', 'inherit'] });
  expect(await readFile(output, 'utf8')).toBe('captured bytes\n');
  expect((await lstat(output)).mode & 0o777).toBe(0o600);
});

it('merges a real command stderr into the bounded output', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');

  await runReviewPackageIo({
    arguments_: [
      'capture',
      '1024',
      'fixture command',
      output,
      'merge',
      process.execPath,
      '-e',
      "process.stderr.write('merged stderr\\n')",
    ],
  });

  expect(await readFile(output, 'utf8')).toBe('merged stderr\n');
});

it('kills and rejects a command that exceeds its streaming limit', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');

  await expect(
    runReviewPackageIo({
      arguments_: [
        'capture',
        '4',
        'fixture command',
        output,
        'inherit',
        process.execPath,
        '-e',
        "process.stdout.write('12345')",
      ],
    }),
  ).rejects.toThrowError(/fixture command exceeds its 4-byte streaming limit/u);
});

it('accepts a captured chunk exactly equal to the streaming limit', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const controlled = controlledSpawn({ stdout: [Buffer.from('1234')] });

  await runReviewPackageIo({
    arguments_: ['capture', '4', 'fixture command', output, 'inherit', 'fixture'],
    spawnProcess: controlled.spawnProcess,
  });

  expect(await readFile(output, 'utf8')).toBe('1234');
  expect(controlled.kills).toEqual([]);
});

it('rejects a child process signal and names it', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const controlled = controlledSpawn({ code: null, signal: 'SIGTERM' });

  await expect(
    runReviewPackageIo({
      arguments_: ['capture', '4', 'fixture command', output, 'inherit', 'fixture'],
      spawnProcess: controlled.spawnProcess,
    }),
  ).rejects.toThrowError(/fixture command command terminated by signal SIGTERM/u);
});

it('propagates a child spawn error from the event boundary', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const failure = new Error('fixture spawn failure');
  const controlled = controlledSpawn({ error: failure });

  await expect(
    runReviewPackageIo({
      arguments_: ['capture', '4', 'fixture command', output, 'inherit', 'fixture'],
      spawnProcess: controlled.spawnProcess,
    }),
  ).rejects.toBe(failure);
});

it('kills the child and propagates an output streaming error', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const controlled = controlledSpawn({ stdout: [{ length: 1 }] });

  await expect(
    runReviewPackageIo({
      arguments_: ['capture', '4', 'fixture command', output, 'inherit', 'fixture'],
      spawnProcess: controlled.spawnProcess,
    }),
  ).rejects.toBeInstanceOf(TypeError);
  expect(controlled.kills).toEqual(['SIGKILL']);
});

it.each([null, -1, 256])('normalizes invalid command exit code %s to one', async (code) => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');
  const controlled = controlledSpawn({ code });

  let failure;
  try {
    await runReviewPackageIo({
      arguments_: ['capture', '4', 'fixture command', output, 'inherit', 'fixture'],
      spawnProcess: controlled.spawnProcess,
    });
  } catch (error) {
    failure = error;
  }

  expect(failure).toMatchObject({ exitCode: 1 });
  expect(failure.message).toContain(`exit ${String(code)}`);
});

it('preserves a real command failure exit code', async () => {
  const root = await temporaryDirectory();
  const output = join(root, 'captured.txt');

  let failure;
  try {
    await runReviewPackageIo({
      arguments_: [
        'capture',
        '1024',
        'fixture command',
        output,
        'inherit',
        process.execPath,
        '-e',
        'process.exit(7)',
      ],
    });
  } catch (error) {
    failure = error;
  }

  expect(failure).toMatchObject({ exitCode: 7 });
  expect(failure.message).toMatch(/fixture command.*exit 7/u);
});

it.each([
  [[], /byte limit must be a positive integer/u],
  [['copy', '0', 'label', 'output', 'source'], /positive integer/u],
  [['copy', '1', 'label', 'output'], /usage.*copy/u],
  [['capture', '1', 'label', 'output', 'invalid', 'node'], /usage.*capture/u],
  [['unknown', '1', 'label', 'output'], /operation must be capture or copy/u],
])('rejects malformed in-process arguments %#', async (arguments_, diagnostic) => {
  await expect(runReviewPackageIo({ arguments_ })).rejects.toThrowError(diagnostic);
});
