#!/usr/bin/env node
// Angular proxies normalization (spec 034, Art. I — the docs.json
// normalization precedent: the generation PIPELINE owns deterministic
// post-passes; the committed artifact is pipeline output, never
// hand-edited).
//
// @stencil/angular-output-target 1.4.1 mishandles kebab-case event names:
// it declares `outputs: ['ki-dismiss']` with no backing member (Angular 22
// throws "@Output ki-dismiss not initialized" on the template binding),
// emits an orphan camelCase `@Output() kiDismiss` that nothing ever fires,
// and types a phantom quoted EventEmitter field on the declare-interface.
// Runtime measurement (adversarial review + regression test): a DECLARED
// output ALSO double-fires under Ivy, because modern Angular attaches the
// native DOM listener alongside the output subscription.
//
// Kebab-case custom events need none of that machinery: an Angular
// template binds any DOM event by name, so `(ki-dismiss)` on the host
// works natively, exactly once, with no directive involvement. This pass
// therefore REMOVES the broken output surface entirely — metadata
// `outputs`, orphan `@Output` emitters, phantom interface fields and the
// then-unused imports — leaving the native path as the one event channel.
// Fail-loud: any drift in the upstream shape aborts the build rather than
// shipping a half-normalized artifact.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const proxiesPath = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../angular/src/directives/proxies.ts',
);

let source = readFileSync(proxiesPath, 'utf8');

if (!source.includes('outputs: [') && !source.includes('@Output()')) {
  process.stdout.write('angular proxies: already normalized\n');
  process.exit(0);
}

const outputLine = /^ {2}@Output\(\) \w+ = new EventEmitter<.+>\(\);\n/gmu;
const metadataLine = /^ {2}outputs: \[[^\]]+\],?\n/gmu;
const phantomField = /^ {2}'[a-z-]+': EventEmitter<.+>;\n/gmu;

const orphanCount = [...source.matchAll(outputLine)].length;
const metadataCount = [...source.matchAll(metadataLine)].length;
const phantomCount = [...source.matchAll(phantomField)].length;
if (orphanCount === 0 || orphanCount !== metadataCount || orphanCount !== phantomCount) {
  throw new Error(
    `angular proxies: inconsistent upstream event shape (${String(orphanCount)} @Output, ${String(metadataCount)} outputs metadata, ${String(phantomCount)} interface fields) — refusing to normalize`,
  );
}

source = source.replace(outputLine, '');
source = source.replace(metadataLine, '');
source = source.replace(phantomField, '');
source = source.replace(/import \{ ([^}]*)\} from '@angular\/core';/u, (_match, list) => {
  const kept = list
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '' && entry !== 'Output' && entry !== 'EventEmitter');
  return `import { ${kept.join(', ')} } from '@angular/core';`;
});

if (/@Output|EventEmitter|outputs: \[/u.test(source)) {
  throw new Error('angular proxies: normalization left output machinery behind');
}

writeFileSync(proxiesPath, source, 'utf8');
process.stdout.write(
  `angular proxies: removed ${String(orphanCount)} broken output surfaces — kebab-case ki-* events bind natively\n`,
);
