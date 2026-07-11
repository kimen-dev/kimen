#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S13
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readlink, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  evaluateCapabilityEvidence,
  renderCapabilityBlocks,
  validateCapabilityBlocks,
  validateCapabilityManifest,
} from '../lib/capability-claims.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultManifest = join(repositoryRoot, 'docs/capabilities.json');
const requiredDestinationPaths = Object.freeze([
  'README.md',
  'docs/roadmap.md',
  'packages/catalog/README.md',
  'packages/catalog/package.json',
  'packages/elements/docs/introduction.mdx',
  'packages/kimen/README.md',
  'packages/kimen/package.json',
  'site/index.html',
]);

function fail(message) {
  throw new Error(`check-capabilities: ${message}`);
}

function runGit(arguments_, { binary = false, root = repositoryRoot } = {}) {
  const result = spawnSync('git', arguments_, {
    cwd: root,
    encoding: binary ? null : 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`${result.stderr?.toString().trim() || `git ${arguments_.join(' ')} failed`}`);
  }
  return result.stdout;
}

export function parseCapabilityArguments(argv, environment = process.env) {
  const options = {
    evidence: environment.KIMEN_CAPABILITY_EVIDENCE_FILE
      ? resolve(environment.KIMEN_CAPABILITY_EVIDENCE_FILE)
      : null,
    gateEvidence: environment.KIMEN_GATE_EVIDENCE_FILE
      ? resolve(environment.KIMEN_GATE_EVIDENCE_FILE)
      : null,
    generate: false,
    manifest: defaultManifest,
    staticOnly: false,
    writeEvidence: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--generate') {
      options.generate = true;
      continue;
    }
    if (flag === '--static-only') {
      options.staticOnly = true;
      continue;
    }
    if (!['--manifest', '--evidence', '--gate-evidence', '--write-evidence'].includes(flag)) {
      fail(`unknown argument ${flag}`);
    }
    const value = argv[index + 1];
    if (!value) {
      fail(`${flag} requires a path`);
    }
    index += 1;
    const key =
      flag === '--gate-evidence'
        ? 'gateEvidence'
        : flag === '--write-evidence'
          ? 'writeEvidence'
          : flag.slice(2);
    options[key] = resolve(value);
  }
  if (options.generate && (options.writeEvidence || options.evidence)) {
    fail('--generate cannot consume or write current-run evidence');
  }
  if (options.writeEvidence && !options.gateEvidence) {
    fail('--write-evidence requires --gate-evidence or KIMEN_GATE_EVIDENCE_FILE');
  }
  return options;
}

function literalGateIds(source) {
  const ids = [];
  for (const match of source.matchAll(/^\s*(?:run_core_gate|run_gate)\s+([a-z0-9-]+)\b/gmu)) {
    ids.push(match[1]);
  }
  return ids;
}

export async function discoverMandatoryEvidenceIds(root = repositoryRoot) {
  const sources = await Promise.all(
    ['scripts/gates/gates-core.sh', 'scripts/gates/gates-suite.sh'].map((path) =>
      readFile(join(root, path), 'utf8'),
    ),
  );
  const ids = [...new Set(sources.flatMap(literalGateIds))].sort((left, right) =>
    left.localeCompare(right),
  );
  if (ids.length === 0) {
    fail('no mandatory gates were discovered from the gate wrappers');
  }
  return ids;
}

function markerPair(destinationId) {
  return {
    start: `<!-- kimen:capabilities:${destinationId}:start -->`,
    end: `<!-- kimen:capabilities:${destinationId}:end -->`,
  };
}

export function extractTextBlock(source, destinationId) {
  const { start, end } = markerPair(destinationId);
  const startMarkerIndex = source.indexOf(start);
  if (startMarkerIndex === -1) {
    return null;
  }
  if (source.indexOf(start, startMarkerIndex + start.length) !== -1) {
    fail(`${destinationId} has duplicate generated block start markers`);
  }
  const endMarkerIndex = source.indexOf(end, startMarkerIndex + start.length);
  if (endMarkerIndex === -1 || source.indexOf(end, endMarkerIndex + end.length) !== -1) {
    fail(`${destinationId} has missing or duplicate generated block end markers`);
  }
  const startIndex = source.lastIndexOf('\n', startMarkerIndex - 1) + 1;
  let endIndex = endMarkerIndex + end.length;
  if (source.slice(endIndex, endIndex + 2) === '\r\n') {
    endIndex += 2;
  } else if (source[endIndex] === '\n') {
    endIndex += 1;
  }
  return { startIndex, endIndex, text: source.slice(startIndex, endIndex) };
}

async function safeDestinationPath(root, relativePath, { allowMissing }) {
  const rootPhysical = await realpath(root);
  const path = join(root, relativePath);
  const parentPhysical = await realpath(dirname(path)).catch(() => null);
  if (
    parentPhysical === null ||
    (parentPhysical !== rootPhysical && !parentPhysical.startsWith(`${rootPhysical}${sep}`))
  ) {
    fail(`${relativePath} destination parent escapes the repository root`);
  }
  const information = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  });
  if (information === null) {
    if (!allowMissing) {
      fail(`missing destination file ${relativePath}`);
    }
    return path;
  }
  if (information.isSymbolicLink()) {
    fail(`${relativePath} destination must not be a symbolic link`);
  }
  if (!information.isFile()) {
    fail(`${relativePath} destination must be a regular file`);
  }
  return path;
}

export async function readCapabilityBlocks(manifest, root = repositoryRoot) {
  const blocks = {};
  for (const destination of manifest.destinations) {
    const path = await safeDestinationPath(root, destination.path, { allowMissing: true });
    const source = await readFile(path, 'utf8').catch(() => null);
    if (source === null) {
      continue;
    }
    if (destination.path.endsWith('.json')) {
      const parsed = JSON.parse(source);
      if (parsed.kimenCapabilities !== undefined) {
        blocks[destination.id] = `${JSON.stringify(parsed.kimenCapabilities, null, 2)}\n`;
      }
      continue;
    }
    const block = extractTextBlock(source, destination.id);
    if (block !== null) {
      blocks[destination.id] = block.text;
    }
  }
  return blocks;
}

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.capabilities-${String(process.pid)}.tmp`;
  await writeFile(temporary, contents, 'utf8');
  await rename(temporary, path);
}

export function replaceCapabilityBlock(source, destination, block) {
  const existing = extractTextBlock(source, destination.id);
  if (existing !== null) {
    let before = source.slice(0, existing.startIndex);
    let after = source.slice(existing.endIndex);
    if (destination.path.endsWith('.html')) {
      before = before.replace(/[ \t]+\n$/u, '');
      after = after.replace(/^<\/main>/u, '    </main>');
    }
    return `${before}${block}${after}`;
  }
  if (destination.path.endsWith('.html')) {
    const closingTagIndex = source.lastIndexOf('</main>');
    if (closingTagIndex === -1) {
      fail(`${destination.path} has no </main> insertion point`);
    }
    const insertion = source.lastIndexOf('\n', closingTagIndex - 1) + 1;
    return `${source.slice(0, insertion)}${block}${source.slice(insertion)}`;
  }
  const prefix = source === '' ? '' : source.endsWith('\n\n') ? source : `${source.trimEnd()}\n\n`;
  return `${prefix}${block}`;
}

export async function generateCapabilityBlocks(manifest, root = repositoryRoot) {
  const blocks = renderCapabilityBlocks(manifest);
  for (const destination of manifest.destinations) {
    const path = await safeDestinationPath(root, destination.path, {
      allowMissing: destination.path === 'packages/catalog/README.md',
    });
    const block = blocks[destination.id];
    if (destination.path.endsWith('.json')) {
      const source = await readFile(path, 'utf8');
      const parsed = JSON.parse(source);
      parsed.kimenCapabilities = JSON.parse(block);
      await writeAtomic(path, `${JSON.stringify(parsed, null, 2)}\n`);
      continue;
    }
    let source = await readFile(path, 'utf8').catch(() => null);
    if (source === null) {
      if (destination.path !== 'packages/catalog/README.md') {
        fail(`missing destination file ${destination.path}`);
      }
      source = '# @kimen/catalog\n\n';
    }
    await writeAtomic(path, replaceCapabilityBlock(source, destination, block));
  }
}

async function hashUntrackedFile(hash, path, root) {
  const absolute = join(root, path);
  const information = await lstat(absolute);
  hash.update('untracked\0');
  hash.update(path);
  hash.update('\0');
  if (information.isSymbolicLink()) {
    hash.update('symlink\0');
    hash.update(await readlink(absolute));
  } else if (information.isFile()) {
    hash.update('file\0');
    hash.update(await readFile(absolute));
  } else {
    fail(`unsupported untracked worktree entry ${path}`);
  }
  hash.update('\0');
}

export async function currentRevision(root = repositoryRoot) {
  const sha = runGit(['rev-parse', 'HEAD'], { root }).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    fail('Git HEAD is not a full 40-character SHA');
  }
  const diff = runGit(['diff', '--binary', '--full-index', 'HEAD', '--', '.'], {
    binary: true,
    root,
  });
  const rawUntracked = runGit(['ls-files', '--others', '--exclude-standard', '-z'], {
    binary: true,
    root,
  });
  const untracked = rawUntracked
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (diff.length === 0 && untracked.length === 0) {
    return { sha, worktreeDigest: null };
  }
  const hash = createHash('sha256');
  hash.update('kimen-worktree-v1\0');
  hash.update(diff);
  for (const path of untracked) {
    await hashUntrackedFile(hash, path, root);
  }
  return { sha, worktreeDigest: hash.digest('hex') };
}

export function parseGateEvidence(source, mandatoryEvidenceIds) {
  const mandatory = new Set(mandatoryEvidenceIds);
  const gates = new Map();
  for (const [index, line] of source.split('\n').entries()) {
    if (line === '') {
      continue;
    }
    const fields = line.split('\t');
    if (fields.length !== 3 || fields.some((field) => field === '')) {
      fail(`malformed current-run gate evidence at line ${String(index + 1)}`);
    }
    const [, id, status] = fields;
    if (!mandatory.has(id)) {
      continue;
    }
    if (gates.has(id) && gates.get(id) !== status) {
      fail(`${id} has conflicting current-run gate statuses`);
    }
    gates.set(id, status);
  }
  return [...gates]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, status]) => ({ id, status }));
}

async function writeEvidenceRecord(
  path,
  gateEvidencePath,
  mandatoryEvidenceIds,
  root = repositoryRoot,
) {
  const source = await readFile(gateEvidencePath, 'utf8');
  const record = {
    schemaVersion: 1,
    revision: await currentRevision(root),
    gates: parseGateEvidence(source, mandatoryEvidenceIds),
  };
  await writeAtomic(path, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export async function checkCapabilities({
  arguments_ = [],
  environment = process.env,
  root = repositoryRoot,
  stdout = process.stdout,
} = {}) {
  const options = parseCapabilityArguments(arguments_, environment);
  const manifest = JSON.parse(await readFile(options.manifest, 'utf8'));
  const mandatoryEvidenceIds = await discoverMandatoryEvidenceIds(root);
  validateCapabilityManifest(manifest, {
    mandatoryEvidenceIds,
    requiredDestinationPaths,
  });

  if (options.generate) {
    await generateCapabilityBlocks(manifest, root);
  }
  const blocks = await readCapabilityBlocks(manifest, root);
  validateCapabilityBlocks({ manifest, blocks });
  if (options.generate || options.staticOnly) {
    stdout.write(
      `capability claims: ${String(manifest.capabilities.length)} claims, ${String(manifest.destinations.length)} synchronized destinations\n`,
    );
    return;
  }

  let evidenceRecord;
  if (options.writeEvidence) {
    evidenceRecord = await writeEvidenceRecord(
      options.writeEvidence,
      options.gateEvidence,
      mandatoryEvidenceIds,
      root,
    );
    options.evidence = options.writeEvidence;
  } else {
    if (!options.evidence) {
      fail('current-run evidence is required; pass --evidence or --write-evidence');
    }
    evidenceRecord = JSON.parse(await readFile(options.evidence, 'utf8'));
  }
  const result = evaluateCapabilityEvidence({
    manifest,
    evidenceRecord,
    currentRevision: await currentRevision(root),
    mandatoryEvidenceIds,
  });
  stdout.write(
    `capability claims: PASS (${result.availableCapabilityIds.join(', ') || 'none available'})\n`,
  );
}

async function main() {
  await checkCapabilities({ arguments_: process.argv.slice(2) });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
