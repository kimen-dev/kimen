#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { checkTheme } from './check-theme.mjs';

const usage = 'Usage: kimen-tokens check-theme [--json] <file.css…>';

async function main([command, ...args]) {
  if (command === '--help') {
    console.log(usage);
    return;
  }
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { json: { type: 'boolean' }, help: { type: 'boolean' } },
  });
  if (command === 'check-theme' && values.help) {
    console.log(usage);
    return;
  }
  if (command !== 'check-theme' || positionals.length === 0) throw new Error(usage);

  const findings = [];
  for (const file of positionals) {
    const css = await readFile(file, 'utf8').catch(() => undefined);
    if (css === undefined) {
      findings.push({
        code: 'unreadable-file',
        severity: 'error',
        file,
        line: 1,
        column: 1,
        fix: 'Provide a readable CSS file.',
      });
    } else {
      for (const finding of checkTheme(css, { file })) findings.push(finding);
    }
  }
  if (values.json) console.log(JSON.stringify(findings));
  else {
    for (const { file, line, column, severity, code, token, fix } of findings) {
      console.log(
        `${file}:${line}:${column} ${severity} ${code}${token ? ` ${token}` : ''} — ${fix}`,
      );
    }
  }
  process.exitCode = findings.some(({ severity }) => severity === 'error') ? 1 : 0;
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
