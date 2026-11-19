#!/usr/bin/env node
// React wrappers normalization (spec 049, Art. I — the angular-proxies
// precedent: the generation PIPELINE owns deterministic post-passes; the
// committed wrappers are pipeline output, never hand-edited).
//
// @stencil/react-output-target 1.8.1 imports each component's event types
// (`Ki*CustomEvent` and the event detail types) from the package root,
// `@kimen/elements`. The root is a frozen legacy facade that never grows
// (FR-024): a component added after the freeze has no root export to import,
// and the public-API gate refuses any new root symbol. The upstream switch
// that would import them from the components type surface instead
// (`typesFromComponentsFile`) is internal to the output target and only turns
// on with Stencil 5 output targets.
//
// `@kimen/elements/components` (the generated components.d.ts) declares every
// `Ki*CustomEvent` and re-exports every type a component signature names, and
// each wrapper already imports `Components` from it. This pass points the
// event-type import there too, for every wrapper, so old and new components
// are typed the same way. Fail-loud: a value import from the root, or a type
// import of another shape, aborts the build.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const wrappersDirectory = join(fileURLToPath(new URL('.', import.meta.url)), '../../react/src');
const rootTypeImport = /^import type \{ ([A-Za-z0-9_, ]+) \} from '@kimen\/elements';$/gmu;
const anyRootImport = /from '@kimen\/elements';$/mu;

let rewritten = 0;
for (const file of readdirSync(wrappersDirectory).filter((name) =>
  /^ki-[a-z-]+\.ts$/u.test(name),
)) {
  const path = join(wrappersDirectory, file);
  const source = readFileSync(path, 'utf8');
  const normalized = source.replace(rootTypeImport, (_match, names) => {
    rewritten += 1;
    return `import type { ${names} } from '@kimen/elements/components';`;
  });
  if (anyRootImport.test(normalized)) {
    throw new Error(
      `react wrappers: ${file} still imports from the frozen package root in an unexpected shape — refusing to normalize`,
    );
  }
  if (normalized !== source) {
    writeFileSync(path, normalized);
  }
}

process.stdout.write(
  `react wrappers: ${String(rewritten)} event-type imports read from @kimen/elements/components\n`,
);
