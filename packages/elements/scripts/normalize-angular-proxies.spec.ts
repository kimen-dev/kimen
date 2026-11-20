import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('normalizes an Angular proxy whose metadata declares more than one event', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'kimen-angular-proxy-'));
  try {
    const scripts = join(workspace, 'elements', 'scripts');
    const directives = join(workspace, 'angular', 'src', 'directives');
    mkdirSync(scripts, { recursive: true });
    mkdirSync(directives, { recursive: true });
    const normalizer = join(scripts, 'normalize-angular-proxies.mjs');
    copyFileSync(
      fileURLToPath(new URL('./normalize-angular-proxies.mjs', import.meta.url)),
      normalizer,
    );
    const proxy = join(directives, 'proxies.ts');
    writeFileSync(
      proxy,
      `import { Component, EventEmitter, Output } from '@angular/core';
@Component({
  inputs: ['open'],
  outputs: ['ki-open', 'ki-close'],
})
export class KiPopover {
  @Output() kiOpen = new EventEmitter<void>();
  @Output() kiClose = new EventEmitter<void>();
}
export declare interface KiPopover {
  'ki-open': EventEmitter<void>;
  'ki-close': EventEmitter<void>;
}
`,
    );
    const result = spawnSync(process.execPath, [normalizer], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const normalized = readFileSync(proxy, 'utf8');
    expect(normalized).toContain("inputs: ['open']");
    expect(normalized).not.toMatch(/@Output|EventEmitter|outputs:/u);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});
