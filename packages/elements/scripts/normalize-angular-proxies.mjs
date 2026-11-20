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
// and types a phantom EventEmitter field on the declare-interface. Native
// event names such as `play` also have a phantom field, without quotes.
// Runtime measurement (adversarial review + regression test): a DECLARED
// output ALSO double-fires under Ivy, because modern Angular attaches the
// native DOM listener alongside the output subscription.
//
// DOM events need none of that machinery: an Angular
// template binds any DOM event by name, so `(ki-dismiss)` on the host
// works natively, exactly once, with no directive involvement. This pass
// therefore REMOVES the broken output surface entirely — metadata
// `outputs`, orphan `@Output` emitters, phantom interface fields and the
// then-unused imports — leaving the native path as the one event channel.
// Fail-loud: any drift in the upstream shape aborts the build rather than
// shipping a half-normalized artifact.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function normalizeAngularProxies(source) {
  if (!source.includes('outputs: [') && !source.includes('@Output()')) {
    return { source, orphanCount: 0, strippedTypeImports: 0 };
  }

  const outputLine = /^ {2}@Output\(\) \w+ = new EventEmitter<.+>\(\);\n/gmu;
  const metadataLine = /^ {2}outputs: \[('[a-z-]+'(?:, '[a-z-]+')*)\],?\n/gmu;
  // Stencil quotes dashed names and emits lowercase native names as identifiers.
  // Match the unquoted event's optional JSDoc through its first closing delimiter.
  const phantomField =
    /(?:^ {2}'[a-z-]+'|(?:^ {2}\/\*\*(?:(?!\*\/)[\s\S])*\*\/\n)?^ {2}[a-z]+): EventEmitter<.+>;\n/gmu;

  const orphanCount = [...source.matchAll(outputLine)].length;
  // One metadata list can describe several outputs from the same component.
  const metadataCount = [...source.matchAll(metadataLine)].reduce(
    (count, [, events]) => count + events.split(', ').length,
    0,
  );
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

  // The removed outputs were the ONLY consumers of the per-event custom-event
  // type imports (`KiAlertCustomEvent`, each event's detail alias, …); with the
  // machinery gone they are dangling. Strip every `@kimen/elements/components`
  // type import except the `Components` namespace the input interfaces extend.
  // `$event` on a native `(ki-*)` binding is still fully typed under strict
  // templates via the elements' HTMLElementTagNameMap/addEventListener overloads
  // (README + FR-004) — that typing does not flow through these proxy imports.
  const componentsTypeImport =
    /^import type \{ ([^}]+) \} from '@kimen\/elements\/components';\n/gmu;
  const strippedTypeImports = [...source.matchAll(componentsTypeImport)].filter(
    ([, names]) => names.trim() !== 'Components',
  ).length;
  source = source.replace(componentsTypeImport, (match, names) =>
    names.trim() === 'Components' ? match : '',
  );

  if (/@Output|EventEmitter|outputs: \[/u.test(source)) {
    throw new Error('angular proxies: normalization left output machinery behind');
  }

  return { source, orphanCount, strippedTypeImports };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proxiesPath = join(
    fileURLToPath(new URL('.', import.meta.url)),
    '../../angular/src/directives/proxies.ts',
  );
  const normalized = normalizeAngularProxies(readFileSync(proxiesPath, 'utf8'));
  if (normalized.orphanCount === 0) {
    process.stdout.write('angular proxies: already normalized\n');
  } else {
    writeFileSync(proxiesPath, normalized.source, 'utf8');
    process.stdout.write(
      `angular proxies: removed ${String(normalized.orphanCount)} broken output surfaces and ${String(normalized.strippedTypeImports)} dangling event-type imports — host events bind natively\n`,
    );
  }
}
