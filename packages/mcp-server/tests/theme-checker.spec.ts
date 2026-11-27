// @spec:171-theme-checker
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

import { CONTAINED_FLAGS, connect, textOf } from './harness.js';

it('S6: check_theme returns the same findings as the CLI under Node permissions', async () => {
  const tokenRoot = new URL('../../tokens/', import.meta.url);
  const file = fileURLToPath(new URL('scripts/fixtures/theme-mistakes.css', tokenRoot));
  const css = readFileSync(file, 'utf8');
  const { bin } = JSON.parse(readFileSync(new URL('package.json', tokenRoot), 'utf8')) as {
    bin: { tokens: string };
  };
  const cli = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(bin.tokens, tokenRoot)), 'check-theme', file, '--json'],
    { encoding: 'utf8' },
  );
  expect(cli.status).toBe(1);
  const findings: unknown = JSON.parse(cli.stdout);
  const connection = await connect({ nodeFlags: CONTAINED_FLAGS });
  try {
    const result = await connection.client.callTool({
      name: 'check_theme',
      arguments: { css, file },
    });
    expect(result.structuredContent).toEqual({ findings });
    expect(JSON.parse(textOf(result))).toEqual({ findings });
  } finally {
    await connection.close();
  }
});
