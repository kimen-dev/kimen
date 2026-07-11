// @spec:018-project-integrity-hardening#S11
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const tokenGate = fileURLToPath(new URL('../gates/check-tokens.mjs', import.meta.url));

const paths = Object.freeze({
  component: 'packages/tokens/tokens/component/button.tokens.json',
  componentOverride: 'packages/tokens/tokens/component/button.material3.tokens.json',
  config: 'packages/tokens/style-dictionary.config.mjs',
  css: 'packages/elements/src/components/ki-button/ki-button.css',
  dark: 'packages/tokens/tokens/modes/dark.tokens.json',
  materialDark: 'packages/tokens/tokens/modes/material3.dark.tokens.json',
  materialSemantic: 'packages/tokens/tokens/semantic/material3.tokens.json',
  materialTheme: 'packages/tokens/tokens/themes/material3.tokens.json',
  primitive: 'packages/tokens/tokens/primitive.tokens.json',
  semantic: 'packages/tokens/tokens/semantic.tokens.json',
  theme: 'packages/tokens/tokens/themes/onmars.tokens.json',
});

const onmarsBaseSources = Object.freeze([
  'tokens/primitive.tokens.json',
  'tokens/themes/onmars.tokens.json',
  'tokens/semantic.tokens.json',
  'tokens/component/button.tokens.json',
]);

const material3PrefixSources = Object.freeze([
  'tokens/primitive.tokens.json',
  'tokens/themes/onmars.tokens.json',
  'tokens/themes/material3.tokens.json',
  'tokens/semantic.tokens.json',
  'tokens/semantic/material3.tokens.json',
]);

const validMaterial3ComponentSources = Object.freeze([
  'tokens/component/button.tokens.json',
  'tokens/component/button.material3.tokens.json',
]);

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const token = (value, description) => ({
  $value: value,
  ...(description === undefined ? {} : { $description: description }),
});

function semanticTokens(extraGroups = {}) {
  return json({
    ki: {
      surface: {
        $type: 'color',
        base: token('{ki.theme.surface}', 'Default application surface'),
      },
      motion: {
        duration: {
          $type: 'duration',
          fast: token('{ki.duration.fast}', 'Fast interaction duration'),
        },
      },
      ...extraGroups,
    },
  });
}

function styleDictionaryConfig(material3ComponentSources = validMaterial3ComponentSources) {
  const material3Sources = [...material3PrefixSources, ...material3ComponentSources];
  return [
    `const onmarsBase = ${JSON.stringify(onmarsBaseSources)};`,
    `const material3Base = ${JSON.stringify(material3Sources)};`,
    '',
    'export const lightConfig = { source: onmarsBase };',
    'export const darkConfig = {',
    '  include: onmarsBase,',
    "  source: ['tokens/modes/dark.tokens.json'],",
    '};',
    'export const material3LightConfig = { source: material3Base };',
    'export const material3DarkConfig = {',
    "  source: [...material3Base, 'tokens/modes/material3.dark.tokens.json'],",
    '};',
    '',
  ].join('\n');
}

function validFixtureFiles() {
  return {
    [paths.primitive]: json({
      ki: {
        color: {
          $type: 'color',
          brand: token('#123456'),
          'brand-alt': token('#654321'),
        },
        duration: {
          $type: 'duration',
          fast: token('120ms'),
        },
      },
    }),
    [paths.theme]: json({
      ki: {
        theme: {
          $type: 'color',
          surface: token('{ki.color.brand}'),
        },
      },
    }),
    [paths.materialTheme]: json({
      ki: {
        theme: {
          surface: token('{ki.color.brand-alt}'),
        },
      },
    }),
    [paths.semantic]: semanticTokens(),
    [paths.materialSemantic]: json({
      ki: {
        surface: {
          base: token('{ki.theme.surface}'),
        },
      },
    }),
    [paths.component]: json({
      ki: {
        button: {
          background: {
            $type: 'color',
            ...token('{ki.surface.base}', 'Button background'),
          },
          'motion-duration': {
            $type: 'duration',
            ...token('{ki.motion.duration.fast}', 'Button interaction duration'),
          },
        },
      },
    }),
    [paths.componentOverride]: json({
      ki: {
        button: {
          background: token('{ki.surface.base}'),
        },
      },
    }),
    [paths.dark]: json({
      ki: {
        theme: {
          surface: token('{ki.color.brand-alt}'),
        },
      },
    }),
    [paths.materialDark]: json({
      ki: {
        theme: {
          surface: token('{ki.color.brand}'),
        },
      },
    }),
    [paths.css]: [
      ':host {',
      '  background: var(--ki-button-background);',
      '  transition-duration: var(--ki-button-motion-duration);',
      '}',
      '',
    ].join('\n'),
    [paths.config]: styleDictionaryConfig(),
  };
}

async function writeFixtureFile(root, relativePath, contents) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

async function createFixture(t, files = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-token-contract-'));
  t.after(() => rm(root, { force: true, recursive: true }));

  const fixtureFiles = { ...validFixtureFiles(), ...files };
  await Promise.all(
    Object.entries(fixtureFiles).map(([relativePath, contents]) =>
      writeFixtureFile(root, relativePath, contents),
    ),
  );
  return root;
}

function runTokenGate(root) {
  return spawnSync(process.execPath, [tokenGate], {
    cwd: root,
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME,
      LC_ALL: 'C',
      PATH: process.env.PATH,
    },
  });
}

function diagnostic(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function assertRejected(result, { code, filePath, offendingValue }) {
  const output = diagnostic(result);
  assert.notEqual(result.status, 0, output);
  assert.match(output, new RegExp(escapeRegExp(code), 'u'));
  assert.match(output, new RegExp(escapeRegExp(filePath), 'u'));
  assert.match(output, new RegExp(escapeRegExp(offendingValue), 'u'));
}

test('@spec:018-project-integrity-hardening S11 accepts four base-before-override compositions', async (t) => {
  const root = await createFixture(t);

  const result = runTokenGate(root);

  assert.equal(result.status, 0, diagnostic(result));
});

test('@spec:018-project-integrity-hardening S11 rejects an override before its component base', async (t) => {
  const root = await createFixture(t, {
    [paths.config]: styleDictionaryConfig([
      'tokens/component/button.material3.tokens.json',
      'tokens/component/button.tokens.json',
    ]),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'override-before-base',
    filePath: 'packages/tokens/style-dictionary.config.mjs',
    offendingValue: 'tokens/component/button.material3.tokens.json',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects an unresolved DTCG alias by file and path', async (t) => {
  const root = await createFixture(t, {
    [paths.semantic]: semanticTokens({
      unresolved: {
        $type: 'color',
        alias: token('{ki.color.undeclared}', 'Invalid unresolved alias'),
      },
    }),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'unresolved-reference',
    filePath: 'packages/tokens/tokens/semantic.tokens.json',
    offendingValue: 'ki.color.undeclared',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects an undeclared CSS token by file and custom-property name', async (t) => {
  const root = await createFixture(t, {
    [paths.css]: ':host { background: var(--ki-button-undeclared); }\n',
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'unresolved-css-token',
    filePath: 'packages/elements/src/components/ki-button/ki-button.css',
    offendingValue: '--ki-button-undeclared',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects a CSS motion literal by file and value', async (t) => {
  const root = await createFixture(t, {
    [paths.css]: [
      ':host {',
      '  background: var(--ki-button-background);',
      '  transition-duration: 120ms;',
      '}',
      '',
    ].join('\n'),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'hardcoded-motion-literal',
    filePath: 'packages/elements/src/components/ki-button/ki-button.css',
    offendingValue: '120ms',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects a visual literal outside the primitive layer', async (t) => {
  const root = await createFixture(t, {
    [paths.semantic]: semanticTokens({
      invalidMotion: {
        $type: 'duration',
        duration: token('120ms', 'Invalid literal duration'),
      },
    }),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'non-primitive-literal',
    filePath: 'packages/tokens/tokens/semantic.tokens.json',
    offendingValue: '120ms',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects direct primitive consumption in component CSS', async (t) => {
  const root = await createFixture(t, {
    [paths.css]: [
      ':host {',
      '  background: var(--ki-color-brand);',
      '  transition-duration: var(--ki-button-motion-duration);',
      '}',
      '',
    ].join('\n'),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'primitive-css-consumption',
    filePath: 'packages/elements/src/components/ki-button/ki-button.css',
    offendingValue: '--ki-color-brand',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects a reference to a higher token layer', async (t) => {
  const root = await createFixture(t, {
    [paths.semantic]: semanticTokens({
      invalidLayer: {
        $type: 'color',
        alias: token('{ki.button.background}', 'Invalid upward dependency'),
      },
    }),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'upward-reference',
    filePath: 'packages/tokens/tokens/semantic.tokens.json',
    offendingValue: 'ki.button.background',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects an alias cycle once with its canonical member', async (t) => {
  const root = await createFixture(t, {
    [paths.semantic]: semanticTokens({
      cycle: {
        $type: 'color',
        a: token('{ki.cycle.b}', 'Cycle A'),
        b: token('{ki.cycle.a}', 'Cycle B'),
      },
    }),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'circular-reference',
    filePath: 'packages/tokens/tokens/semantic.tokens.json',
    offendingValue: 'ki.cycle.a',
  });
});

test('@spec:018-project-integrity-hardening S11 rejects a public token without a description', async (t) => {
  const root = await createFixture(t, {
    [paths.semantic]: semanticTokens({
      undocumented: {
        $type: 'color',
        value: token('{ki.color.brand}'),
      },
    }),
  });

  const result = runTokenGate(root);

  assertRejected(result, {
    code: 'missing-public-description',
    filePath: 'packages/tokens/tokens/semantic.tokens.json',
    offendingValue: 'ki.undocumented.value',
  });
});
