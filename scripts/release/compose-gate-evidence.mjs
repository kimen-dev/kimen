#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S13
// Release validation runs its gates in parallel jobs: validate-core runs
// gates-core.sh, and each browser job runs one shard of gates-browser.sh in
// one engine. Each job records its own current-run evidence. The capability
// binding (check-capabilities.mjs) reads the record gates-suite.sh writes,
// where `test-browser` is green when the complete browser gate exited 0. This
// composes that record from the jobs' evidence: the core rows as they are,
// every shard's rows, and `test-browser` green only when every release engine
// reports every one of its shards with every row green. A missing, repeated,
// mismatched or non-green shard stops the binding.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The engines the release browser matrix runs (spec 018 S6).
export const RELEASE_BROWSER_ENGINES = Object.freeze(['chromium', 'firefox', 'webkit']);

// The evidence ID gates-suite.sh gives the complete browser gate.
export const BROWSER_GATE_EVIDENCE_ID = 'test-browser';

// gates-browser.sh names the elements suite of a sharded run this way.
const SHARD_ID = /^test-browser:([a-z]+):([1-9][0-9]*)\/([1-9][0-9]*)$/u;

function fail(message) {
  throw new Error(`compose-gate-evidence: ${message}`);
}

function parseRows(source, label) {
  const rows = [];
  for (const [index, line] of source.split('\n').entries()) {
    if (line === '') continue;
    const fields = line.split('\t');
    if (fields.length !== 3 || fields.some((field) => field === '')) {
      fail(`${label} has a malformed row at line ${String(index + 1)}`);
    }
    const [origin, id, status] = fields;
    rows.push({ id, line, origin, status });
  }
  if (rows.length === 0) fail(`${label} is empty`);
  return rows;
}

function browserShard(rows, label) {
  const shardRows = rows.filter(({ id }) => SHARD_ID.test(id));
  if (shardRows.length !== 1) {
    fail(`${label} must record exactly one browser shard, found ${String(shardRows.length)}`);
  }
  const [, engine, index, count] = SHARD_ID.exec(shardRows[0].id);
  if (!RELEASE_BROWSER_ENGINES.includes(engine)) {
    fail(`${label} records ${engine}, which is not a release browser engine`);
  }
  if (Number(index) > Number(count)) {
    fail(`${label} records shard ${index}/${count}, outside its count`);
  }
  const foreign = rows.find(({ origin }) => origin !== 'browser');
  if (foreign) fail(`${label} has a ${foreign.origin} row; it must come from the browser gate`);
  const notGreen = rows.find(({ status }) => status !== 'green');
  if (notGreen) fail(`${label} records ${notGreen.id} as ${notGreen.status}, not green`);
  if (!rows.some(({ id }) => id === `browser-executable:${engine}`)) {
    fail(`${label} does not record the ${engine} executable it ran`);
  }
  return { count: Number(count), engine, index: Number(index) };
}

// core: the validate-core evidence text. browser: one { label, source } per
// browser job. Returns the composed current-run evidence text.
export function composeReleaseGateEvidence({ core, browser }) {
  const coreRows = parseRows(core, 'core evidence');
  if (!Array.isArray(browser) || browser.length === 0) fail('no browser evidence was given');
  const shards = new Map(RELEASE_BROWSER_ENGINES.map((engine) => [engine, new Map()]));
  const browserRows = [];
  for (const { label, source } of browser) {
    const rows = parseRows(source, label);
    const { count, engine, index } = browserShard(rows, label);
    const engineShards = shards.get(engine);
    if (engineShards.has(index)) fail(`${engine} shard ${String(index)} is recorded twice`);
    engineShards.set(index, count);
    browserRows.push(...rows);
  }
  for (const [engine, engineShards] of shards) {
    if (engineShards.size === 0) fail(`no browser evidence for ${engine}`);
    const counts = new Set(engineShards.values());
    if (counts.size !== 1) fail(`${engine} shards disagree on how many shards there are`);
    const [count] = counts;
    for (let index = 1; index <= count; index += 1) {
      if (!engineShards.has(index)) {
        fail(`${engine} shard ${String(index)}/${String(count)} has no evidence`);
      }
    }
  }
  const lines = [...coreRows, ...browserRows].map(({ line }) => line);
  lines.push(['release', BROWSER_GATE_EVIDENCE_ID, 'green'].join('\t'));
  return `${lines.join('\n')}\n`;
}

export function parseComposeArguments(arguments_) {
  const options = { browser: [], core: null, output: null };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--core' || argument === '--output') {
      const value = arguments_[index + 1];
      const key = argument.slice(2);
      if (!value || options[key] !== null) fail(`${argument} needs one path`);
      options[key] = resolve(value);
      index += 1;
    } else if (argument.startsWith('--')) {
      fail(`unknown argument ${argument}`);
    } else {
      options.browser.push(resolve(argument));
    }
  }
  if (options.core === null || options.output === null || options.browser.length === 0) {
    fail('usage: compose-gate-evidence.mjs --core <file> --output <file> <browser evidence>...');
  }
  return options;
}

export async function runComposeCli({
  arguments_ = process.argv.slice(2),
  stdout = process.stdout,
} = {}) {
  const options = parseComposeArguments(arguments_);
  const [core, ...browserSources] = await Promise.all(
    [options.core, ...options.browser].map((path) => readFile(path, 'utf8')),
  );
  const evidence = composeReleaseGateEvidence({
    browser: options.browser.map((label, index) => ({ label, source: browserSources[index] })),
    core,
  });
  await writeFile(options.output, evidence, 'utf8');
  stdout.write(
    `release gate evidence: ${String(options.browser.length)} browser shards across ${RELEASE_BROWSER_ENGINES.join(', ')}; ${BROWSER_GATE_EVIDENCE_ID} green\n`,
  );
  return evidence;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runComposeCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
