// @spec:018-project-integrity-hardening#S2
import { createHash } from 'node:crypto';
import {
  appendFile,
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it, onTestFinished } from 'vitest';

import {
  publishReviewPacket,
  runPublishReviewPacket,
  writeReviewPacketManifest,
} from '../lib/publish-review-packet.mjs';

const baseSha = '1'.repeat(40);
const headSha = '2'.repeat(40);

async function temporaryDirectory() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-review-publish-mutation-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

function publishInProcess(source, destination, options = {}) {
  let activeUmask = 0o022;
  return publishReviewPacket(source, destination, {
    ...options,
    setUmask: (value) => {
      const previous = activeUmask;
      activeUmask = value;
      return previous;
    },
  });
}

async function barrierOptions(root, phase, action = async () => undefined, entryPath) {
  const barrierDirectory = join(root, `barrier-${phase}`);
  await mkdir(barrierDirectory);
  let released = false;
  return {
    environment: {
      KIMEN_REVIEW_PACKET_TEST_BARRIER_DIR: barrierDirectory,
      KIMEN_REVIEW_PACKET_TEST_BARRIER_PHASE: phase,
      KIMEN_REVIEW_PACKET_TEST_ENTRY_PATH: entryPath,
      KIMEN_REVIEW_PACKET_TEST_MODE: '1',
    },
    now: () => 0,
    wait: async () => {
      if (released) return;
      released = true;
      await action();
      await writeFile(join(barrierDirectory, `${phase}.continue`), 'continue\n');
    },
  };
}

it('publishes an exact nested packet with private directories and file modes', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(join(source, 'nested'), { recursive: true });
  await chmod(join(source, 'nested'), 0o755);
  await writeFile(join(source, 'MANIFEST.md'), 'manifest\n', { mode: 0o600 });
  await writeFile(join(source, 'nested', 'evidence.txt'), 'evidence\n', { mode: 0o640 });
  await chmod(join(source, 'nested', 'evidence.txt'), 0o640);
  let activeUmask = 0o022;
  const setUmask = (value) => {
    const previous = activeUmask;
    activeUmask = value;
    return previous;
  };

  await publishReviewPacket(source, destination, { setUmask });

  expect(await readFile(join(destination, 'MANIFEST.md'), 'utf8')).toBe('manifest\n');
  expect(await readFile(join(destination, 'nested', 'evidence.txt'), 'utf8')).toBe('evidence\n');
  expect((await lstat(destination)).mode & 0o777).toBe(0o700);
  expect((await lstat(join(destination, 'nested'))).mode & 0o777).toBe(0o700);
  expect((await lstat(join(destination, 'MANIFEST.md'))).mode & 0o777).toBe(0o600);
  expect((await lstat(join(destination, 'nested', 'evidence.txt'))).mode & 0o777).toBe(0o640);
  expect(activeUmask).toBe(0o022);
});

it('writes a canonical manifest that hashes every other packet file and survives exact publication', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  const payload = Buffer.from('payload\n', 'utf8');
  await writeFile(join(source, 'payload.txt'), payload);

  const digest = writeReviewPacketManifest(source, baseSha, headSha);
  const manifestBytes = await readFile(join(source, 'packet-manifest.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));

  expect(manifestBytes.toString('utf8')).toBe(`${JSON.stringify(manifest)}\n`);
  expect(digest).toBe(createHash('sha256').update(manifestBytes).digest('hex'));
  expect(manifest).toEqual({
    schemaVersion: 1,
    baseSha,
    headSha,
    files: [
      {
        path: 'payload.txt',
        size: payload.length,
        sha256: createHash('sha256').update(payload).digest('hex'),
      },
    ],
  });
  expect((await lstat(join(source, 'packet-manifest.json'))).mode & 0o777).toBe(0o600);

  await publishInProcess(source, destination);

  expect(await readFile(join(destination, 'packet-manifest.json'))).toEqual(manifestBytes);
  expect(await readFile(join(destination, 'payload.txt'))).toEqual(payload);
});

it('rejects a prepared packet whose bytes no longer match its canonical manifest', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'reviewed bytes\n');
  writeReviewPacketManifest(source, baseSha, headSha);
  await writeFile(join(source, 'payload.txt'), 'different bytes\n');

  await expect(publishInProcess(source, destination)).rejects.toThrowError(
    /packet manifest.*prepared packet inventory/u,
  );
  await expect(lstat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('never replaces an existing packet manifest', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  writeReviewPacketManifest(source, baseSha, headSha);

  expect(() => writeReviewPacketManifest(source, baseSha, headSha)).toThrowError(
    /packet manifest already exists/u,
  );
});

it('refuses an existing destination without changing its bytes', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await mkdir(destination);
  await writeFile(join(source, 'payload.txt'), 'replacement\n');
  await writeFile(join(destination, 'sentinel.txt'), 'preserve\n');

  await expect(publishInProcess(source, destination)).rejects.toThrowError(
    /already exists.*no-clobber/u,
  );
  expect(await readFile(join(destination, 'sentinel.txt'), 'utf8')).toBe('preserve\n');
});

it('rejects a symbolic link in the prepared source before reserving a destination', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const external = join(root, 'external.txt');
  await mkdir(source);
  await writeFile(external, 'external\n');
  await symlink(external, join(source, 'linked.txt'));

  await expect(publishInProcess(source, destination)).rejects.toThrowError(/symbolic link/u);
  await expect(lstat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await readFile(external, 'utf8')).toBe('external\n');
});

it('rejects a symbolic-link packet source root', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const linkedSource = join(root, 'prepared-link');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  await symlink(source, linkedSource);

  await expect(publishInProcess(linkedSource, destination)).rejects.toThrowError(
    /regular directory, not a symbolic link/u,
  );
  await expect(lstat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('does not follow or replace an existing destination symlink', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const external = join(root, 'external');
  await mkdir(source);
  await mkdir(external);
  await writeFile(join(source, 'payload.txt'), 'replacement\n');
  await writeFile(join(external, 'sentinel.txt'), 'preserve\n');
  await symlink(external, destination);

  await expect(publishInProcess(source, destination)).rejects.toThrowError(
    /already exists.*no-clobber/u,
  );
  expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('preserve\n');
  expect((await lstat(destination)).isSymbolicLink()).toBe(true);
});

it('rejects a sparse source file above the 32 MiB per-file limit', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const sparse = join(source, 'sparse.bin');
  await mkdir(source);
  await writeFile(sparse, Buffer.alloc(0));
  await truncate(sparse, 32 * 1024 * 1024 + 1);

  await expect(publishInProcess(source, destination)).rejects.toThrowError(
    /32 MiB per-file limit/u,
  );
  await expect(lstat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('executes an isolated publication barrier without process environment mutation', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  const options = await barrierOptions(root, 'after-reserve');

  await publishInProcess(source, destination, options);

  expect(await readFile(join(root, 'barrier-after-reserve', 'after-reserve.ready'), 'utf8')).toBe(
    'ready\n',
  );
  expect(await readFile(join(destination, 'payload.txt'), 'utf8')).toBe('payload\n');
});

it('rejects an extra destination entry injected before final inventory', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  const options = await barrierOptions(root, 'before-inventory', async () => {
    await writeFile(join(destination, 'unexpected.txt'), 'unexpected\n');
  });

  await expect(publishInProcess(source, destination, options)).rejects.toThrowError(
    /unexpected extra entry/u,
  );
  expect(await readFile(join(destination, 'unexpected.txt'), 'utf8')).toBe('unexpected\n');
});

it('rejects source growth between inventory and held-descriptor publication', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const sourceFile = join(source, 'payload.txt');
  const destination = join(root, 'review-packet');
  await mkdir(source);
  await writeFile(sourceFile, 'payload\n');
  const options = await barrierOptions(
    root,
    'before-source-file-open',
    async () => appendFile(sourceFile, 'growth\n'),
    'payload.txt',
  );

  await expect(publishInProcess(source, destination, options)).rejects.toThrowError(
    /source file changed before publication/u,
  );
  expect(await readFile(sourceFile, 'utf8')).toBe('payload\ngrowth\n');
});

it('never clobbers a destination entry injected before exclusive creation', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const destinationFile = join(destination, 'payload.txt');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'replacement\n');
  const options = await barrierOptions(
    root,
    'before-entry-create',
    async () => writeFile(destinationFile, 'preserve\n'),
    'payload.txt',
  );

  await expect(publishInProcess(source, destination, options)).rejects.toMatchObject({
    code: 'EEXIST',
  });
  expect(await readFile(destinationFile, 'utf8')).toBe('preserve\n');
});

it('never accepts a created destination file replaced before descriptor finalization', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const destinationFile = join(destination, 'payload.txt');
  const displaced = join(root, 'displaced.txt');
  const external = join(root, 'external.txt');
  await mkdir(source);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  await writeFile(external, 'external\n');
  const options = await barrierOptions(
    root,
    'after-file-create-before-finalize',
    async () => {
      await rename(destinationFile, displaced);
      await symlink(external, destinationFile);
    },
    'payload.txt',
  );

  await expect(publishInProcess(source, destination, options)).rejects.toThrowError(
    /symbolic link/u,
  );
  expect(await readFile(external, 'utf8')).toBe('external\n');
  expect(await readFile(displaced, 'utf8')).toBe('payload\n');
});

it('fails a publication barrier at its injected absolute deadline', async () => {
  const root = await temporaryDirectory();
  const source = join(root, 'prepared');
  const destination = join(root, 'review-packet');
  const barrierDirectory = join(root, 'barrier-timeout');
  await mkdir(source);
  await mkdir(barrierDirectory);
  await writeFile(join(source, 'payload.txt'), 'payload\n');
  const times = [0, 10_001];

  await expect(
    publishInProcess(source, destination, {
      environment: {
        KIMEN_REVIEW_PACKET_TEST_BARRIER_DIR: barrierDirectory,
        KIMEN_REVIEW_PACKET_TEST_BARRIER_PHASE: 'after-reserve',
        KIMEN_REVIEW_PACKET_TEST_MODE: '1',
      },
      now: () => times.shift() ?? 10_001,
      wait: async () => undefined,
    }),
  ).rejects.toThrowError(/test barrier timed out at after-reserve/u);
});

it('exposes the CLI publication boundary for deterministic in-process use', async () => {
  const calls = [];
  const exitCodes = [];
  const stderr = [];

  const result = await runPublishReviewPacket({
    arguments_: ['/prepared', '/packet'],
    publishImpl: async (...arguments_) => calls.push(arguments_),
    setExitCode: (value) => exitCodes.push(value),
    stderr: { write: (value) => stderr.push(value) },
  });

  expect(result).toBe(true);
  expect(calls).toEqual([['/prepared', '/packet']]);
  expect(exitCodes).toEqual([]);
  expect(stderr).toEqual([]);
});

it('exposes the canonical manifest CLI boundary without publishing', async () => {
  const calls = [];
  const exitCodes = [];
  const stderr = [];
  const stdout = [];

  const result = await runPublishReviewPacket({
    arguments_: ['manifest', '/prepared', baseSha, headSha],
    manifestImpl: (...arguments_) => {
      calls.push(arguments_);
      return 'a'.repeat(64);
    },
    publishImpl: async () => {
      throw new Error('manifest mode must not publish');
    },
    setExitCode: (value) => exitCodes.push(value),
    stderr: { write: (value) => stderr.push(value) },
    stdout: { write: (value) => stdout.push(value) },
  });

  expect(result).toBe(true);
  expect(calls).toEqual([['/prepared', baseSha, headSha]]);
  expect(exitCodes).toEqual([]);
  expect(stderr).toEqual([]);
  expect(stdout).toEqual([`${'a'.repeat(64)}\n`]);
});

it('fails manifest CLI usage and generation without falling through to publication', async () => {
  const usageExitCodes = [];
  const usageStderr = [];
  const generationExitCodes = [];
  const generationStderr = [];

  const usageResult = await runPublishReviewPacket({
    arguments_: ['manifest', '/prepared', baseSha],
    setExitCode: (value) => usageExitCodes.push(value),
    stderr: { write: (value) => usageStderr.push(value) },
  });
  const generationResult = await runPublishReviewPacket({
    arguments_: ['manifest', '/prepared', baseSha, headSha],
    manifestImpl: () => {
      throw new Error('fixture manifest failure');
    },
    setExitCode: (value) => generationExitCodes.push(value),
    stderr: { write: (value) => generationStderr.push(value) },
  });

  expect(usageResult).toBe(false);
  expect(usageExitCodes).toEqual([1]);
  expect(usageStderr).toEqual([
    'ERROR: usage: publish-review-packet.mjs manifest <source-dir> <base-sha> <head-sha>\n',
  ]);
  expect(generationResult).toBe(false);
  expect(generationExitCodes).toEqual([1]);
  expect(generationStderr).toEqual(['ERROR: review packet manifest fixture manifest failure\n']);
});

it('keeps the exact CLI usage failure contract in-process', async () => {
  const exitCodes = [];
  const stderr = [];

  const result = await runPublishReviewPacket({
    arguments_: ['/prepared'],
    setExitCode: (value) => exitCodes.push(value),
    stderr: { write: (value) => stderr.push(value) },
  });

  expect(result).toBe(false);
  expect(exitCodes).toEqual([1]);
  expect(stderr).toEqual(['ERROR: usage: publish-review-packet.mjs <source-dir> <PACKET_DIR>\n']);
});

it('keeps the exact CLI publication error contract in-process', async () => {
  const exitCodes = [];
  const stderr = [];

  const result = await runPublishReviewPacket({
    arguments_: ['/prepared', '/packet'],
    publishImpl: async () => {
      throw new Error('fixture failure');
    },
    setExitCode: (value) => exitCodes.push(value),
    stderr: { write: (value) => stderr.push(value) },
  });

  expect(result).toBe(false);
  expect(exitCodes).toEqual([1]);
  expect(stderr).toEqual(['ERROR: review packet publication fixture failure\n']);
});
