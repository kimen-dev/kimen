#!/usr/bin/env node
// @spec:019-agent-skills-canonical
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, readlink, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentSkillTopology, validateAgentSkillFacts } from '../lib/agent-skill-catalog.mjs';

export function parseAgentSkillArguments(argv, currentDirectory = process.cwd()) {
  if (argv.length === 0) return { root: currentDirectory };
  if (argv.length === 2 && argv[0] === '--root' && argv[1]) {
    return { root: resolve(currentDirectory, argv[1]) };
  }
  throw new Error('usage: check-agent-skills.mjs [--root <repository>]');
}

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed`);
  }
  return result.stdout;
}

async function pathType(path) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) return 'symlink';
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
}

function repositoryContains(root, path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function listGitPaths(root, args) {
  const commandArgs = [...args];
  const pathspecSeparator = commandArgs.indexOf('--');
  commandArgs.splice(pathspecSeparator === -1 ? commandArgs.length : pathspecSeparator, 0, '-z');
  return git(root, commandArgs).split('\0').filter(Boolean).sort();
}

function gitMode(root, path) {
  const line = git(root, ['ls-files', '--stage', '--', path]).trim();
  return line ? line.split(/\s+/, 1)[0] : undefined;
}

async function collectSkills(canonicalAbsolute) {
  if ((await pathType(canonicalAbsolute)) !== 'directory') return [];
  const entries = await readdir(canonicalAbsolute, { withFileTypes: true });
  const skillNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    skillNames.map(async (name) => ({
      entrypointType: await pathType(resolve(canonicalAbsolute, name, 'SKILL.md')),
      name,
    })),
  );
}

async function collectCanonicalEntries(canonicalAbsolute) {
  if ((await pathType(canonicalAbsolute)) !== 'directory') return [];
  const entries = await readdir(canonicalAbsolute, { withFileTypes: true });
  return entries
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory()
        ? 'directory'
        : entry.isFile()
          ? 'file'
          : entry.isSymbolicLink()
            ? 'symlink'
            : 'other',
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');

async function collectArtifactHashes(root, relativeDirectory = '') {
  const absoluteDirectory = resolve(root, relativeDirectory);
  if ((await pathType(absoluteDirectory)) !== 'directory') return [];
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const artifacts = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      artifacts.push(...(await collectArtifactHashes(root, relativePath)));
    } else if (entry.isFile()) {
      artifacts.push({
        hash: sha256(await readFile(resolve(root, relativePath))),
        path: relativePath,
      });
    } else {
      artifacts.push({ hash: `non-file:${entry.name}`, path: relativePath });
    }
  }
  return artifacts;
}

async function collectMigration(root, canonicalAbsolute) {
  const contractPath = agentSkillTopology.migrationContractPath;
  let contract;
  try {
    contract = JSON.parse(await readFile(resolve(root, contractPath), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return { exists: false, path: contractPath };
    }
    throw error;
  }
  const artifacts = await collectArtifactHashes(canonicalAbsolute);
  const sorted = artifacts.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  return {
    ...contract,
    actualArtifactCount: sorted.length,
    actualPathSetSha256: sha256(sorted.map(({ path }) => `${path}\n`).join('')),
    actualTreeSha256: sha256(sorted.map(({ hash, path }) => `${path}\0${hash}\n`).join('')),
    exists: true,
    path: contractPath,
  };
}

function positions(contents, pattern) {
  const indexes = [];
  for (const match of contents.matchAll(pattern)) indexes.push(match.index);
  return indexes;
}

function roleBoundToPath(contents, rolePattern, targetPath, otherPath) {
  const roles = positions(contents, rolePattern);
  const targets = positions(contents, new RegExp(targetPath.replaceAll('.', '\\.'), 'gi'));
  const others = positions(contents, new RegExp(otherPath.replaceAll('.', '\\.'), 'gi'));
  return roles.some((roleIndex) => {
    const targetDistance = Math.min(
      ...targets.map((index) => Math.abs(index - roleIndex)),
      Infinity,
    );
    const otherDistance = Math.min(...others.map((index) => Math.abs(index - roleIndex)), Infinity);
    return targetDistance <= 120 && targetDistance < otherDistance;
  });
}

async function collectCompatibility(root, canonicalRealPath) {
  const { compatibilityPath, expectedLinkTarget } = agentSkillTopology;
  const absolute = resolve(root, compatibilityPath);
  const type = await pathType(absolute);
  if (type === 'missing') {
    return {
      exists: false,
      gitMode: gitMode(root, compatibilityPath),
      path: compatibilityPath,
      resolution: 'missing',
      type,
    };
  }
  if (type !== 'symlink') {
    return {
      exists: true,
      gitMode: gitMode(root, compatibilityPath),
      path: compatibilityPath,
      resolution: 'ok',
      type,
    };
  }

  const linkTarget = await readlink(absolute);
  const resolvedLexically = resolve(resolve(absolute, '..'), linkTarget);
  let resolution = 'ok';
  let resolvedRealPath;

  if (isAbsolute(linkTarget)) {
    resolution = 'ok';
  } else if (!repositoryContains(root, resolvedLexically)) {
    resolution = 'escape';
  } else {
    try {
      resolvedRealPath = await realpath(absolute);
      if (!repositoryContains(root, resolvedRealPath)) resolution = 'escape';
    } catch (error) {
      if (error.code === 'ELOOP') resolution = 'cycle';
      else if (error.code === 'ENOENT') resolution = 'broken';
      else throw error;
    }
  }

  return {
    exists: true,
    gitMode: gitMode(root, compatibilityPath),
    linkTarget,
    path: compatibilityPath,
    realPath: resolvedRealPath,
    resolution,
    type,
    expectedLinkTarget,
    canonicalRealPath,
  };
}

async function readGuidance(root, path, compatibilityRequired) {
  let contents = '';
  try {
    contents = await readFile(resolve(root, path), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return {
    canonicalDeclared:
      (!compatibilityRequired && contents.includes('.agents/skills')) ||
      roleBoundToPath(contents, /canonical(?:ly)?/gi, '.agents/skills', '.claude/skills'),
    compatibilityDeclared: roleBoundToPath(
      contents,
      /compatib\w*/gi,
      '.claude/skills',
      '.agents/skills',
    ),
    compatibilityRequired,
    path,
  };
}

async function collectToolingWriterDrift(root) {
  const tracked = listGitPaths(root, [
    'ls-files',
    '--',
    'scripts',
    'tools',
    '.specify',
    '.agents/skills',
  ]);
  const candidates = tracked.filter(
    (path) =>
      path !== 'scripts/gates/check-agent-skills.mjs' &&
      ((!path.startsWith('scripts/tests/') &&
        !path.startsWith('scripts/mutation-tests/') &&
        (path.startsWith('scripts/') ||
          path.startsWith('tools/') ||
          path.startsWith('.specify/'))) ||
        /^\.agents\/skills\/[^/]+\/scripts\//.test(path)),
  );
  const writerPattern =
    /\b(?:appendFile|copyFile|mkdir|rename|writeFile)(?:Sync)?\b|(?:^|\s)(?:cp|install|mkdir|mv)(?:\s|$)/m;
  const writerDriftPaths = [];
  for (const path of candidates) {
    if ((await pathType(resolve(root, path))) !== 'file') continue;
    const contents = await readFile(resolve(root, path), 'utf8');
    if (contents.includes('.claude/skills') && writerPattern.test(contents)) {
      writerDriftPaths.push(path);
    }
  }
  return { writerDriftPaths: writerDriftPaths.sort() };
}

export async function collectAgentSkillFacts(root) {
  const canonicalPath = agentSkillTopology.canonicalPath;
  const canonicalAbsolute = resolve(root, canonicalPath);
  const canonicalType = await pathType(canonicalAbsolute);
  let canonicalRealPath;
  if (canonicalType !== 'missing') {
    try {
      canonicalRealPath = await realpath(canonicalAbsolute);
    } catch {
      canonicalRealPath = undefined;
    }
  }
  const trackedPaths = listGitPaths(root, ['ls-files', '--', canonicalPath]);
  const untrackedPaths = listGitPaths(root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    canonicalPath,
  ]);
  const ignoredPaths = listGitPaths(root, [
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '--',
    canonicalPath,
  ]);
  const skills = await collectSkills(canonicalAbsolute);

  return {
    canonical: {
      artifactCount: trackedPaths.length,
      entries: await collectCanonicalEntries(canonicalAbsolute),
      exists: canonicalType !== 'missing',
      ignoredPaths,
      path: canonicalPath,
      realPath: canonicalRealPath,
      skills,
      type: canonicalType,
      untrackedPaths,
    },
    compatibility: await collectCompatibility(root, canonicalRealPath),
    guidance: await Promise.all([
      readGuidance(root, 'AGENTS.md', true),
      readGuidance(root, 'CLAUDE.md', true),
      readGuidance(root, 'NOTICE', false),
      readGuidance(root, '.specify/extensions.yml', false),
    ]),
    migration: await collectMigration(root, canonicalAbsolute),
    repositoryRoot: root,
    tooling: await collectToolingWriterDrift(root),
  };
}

const diagnosticDetails = Object.freeze({
  AGENT_SKILLS_CANONICAL_MISSING: 'canonical catalog must exist',
  AGENT_SKILLS_CANONICAL_TYPE: 'canonical catalog must be a real directory',
  AGENT_SKILLS_ENTRY_MISSING: 'every skill directory must contain a regular SKILL.md',
  AGENT_SKILLS_ENTRY_TYPE: 'every immediate canonical entry must be a real skill directory',
  AGENT_SKILLS_IGNORED: 'canonical artifacts must not be ignored',
  AGENT_SKILLS_UNTRACKED: 'canonical artifacts must be tracked',
  AGENT_SKILLS_COMPAT_MISSING: 'compatibility path must exist',
  AGENT_SKILLS_COMPAT_NOT_LINK: 'compatibility path must be a symbolic link',
  AGENT_SKILLS_COMPAT_ABSOLUTE: 'compatibility link must be relative',
  AGENT_SKILLS_COMPAT_BROKEN: 'compatibility link must resolve',
  AGENT_SKILLS_COMPAT_CYCLE: 'compatibility link must be acyclic',
  AGENT_SKILLS_COMPAT_ESCAPE: 'compatibility link must remain inside the repository',
  AGENT_SKILLS_COMPAT_TARGET: 'compatibility link must resolve to the canonical catalog',
  AGENT_SKILLS_GIT_MODE: 'compatibility path must be stored as a Git symlink',
  AGENT_SKILLS_GUIDANCE_DRIFT: 'guidance must bind each ownership role to its path',
  AGENT_SKILLS_MIGRATION_CONTRACT: 'migration inventory contract must be valid',
  AGENT_SKILLS_MIGRATION_HASH: 'canonical artifact tree must match the approved inventory',
  AGENT_SKILLS_TOOLING_VENDOR_WRITE: 'repository tooling must not write to a vendor path',
});

function safeDiagnosticPath(path) {
  return String(path).replaceAll(/[^A-Za-z0-9._/-]/g, '?');
}

export function formatAgentSkillFinding(item) {
  const invariant = diagnosticDetails[item.code] ?? 'agent skill topology invariant must hold';
  return `${item.code} ${safeDiagnosticPath(item.path)} invariant=${JSON.stringify(invariant)} expected=${JSON.stringify(`${agentSkillTopology.compatibilityPath} -> ${agentSkillTopology.expectedLinkTarget}; ${agentSkillTopology.canonicalPath} is the sole real catalog`)}`;
}

export async function runAgentSkillCheck({
  argv = process.argv.slice(2),
  currentDirectory = process.cwd(),
  stderr = process.stderr,
  stdout = process.stdout,
} = {}) {
  const parsed = parseAgentSkillArguments(argv, currentDirectory);
  const root = await realpath(parsed.root);
  const facts = await collectAgentSkillFacts(root);
  const report = validateAgentSkillFacts(facts);
  if (report.findings.length > 0) {
    for (const item of report.findings) {
      stderr.write(`${formatAgentSkillFinding(item)}\n`);
    }
    return 1;
  }
  stdout.write(
    [
      `canonical=${agentSkillTopology.canonicalPath}`,
      `compatibility=${agentSkillTopology.compatibilityPath}`,
      `target=${agentSkillTopology.expectedLinkTarget}`,
      `skills=${report.skillCount}`,
      `artifacts=${report.artifactCount}`,
      'inventory=verified',
    ].join(' ') + '\n',
  );
  return 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  runAgentSkillCheck()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(`AGENT_SKILLS_INTERNAL check-agent-skills: ${error.message}\n`);
      process.exitCode = 1;
    });
}
