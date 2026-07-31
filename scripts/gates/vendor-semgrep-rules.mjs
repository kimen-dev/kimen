#!/usr/bin/env node
// Refreshes .semgrep/p-default.vendored.yml from a downloaded registry ruleset.
//
// Keeps only rules whose `languages` include something this repository
// contains; the rest target languages that are not here, and Semgrep would
// never select them anyway. Textual, block-by-block: the upstream formatting,
// comments and metadata survive, so the diff on a refresh reads as rule
// changes rather than as a reserialization.
//
//   curl -sSL https://semgrep.dev/c/p/default -o /tmp/p-default.yml
//   node scripts/gates/vendor-semgrep-rules.mjs /tmp/p-default.yml
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUTPUT_URL = new URL('../../.semgrep/p-default.vendored.yml', import.meta.url);

const KEPT_LANGUAGES = new Set([
  'bash',
  'dockerfile',
  'generic',
  'html',
  'js',
  'javascript',
  'json',
  'regex',
  'sh',
  'ts',
  'typescript',
  'yaml',
]);

function ruleBlocks(lines) {
  const starts = lines.flatMap((line, index) => (line.startsWith('- id:') ? [index] : []));
  return starts.map((start, position) => lines.slice(start, starts[position + 1] ?? lines.length));
}

function languagesOf(block) {
  const languages = new Set();
  const start = block.indexOf('  languages:');
  if (start === -1) {
    return languages;
  }
  for (let index = start + 1; index < block.length; index += 1) {
    const item = /^ {2}- (\S+)$/u.exec(block[index]);
    if (item === null) {
      break;
    }
    languages.add(item[1]);
  }
  return languages;
}

// Secret-detection rules are dropped, and not for convenience. They carry
// credential-shaped placeholders as rule data — the Slack rule's own
// `pattern-not` excludes Slack's documentation example verbatim — and GitHub
// push protection blocks any push containing them, so this file cannot exist
// with them in it.
//
// Nothing is lost that is not covered three times over: push protection stops
// a real credential before it reaches GitHub, `security.yml`'s `secrets` job
// runs gitleaks over the full history plus TruffleHog, and the scheduled
// registry scan still carries these rules.
const DROPPED_RULE = /^- id: \S*\.secrets\./u;

const [source] = process.argv.slice(2);
if (source === undefined) {
  console.error('usage: vendor-semgrep-rules.mjs <downloaded-ruleset.yml>');
  process.exit(1);
}

const blocks = ruleBlocks((await readFile(source, 'utf8')).split('\n'));
const kept = blocks.filter(
  (block) =>
    !DROPPED_RULE.test(block[0]) &&
    [...languagesOf(block)].some((language) => KEPT_LANGUAGES.has(language)),
);

if (kept.length === 0) {
  console.error('vendor-semgrep-rules: no rule matched the kept languages — wrong input file?');
  process.exit(1);
}

await writeFile(
  OUTPUT_URL,
  `rules:\n${kept.map((block) => block.join('\n').replace(/\n+$/u, '')).join('\n')}\n`,
);

console.log(
  `vendored ${String(kept.length)} of ${String(blocks.length)} rules → ${fileURLToPath(OUTPUT_URL)}`,
);
