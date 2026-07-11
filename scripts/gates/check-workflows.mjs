#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S6
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const DEFAULT_WORKFLOWS_DIRECTORY = resolve(repositoryRoot, '.github/workflows');
const FULL_SHA_REFERENCE = /^[^\s@]+@[a-f0-9]{40}$/u;
const HARDEN_RUNNER_REFERENCE = /^step-security\/harden-runner@[a-f0-9]{40}$/u;
const ENDPOINT = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?):[1-9][0-9]{0,4}$/u;
const ALLOWED_SCOPED_WRITES = new Set([
  'codeql.yml:analyze:security-events',
  'docs.yml:deploy:id-token',
  'docs.yml:deploy:pages',
  'release.yml:publish:id-token',
  'security.yml:osv-scan:security-events',
]);

function fail(message) {
  throw new Error(`workflow-policy: ${message}`);
}

export function parseWorkflowArguments(arguments_) {
  if (arguments_.length === 0) {
    return DEFAULT_WORKFLOWS_DIRECTORY;
  }
  if (arguments_.length !== 2 || arguments_[0] !== '--workflows-dir') {
    fail('usage: check-workflows.mjs [--workflows-dir <directory>]');
  }
  return resolve(arguments_[1]);
}

function indentation(line) {
  const match = /^( *)/u.exec(line);
  return match?.[1].length ?? 0;
}

function unquote(value) {
  return value.trim().replace(/^['"]|['"]$/gu, '');
}

function externalUses(lines, file) {
  for (const [index, line] of lines.entries()) {
    const match = /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/u.exec(line);
    if (match === null) continue;
    const reference = unquote(match[1]);
    if (reference.startsWith('./') || reference.startsWith('docker://')) continue;
    if (!FULL_SHA_REFERENCE.test(reference)) {
      fail(`${file}:${index + 1} action ${reference} must use a full 40-character commit SHA`);
    }
  }
}

function jobBlocks(lines, file) {
  const jobsIndex = lines.findIndex((line) => /^jobs:\s*$/u.test(line));
  if (jobsIndex === -1) fail(`${file} must declare jobs`);
  const blocks = [];
  for (let index = jobsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (indentation(line) === 0) break;
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/u.exec(line);
    if (match === null) continue;
    let end = index + 1;
    while (end < lines.length) {
      const candidate = lines[end];
      if (
        /^ {2}[A-Za-z0-9_-]+:\s*$/u.test(candidate) ||
        (candidate.trim() !== '' && indentation(candidate) === 0)
      ) {
        break;
      }
      end += 1;
    }
    blocks.push({ end, lines: lines.slice(index, end), name: match[1], start: index });
    index = end - 1;
  }
  if (blocks.length === 0) fail(`${file} must declare at least one job`);
  return blocks;
}

function assertTopLevelPermissions(lines, file) {
  const permission = lines.find((line) => /^permissions:/u.test(line));
  if (permission === undefined || !/^permissions:\s*\{\}\s*(?:#.*)?$/u.test(permission)) {
    fail(`${file} must set workflow permissions to {} so every job declares least privilege`);
  }
}

function assertJobPermissions(job, file) {
  const permissionIndex = job.lines.findIndex((line) => /^ {4}permissions:/u.test(line));
  if (permissionIndex === -1) {
    fail(`${file} job ${job.name} must declare explicit permissions`);
  }
  const heading = job.lines[permissionIndex];
  const inline = /^ {4}permissions:\s*(.*?)\s*(?:#.*)?$/u.exec(heading)?.[1] ?? '';
  if (/^(?:read-all|write-all)$/u.test(unquote(inline))) {
    fail(`${file} job ${job.name} permissions ${inline} violates least privilege`);
  }
  if (inline === '{}') return;
  if (inline !== '') {
    fail(`${file} job ${job.name} permissions must be an explicit map or {}`);
  }
  const entries = [];
  for (let index = permissionIndex + 1; index < job.lines.length; index += 1) {
    const line = job.lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (indentation(line) <= 4) break;
    const entry = /^ {6}([a-z-]+):\s*(read|write|none)\s*(?:#.*)?$/u.exec(line);
    if (entry === null) {
      fail(`${file} job ${job.name} has an invalid explicit permission entry`);
    }
    const reusableSecurityWriter =
      entry[1] === 'security-events' &&
      job.lines.some((candidate) => /^ {4}uses:/u.test(candidate)) &&
      job.lines.some((candidate) =>
        /#\s*kimen-workflow-policy:\s*reusable-workflow-v1/u.test(candidate),
      );
    if (
      entry[2] === 'write' &&
      !ALLOWED_SCOPED_WRITES.has(`${file}:${job.name}:${entry[1]}`) &&
      !reusableSecurityWriter
    ) {
      fail(
        `${file} job ${job.name} grants unnecessary ${entry[1]}: write authority; OIDC and other writes must be scoped to an exact publisher, deploy, review or security job`,
      );
    }
    entries.push(entry[1]);
  }
  if (entries.length === 0) {
    fail(`${file} job ${job.name} must declare explicit permissions or {}`);
  }
}

function assertReusableWorkflow(job, file) {
  const referenceLine = job.lines.find((line) => /^ {4}uses:/u.test(line));
  if (referenceLine === undefined) return false;
  const reference = unquote(/^ {4}uses:\s*([^\s#]+)/u.exec(referenceLine)?.[1] ?? '');
  if (!FULL_SHA_REFERENCE.test(reference)) {
    fail(`${file} reusable workflow ${job.name} must use a full 40-character commit SHA`);
  }
  const source = job.lines.join('\n');
  if (
    !/#\s*kimen-workflow-policy:\s*reusable-workflow-v1\s*$/mu.test(source) ||
    !/#\s*reason:\s*\S.+$/mu.test(source)
  ) {
    fail(
      `${file} reusable workflow ${job.name} needs a versioned reusable-workflow exception and reason`,
    );
  }
  return true;
}

function hardenStep(job) {
  const usesIndex = job.lines.findIndex((line) => {
    const match = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/u.exec(line);
    return match !== null && HARDEN_RUNNER_REFERENCE.test(unquote(match[1]));
  });
  if (usesIndex === -1) return null;
  let start = usesIndex;
  while (start > 0 && !/^ {6}-\s/u.test(job.lines[start])) start -= 1;
  let end = usesIndex + 1;
  while (end < job.lines.length && !/^ {6}-\s/u.test(job.lines[end])) end += 1;
  return { end, lines: job.lines.slice(start, end), start };
}

function assertAllowedEndpoints(step, file, jobName) {
  const index = step.lines.findIndex((line) => /^\s+allowed-endpoints:/u.test(line));
  if (index === -1) {
    fail(`${file} job ${jobName} blocked egress needs a declared allowed-endpoints allowlist`);
  }
  const line = step.lines[index];
  const match = /^\s+allowed-endpoints:\s*(.*?)\s*$/u.exec(line);
  const scalar = match?.[1] ?? '';
  const endpoints = [];
  if (scalar !== '' && !/^[>|][+-]?$/u.test(scalar))
    endpoints.push(...unquote(scalar).split(/\s+/u));
  const keyIndent = indentation(line);
  for (let cursor = index + 1; cursor < step.lines.length; cursor += 1) {
    const candidate = step.lines[cursor];
    if (candidate.trim() === '') continue;
    if (indentation(candidate) <= keyIndent) break;
    endpoints.push(...candidate.trim().split(/\s+/u));
  }
  if (endpoints.length === 0 || endpoints.some((endpoint) => !ENDPOINT.test(endpoint))) {
    fail(`${file} job ${jobName} allowed-endpoints must declare concrete host:port entries`);
  }
}

function assertOwnedJob(job, file) {
  if (!job.lines.some((line) => /^ {4}runs-on:\s*\S/u.test(line))) {
    fail(`${file} owned job ${job.name} must declare runs-on`);
  }
  if (!job.lines.some((line) => /^ {4}timeout-minutes:\s*[1-9][0-9]*\s*(?:#.*)?$/u.test(line))) {
    fail(`${file} owned job ${job.name} must declare a finite timeout-minutes`);
  }
  const step = hardenStep(job);
  if (step === null) {
    fail(`${file} job ${job.name} must start with full-SHA step-security/harden-runner`);
  }
  const firstExecutable = job.lines.findIndex(
    (line) => /^ {8}(?:uses|run):/u.test(line) || /^ {8}-\s+uses:/u.test(line),
  );
  if (firstExecutable !== -1 && step.start > firstExecutable) {
    fail(`${file} job ${job.name} must harden the runner before executable steps`);
  }
  const source = step.lines.join('\n');
  if (!/^\s+egress-policy:\s*['"]?block['"]?\s*$/mu.test(source)) {
    fail(`${file} job ${job.name} must block egress; audit mode is forbidden`);
  }
  assertAllowedEndpoints(step, file, job.name);
}

export function validateWorkflowSource(source, file) {
  if (source.includes('\t')) fail(`${file} must not contain YAML tab indentation`);
  const lines = source.split(/\r?\n/u);
  assertTopLevelPermissions(lines, file);
  externalUses(lines, file);
  for (const job of jobBlocks(lines, file)) {
    const reusable = assertReusableWorkflow(job, file);
    assertJobPermissions(job, file);
    if (!reusable) assertOwnedJob(job, file);
  }
}

export async function checkWorkflows({
  workflowsDirectory,
  listDirectory = readdir,
  readText = readFile,
}) {
  const files = (await listDirectory(workflowsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (files.length === 0) fail(`no workflow files found in ${workflowsDirectory}`);
  for (const file of files) {
    validateWorkflowSource(await readText(resolve(workflowsDirectory, file), 'utf8'), file);
  }
  return files;
}

export async function runWorkflowCli({
  arguments_ = process.argv.slice(2),
  stdout = process.stdout,
  listDirectory = readdir,
  readText = readFile,
} = {}) {
  const directory = parseWorkflowArguments(arguments_);
  const files = await checkWorkflows({
    workflowsDirectory: directory,
    listDirectory,
    readText,
  });
  stdout.write(`GATE workflows: PASS (${files.length} workflow files)\n`);
  return files;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runWorkflowCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
