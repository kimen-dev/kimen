import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

// What a TypeScript consumer type-checks is the packed package, read the way
// a strict project reads it: `skipLibCheck: false`, so an error inside the
// published declarations (a type they use but do not import, say) reaches
// the consumer's build. One consumer file imports the types of every
// per-component subpath, the components barrel, the lazy loader, the
// deprecated root and two glyph modules, a canonical name and an alias: a
// strict project refuses a subpath that resolves to no declaration (TS7016).
let consumer = '';
let subpaths: string[] = [];

function run(command: string, arguments_: string[], cwd: string): string {
  const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${arguments_.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

beforeAll(async () => {
  consumer = await realpath(await mkdtemp(join(tmpdir(), 'kimen-consumer-declarations-')));
  const installed = join(consumer, 'node_modules/@kimen/elements');
  await mkdir(installed, { recursive: true });
  // An ES module consumer, as the package is ESM only.
  await writeFile(join(consumer, 'package.json'), '{ "type": "module", "private": true }\n');
  const [{ filename }] = JSON.parse(
    run(
      'npm',
      ['pack', packageRoot, '--json', '--ignore-scripts', '--pack-destination', consumer],
      consumer,
    ),
  ) as [{ filename: string }];
  run('tar', ['-xzf', join(consumer, filename), '-C', installed, '--strip-components=1'], consumer);
  subpaths = (await readdir(join(installed, 'dist/components')))
    .filter((file) => /^ki-[a-z0-9-]+\.d\.ts$/u.test(file))
    .map((file) => `@kimen/elements/${file.slice(0, -'.d.ts'.length)}`)
    .sort();
  const entries = [
    ...subpaths,
    '@kimen/elements/components',
    '@kimen/elements/loader',
    '@kimen/elements',
    '@kimen/elements/icons/circle-check',
    '@kimen/elements/icons/alert-triangle',
  ];
  const imports = entries.map(
    (specifier, index) => `import type * as module${String(index)} from '${specifier}';`,
  );
  const readinessAssertions = `
type KimenTag = Extract<keyof HTMLElementTagNameMap, \`ki-\${string}\`>;
type TagsWithReadiness = {
  [Tag in KimenTag]: 'componentOnReady' extends keyof HTMLElementTagNameMap[Tag] ? Tag : never;
}[KimenTag];
type AssertNever<T extends never> = T;
export type NoElementReadiness = AssertNever<TagsWithReadiness>;
`;
  await writeFile(
    join(consumer, 'consumer.ts'),
    `${imports.join('\n')}\n\nexport type Modules = [${imports.map((_, index) => `typeof module${String(index)}`).join(', ')}];\n${readinessAssertions}`,
  );
}, 120_000);

afterAll(async () => {
  if (consumer !== '') await rm(consumer, { force: true, recursive: true });
});

const diagnostics = (moduleResolution: 'bundler' | 'nodenext'): string[] => {
  const program = ts.createProgram([join(consumer, 'consumer.ts')], {
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    module: moduleResolution === 'bundler' ? ts.ModuleKind.ESNext : ts.ModuleKind.NodeNext,
    moduleResolution:
      moduleResolution === 'bundler'
        ? ts.ModuleResolutionKind.Bundler
        : ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const file = diagnostic.file ? relative(consumer, diagnostic.file.fileName) : '';
    return `${file}: TS${String(diagnostic.code)} ${message}`;
  });
};

describe('the packed declarations of @kimen/elements', () => {
  it('reach every per-component subpath', () => {
    expect(subpaths.length).toBeGreaterThan(100);
  });

  it.each(['bundler', 'nodenext'] as const)(
    'type-check without skipLibCheck under %s resolution',
    (moduleResolution) => {
      expect(diagnostics(moduleResolution)).toEqual([]);
    },
    60_000,
  );
});
