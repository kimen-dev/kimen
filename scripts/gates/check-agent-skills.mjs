#!/usr/bin/env node
// @spec:019-agent-skills-canonical
import { spawnSync } from 'node:child_process';
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
  const canonicalPathDeclared = /\.agents\/skills/.test(contents);
  return {
    canonicalDeclared:
      canonicalPathDeclared && (!compatibilityRequired || /canonical/i.test(contents)),
    compatibilityDeclared: /\.claude\/skills/.test(contents) && /compatib/i.test(contents),
    compatibilityRequired,
    path,
  };
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
    repositoryRoot: root,
  };
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
      stderr.write(`${item.code} ${item.path}\n`);
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
