// @spec:041-token-deprecation
import assert from 'node:assert/strict';
import test from 'node:test';

import StyleDictionary from 'style-dictionary';

import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
  resolvedColorMix,
  sharedConfig,
  withDensity,
  withMode,
} from '../style-dictionary.config.mjs';
import { collectDeprecations } from './deprecation.mjs';
import {
  assertInheritedTokens,
  combineSchemes,
  compactTokenStylesheet,
  compositionDeclarations,
  DENSITIES,
  densityRules,
  isPrivateFoundation,
  layeredOverrides,
  MODES,
  renderBaseStylesheet,
  renderModeRules,
  renderThemeStylesheet,
  themeOverrides,
} from './theme-stylesheet.mjs';

test('private foundations: onmars v2 literals and the Material 3 text inks, nothing else', () => {
  assert.equal(isPrivateFoundation(['onmars-v2', 'palette']), true);
  assert.equal(isPrivateFoundation(['material3', 'text-ink']), true);
  assert.equal(isPrivateFoundation(['material3', 'palette']), false);
  assert.equal(isPrivateFoundation(['migrated', 'themes-onmars']), false);
});

test('the built stylesheets declare no private foundation', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const sheet of ['tokens.css', 'tokens.material3.css']) {
    const css = await readFile(new URL(`../dist/css/${sheet}`, import.meta.url), 'utf8');
    assert.doesNotMatch(css, /--ki-foundation-(?:onmars-v2|material3-text-ink)-/u, sheet);
  }
});

/** A composition as the emitter sees it: name -> emitted expression + resolved value. */
const composition = (entries) =>
  new Map(
    Object.entries(entries).map(([name, [expression, resolved]]) => [
      name,
      { expression, resolved: resolved ?? expression },
    ]),
  );

const primitives = {
  '--ki-color-white': ['#ffffff'],
  '--ki-color-black': ['#0a0a0a'],
  '--ki-color-black-3': ['rgba(0, 0, 0, 0.03)'],
  '--ki-color-white-3': ['rgba(255, 255, 255, 0.03)'],
  '--ki-size-hairline': ['1px'],
  '--ki-size-thick': ['2px'],
};

test('the shipped CSS compacts fixed foundations while keeping public and mode-dependent aliases', () => {
  const declarations = new Map([
    ['--ki-foundation-fixed', "'Label, Detail', serif"],
    ['--ki-foundation-mode', '#111111'],
    ['--ki-fg', 'var(--ki-foundation-mode)'],
    ['--ki-label-font', 'var(--ki-foundation-fixed)'],
    ['--ki-copy-font', 'var(--ki-label-font)'],
  ]);
  const modes = [{ mode: MODES[1], declarations: new Map([['--ki-foundation-mode', '#222222']]) }];
  const css = compactTokenStylesheet(renderBaseStylesheet(declarations, { modes }), {
    declarations,
    modes,
    inline: (name) => name.startsWith('--ki-foundation-'),
  });

  assert.match(css, /--ki-label-font:'Label, Detail',serif;/u);
  assert.match(css, /--ki-copy-font:var\(--ki-label-font\);/u);
  assert.match(css, /--ki-fg:var\(--ki-foundation-mode\);/u);
  assert.match(css, /--ki-foundation-mode:#222222;/u);
});

test('a disabled shadow emits a transparent list layer and retains aliases', async () => {
  const dictionary = await new StyleDictionary({
    ...lightConfig,
    source: [],
    tokens: {
      ki: {
        flat: { $type: 'shadow', $value: 'none' },
        'surface-shadow': { $type: 'shadow', $value: '{ki.flat}' },
        'legacy-flat': { $value: 'none' },
        'legacy-shadow': { $type: 'shadow', $value: '{ki.legacy-flat}' },
        'composed-shadow': {
          $type: 'shadow',
          $value: ['none', { offsetX: 0, offsetY: '2px', color: '#ffffff' }],
        },
        'fixture-disabled-border': { $type: 'border', $value: 'none' },
      },
    },
  }).getPlatformTokens('css');

  const declarations = compositionDeclarations(dictionary);

  assert.equal(declarations.get('--ki-flat').expression, '0 0 #0000');
  assert.equal(declarations.get('--ki-surface-shadow').expression, 'var(--ki-flat)');
  assert.equal(declarations.get('--ki-surface-shadow').resolved, '0 0 #0000');
  assert.equal(declarations.get('--ki-legacy-flat').expression, 'none');
  assert.equal(declarations.get('--ki-legacy-shadow').expression, '0 0 #0000');
  assert.equal(declarations.get('--ki-composed-shadow').expression, '0 0 #0000, 0 2px 0 #ffffff');
  assert.equal(declarations.get('--ki-fixture-disabled-border').expression, 'none');
});

test('the flat Material 3 video control emits a transparent shadow layer in both schemes', async () => {
  const [light, dark] = await Promise.all(
    [material3LightConfig, material3DarkConfig].map(async (config) =>
      compositionDeclarations(await new StyleDictionary(config).getPlatformTokens('css')),
    ),
  );

  assert.equal(combineSchemes({ light, dark }).get('--ki-video-play-shadow'), '0 0 #0000');
});

test('a token with the same expression in both schemes is emitted once, unchanged', () => {
  const light = composition({ ...primitives, '--ki-space-md': ['1rem'] });
  const dark = composition({ ...primitives, '--ki-space-md': ['1rem'] });

  const combined = combineSchemes({ light, dark });

  assert.equal(combined.get('--ki-space-md'), '1rem');
  assert.equal(combined.get('--ki-color-white'), '#ffffff');
  assert.deepEqual([...combined.keys()], [...light.keys()]);
});

test('a colour alias that differs by scheme becomes one light-dark() of both aliases', () => {
  const light = composition({
    ...primitives,
    '--ki-surface-s0': ['var(--ki-color-white)', '#ffffff'],
  });
  const dark = composition({
    ...primitives,
    '--ki-surface-s0': ['var(--ki-color-black)', '#0a0a0a'],
  });

  assert.equal(
    combineSchemes({ light, dark }).get('--ki-surface-s0'),
    'light-dark(var(--ki-color-white), var(--ki-color-black))',
  );
});

test('literal colours that differ by scheme become light-dark() of the literals', () => {
  const light = composition({ '--ki-a': ['#ffffff'], '--ki-b': ['rgba(0, 0, 0, 0.5)'] });
  const dark = composition({ '--ki-a': ['#000000'], '--ki-b': ['transparent'] });

  const combined = combineSchemes({ light, dark });

  assert.equal(combined.get('--ki-a'), 'light-dark(#ffffff, #000000)');
  assert.equal(combined.get('--ki-b'), 'light-dark(rgba(0, 0, 0, 0.5), transparent)');
});

test('a border keeps its geometry and wraps only the colour that differs', () => {
  const light = composition({
    ...primitives,
    '--ki-border-hairline': [
      'var(--ki-size-hairline) solid var(--ki-color-black-3)',
      '1px solid rgba(0, 0, 0, 0.03)',
    ],
  });
  const dark = composition({
    ...primitives,
    '--ki-border-hairline': [
      'var(--ki-size-hairline) solid var(--ki-color-white-3)',
      '1px solid rgba(255, 255, 255, 0.03)',
    ],
  });

  assert.equal(
    combineSchemes({ light, dark }).get('--ki-border-hairline'),
    'var(--ki-size-hairline) solid light-dark(var(--ki-color-black-3), var(--ki-color-white-3))',
  );
});

test('a multi-layer shadow wraps each differing colour and keeps commas inside rgba()', () => {
  const light = composition({
    ...primitives,
    '--ki-shadow': [
      '0px 1px 2px 0px var(--ki-color-black-3), 0px 2px 6px 2px rgba(0, 0, 0, 0.05)',
      '0px 1px 2px 0px rgba(0, 0, 0, 0.03), 0px 2px 6px 2px rgba(0, 0, 0, 0.05)',
    ],
  });
  const dark = composition({
    ...primitives,
    '--ki-shadow': [
      '0px 1px 2px 0px var(--ki-color-white-3), 0px 2px 6px 2px rgba(0, 0, 0, 0.12)',
      '0px 1px 2px 0px rgba(255, 255, 255, 0.03), 0px 2px 6px 2px rgba(0, 0, 0, 0.12)',
    ],
  });

  assert.equal(
    combineSchemes({ light, dark }).get('--ki-shadow'),
    '0px 1px 2px 0px light-dark(var(--ki-color-black-3), var(--ki-color-white-3)), 0px 2px 6px 2px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.12))',
  );
});

test('a composite whose geometry differs by scheme is rejected by name', () => {
  const light = composition({
    ...primitives,
    '--ki-border': ['var(--ki-size-hairline) solid var(--ki-color-black-3)', '1px solid x'],
  });
  const dark = composition({
    ...primitives,
    '--ki-border': ['var(--ki-size-thick) solid var(--ki-color-white-3)', '2px solid y'],
  });

  assert.throws(
    () => combineSchemes({ light, dark }),
    /--ki-border depends on the colour scheme through var\(--ki-size-hairline\) \/ var\(--ki-size-thick\), which is not a colour/u,
  );
});

test('a composite with a different number of components by scheme is rejected', () => {
  const light = composition({
    ...primitives,
    '--ki-shadow': ['0px 1px #ffffff', '0px 1px #ffffff'],
  });
  const dark = composition({
    ...primitives,
    '--ki-shadow': ['0px 1px #000000, 0px 2px #000000', '0px 1px #000000, 0px 2px #000000'],
  });

  assert.throws(
    () => combineSchemes({ light, dark }),
    /--ki-shadow has a different shape in the light and dark schemes/u,
  );
});

test('a non-colour token that differs by scheme is rejected: only colours can use light-dark()', () => {
  const light = composition({ '--ki-space-md': ['1rem'] });
  const dark = composition({ '--ki-space-md': ['2rem'] });

  assert.throws(
    () => combineSchemes({ light, dark }),
    /--ki-space-md depends on the colour scheme through 1rem \/ 2rem, which is not a colour/u,
  );
});

test('an alias to a non-colour token that differs by scheme is rejected', () => {
  const light = composition({
    ...primitives,
    '--ki-width': ['var(--ki-size-hairline)', '1px'],
  });
  const dark = composition({ ...primitives, '--ki-width': ['var(--ki-size-thick)', '2px'] });

  assert.throws(() => combineSchemes({ light, dark }), /--ki-width depends on the colour scheme/u);
});

test('an alias that resolves to a colour in one scheme only is rejected', () => {
  const light = composition({ ...primitives, '--ki-edge': ['var(--ki-color-white)', '#ffffff'] });
  const dark = composition({ ...primitives, '--ki-edge': ['none'] });

  assert.throws(() => combineSchemes({ light, dark }), /--ki-edge depends on the colour scheme/u);
});

test('both schemes must define exactly the same token names', () => {
  const light = composition({ '--ki-a': ['#ffffff'], '--ki-b': ['#ffffff'] });
  const dark = composition({ '--ki-a': ['#000000'] });

  assert.throws(
    () => combineSchemes({ light, dark }),
    /--ki-b is defined in the light scheme but not in the dark scheme/u,
  );
  assert.throws(
    () => combineSchemes({ light: dark, dark: light }),
    /--ki-b is defined in the dark scheme but not in the light scheme/u,
  );
});

test('a theme overrides only the tokens whose expression differs from the base theme', () => {
  const base = new Map([
    ['--ki-color-brand', '#845abe'],
    ['--ki-surface-s0', 'light-dark(var(--ki-color-white), var(--ki-color-black))'],
    ['--ki-button-bg', 'var(--ki-color-brand)'],
    ['--ki-space-md', '1rem'],
  ]);
  const theme = new Map([
    ['--ki-color-brand', '#6750a4'],
    ['--ki-surface-s0', 'var(--ki-color-white)'],
    ['--ki-button-bg', 'var(--ki-color-brand)'],
    ['--ki-space-md', '1rem'],
  ]);

  assert.deepEqual(
    [...themeOverrides({ base, theme })],
    [
      ['--ki-color-brand', '#6750a4'],
      // The base flips by scheme and the theme does not: the theme must say so,
      // or it would inherit a flip its own sources never declared.
      ['--ki-surface-s0', 'var(--ki-color-white)'],
    ],
  );
});

test('a theme must expose exactly the token names of the base theme', () => {
  const base = new Map([
    ['--ki-a', '1px'],
    ['--ki-b', '2px'],
  ]);

  assert.throws(
    () => themeOverrides({ base, theme: new Map([['--ki-a', '1px']]) }),
    /the theme does not define --ki-b/u,
  );
  assert.throws(
    () =>
      themeOverrides({
        base,
        theme: new Map([
          ['--ki-a', '1px'],
          ['--ki-b', '2px'],
          ['--ki-c', '3px'],
        ]),
      }),
    /the theme defines --ki-c, which the base theme does not/u,
  );
});

test('the base stylesheet declares the colour scheme as a zero-specificity default and then every token on :root and on any themed subtree', () => {
  const css = renderBaseStylesheet(
    new Map([
      ['--ki-color-white', '#ffffff'],
      ['--ki-surface-s0', 'light-dark(var(--ki-color-white), #0a0a0a)'],
    ]),
  );

  assert.equal(
    css,
    [
      // `:where()` keeps the default at zero specificity: any `color-scheme`
      // the host page declares for its document wins, in either order.
      ':where(:root) {',
      '  color-scheme: light dark;',
      '}',
      '',
      "[data-ki-color-scheme='light'] {",
      '  color-scheme: light;',
      '}',
      '',
      "[data-ki-color-scheme='dark'] {",
      '  color-scheme: dark;',
      '}',
      '',
      ':root,',
      ':where([data-ki-theme]) {',
      '  --ki-color-white: #ffffff;',
      '  --ki-surface-s0: light-dark(var(--ki-color-white), #0a0a0a);',
      '}',
      '',
    ].join('\n'),
  );
});

test('a theme stylesheet scopes its overrides to the themed root and to any themed subtree', () => {
  const css = renderThemeStylesheet('material3', new Map([['--ki-color-brand', '#6750a4']]));

  assert.equal(
    css,
    [
      ":root[data-ki-theme='material3'],",
      "[data-ki-theme='material3'] {",
      '  --ki-color-brand: #6750a4;',
      '}',
      '',
    ].join('\n'),
  );
});

test('emitted stylesheets carry no comments unless a token is deprecated', () => {
  const declarations = new Map([['--ki-a', '1px']]);

  assert.doesNotMatch(renderBaseStylesheet(declarations), /\/\*/u);
  assert.doesNotMatch(renderThemeStylesheet('material3', declarations), /\/\*/u);
});

const focusBorderDeprecation = new Map([
  [
    '--ki-input-focus-border',
    {
      reason: 'A focused field keeps its resting border and is marked by its focus ring.',
      since: '0.1.0',
      removal: '1.0.0',
      replacement: '--ki-input-focus-ring-color',
    },
  ],
]);
const ANNOTATION =
  '/* deprecated since 0.1.0, removed in 1.0.0: use --ki-input-focus-ring-color */';

test('S1 a deprecated declaration keeps its value and is annotated in both stylesheets', () => {
  const declarations = new Map([
    ['--ki-input-focus-border', 'var(--ki-outline-primary-high-em)'],
    ['--ki-input-focus-ring-color', 'var(--ki-outline-primary-high-em)'],
  ]);
  const options = { deprecations: focusBorderDeprecation };

  const base = renderBaseStylesheet(declarations, options);
  const theme = renderThemeStylesheet('material3', declarations, options);

  for (const css of [base, theme]) {
    assert.match(
      css,
      new RegExp(
        `^  --ki-input-focus-border: var\\(--ki-outline-primary-high-em\\); ${ANNOTATION.replaceAll('*', '\\*')}$`,
        'mu',
      ),
    );
    assert.match(css, /^ {2}--ki-input-focus-ring-color: var\(--ki-outline-primary-high-em\);$/mu);
  }
  // Removing the annotations gives back the stylesheet without deprecations.
  assert.equal(base.replace(` ${ANNOTATION}`, ''), renderBaseStylesheet(declarations));
});

test('S1 the published stylesheet annotates exactly the deprecated tokens', async () => {
  const dictionary = await new StyleDictionary({
    ...sharedConfig,
    log: { verbosity: 'silent' },
  }).getPlatformTokens('css');
  const deprecations = collectDeprecations(dictionary.allTokens);

  const { reason, since, removal, replacement } = deprecations.get('--ki-input-focus-border') ?? {};
  assert.match(reason ?? '', /focus ring/u);
  assert.deepEqual(
    { since, removal, replacement },
    { since: '0.1.0', removal: '1.0.0', replacement: '--ki-input-focus-ring-color' },
  );
  for (const deprecation of deprecations.values()) {
    assert.equal(deprecation.since, '0.1.0');
    assert.equal(deprecation.removal, '1.0.0');
  }
  const css = renderBaseStylesheet(compositionDeclarationsOf(dictionary), { deprecations });
  assert.match(
    css,
    new RegExp(`^  --ki-input-focus-border: [^;]+; ${ANNOTATION.replaceAll('*', '\\*')}$`, 'mu'),
  );
  const annotated = [...css.matchAll(/^ {2}(--ki-[\w-]+): [^;]+; \/\* deprecated since /gmu)];
  assert.deepEqual(annotated.map((match) => match[1]).sort(), [...deprecations.keys()].sort());
});

/** One composition's expressions, as build.mjs hands them to the renderer. */
const compositionDeclarationsOf = (dictionary) =>
  new Map(
    [...compositionDeclarations(dictionary)].map(([name, { expression }]) => [name, expression]),
  );

test('a stylesheet with nothing to declare, or an unsafe theme name, is rejected', () => {
  assert.throws(() => renderBaseStylesheet(new Map()), /no tokens to declare/u);
  assert.throws(
    () => renderThemeStylesheet('material3', new Map()),
    /theme material3 does not differ from the base theme/u,
  );
  assert.throws(
    () => renderThemeStylesheet("x'] , *", new Map([['--ki-a', '1px']])),
    /unsupported theme name/u,
  );
});

test('a composition is read from Style Dictionary with references kept and descriptions dropped', async () => {
  const dictionary = await new StyleDictionary({
    log: { verbosity: 'silent' },
    hooks: lightConfig.hooks,
    tokens: {
      ki: {
        color: {
          black: { $type: 'color', $value: '#000000', $description: 'Raw black.' },
          'black-3': { $type: 'color', $value: '#00000008' },
        },
        size: { hairline: { $type: 'dimension', $value: '1px' } },
        density: {
          scale: {
            $type: 'number',
            $value: 1,
            $extensions: { 'dev.kimen': { inherit: 'document' } },
          },
        },
        surface: { $type: 'color', s0: { $value: '{ki.color.black}', $description: 'Page.' } },
        border: {
          hairline: {
            $type: 'border',
            $value: { color: '{ki.color.black-3}', width: '{ki.size.hairline}', style: 'solid' },
          },
        },
      },
    },
    platforms: { css: { transformGroup: lightConfig.platforms.css.transformGroup, prefix: '' } },
  }).getPlatformTokens('css');

  const declarations = compositionDeclarations(dictionary);

  assert.deepEqual(declarations.get('--ki-color-black'), {
    expression: '#000000',
    resolved: '#000000',
    inherited: false,
  });
  assert.deepEqual(declarations.get('--ki-surface-s0'), {
    expression: 'var(--ki-color-black)',
    resolved: '#000000',
    inherited: false,
  });
  assert.deepEqual(declarations.get('--ki-border-hairline'), {
    expression: 'var(--ki-size-hairline) solid var(--ki-color-black-3)',
    resolved: '1px solid rgba(0, 0, 0, 0.03)',
    inherited: false,
  });
  // A token marked as inherited from the document says so.
  assert.deepEqual(declarations.get('--ki-density-scale'), {
    expression: '1',
    resolved: '1',
    inherited: true,
  });
});

test('two tokens that compile to the same custom property are rejected', () => {
  const token = (name) => ({ name, $value: '1px', original: { $value: '1px' }, path: [name] });

  assert.throws(
    () =>
      compositionDeclarations({
        allTokens: [token('ki-a'), token('ki-a')],
        tokens: {},
        tokenMap: new Map(),
        unfilteredTokens: {},
        unfilteredAllTokens: [],
        unfilteredTokenMap: new Map(),
      }),
    /--ki-a is produced by more than one token/u,
  );
});

// The refactor guard for the real sources. Each composition is what Style
// Dictionary resolves on its own for one theme x scheme; the stylesheets merge
// four of them into two rules. Resolving the MERGED expressions the way a
// browser does — theme overrides over the base declarations, `light-dark()`
// picked by scheme, `var()` substituted — must give back every composition's
// own value, for every token. An emitter that wrapped the wrong component,
// dropped an override or reordered a scheme pair fails here by token name.
function pickScheme(value, scheme) {
  let result = '';
  let cursor = 0;
  for (;;) {
    const start = value.indexOf('light-dark(', cursor);
    if (start === -1) return result + value.slice(cursor);
    let depth = 0;
    let comma = -1;
    let end = start + 'light-dark'.length;
    for (; end < value.length; end += 1) {
      if (value[end] === '(') depth += 1;
      else if (value[end] === ')') {
        depth -= 1;
        if (depth === 0) break;
      } else if (value[end] === ',' && depth === 1 && comma === -1) comma = end;
    }
    const branch =
      scheme === 'light'
        ? value.slice(start + 'light-dark('.length, comma)
        : value.slice(comma + 1, end);
    result += value.slice(cursor, start) + pickScheme(branch.trim(), scheme);
    cursor = end + 1;
  }
}

// A translucent ramp variant (S15) is a colour mix of its step: once its step
// is substituted, it is the rgba() Style Dictionary resolved for it.
function resolveAll(declarations, scheme) {
  const resolved = new Map();
  const resolve = (name) => {
    if (!resolved.has(name)) {
      resolved.set(
        name,
        resolvedColorMix(
          pickScheme(declarations.get(name), scheme).replaceAll(
            /var\((--[a-z0-9-]+)\)/gu,
            (_, reference) => resolve(reference),
          ),
        ),
      );
    }
    return resolved.get(name);
  };
  for (const name of declarations.keys()) resolve(name);
  return resolved;
}

// Style Dictionary resolves DTCG aliases. The onmars v1 compatibility
// expressions still contain CSS references, which the browser resolves on
// the theme root. Resolve those against the independent source composition.
const resolveCompositionValues = (composition, scheme) =>
  resolveAll(new Map([...composition].map(([name, { resolved }]) => [name, resolved])), scheme);

test('the emitted stylesheets resolve to the Style Dictionary value of every token in every theme and scheme', async () => {
  const read = async (config) =>
    compositionDeclarations(
      await new StyleDictionary({ ...config, log: { verbosity: 'silent' } }).getPlatformTokens(
        'css',
      ),
    );
  const compositions = {
    onmars: { light: await read(lightConfig), dark: await read(darkConfig) },
    material3: { light: await read(material3LightConfig), dark: await read(material3DarkConfig) },
  };
  const base = combineSchemes(compositions.onmars);
  const overrides = themeOverrides({ base, theme: combineSchemes(compositions.material3) });
  const emitted = { onmars: base, material3: new Map([...base, ...overrides]) };

  assert.ok(base.size > 1000, 'the default theme publishes its full token set');
  assert.ok(overrides.size < base.size, 'a theme emits fewer declarations than the base');

  for (const [theme, schemes] of Object.entries(compositions)) {
    for (const [scheme, composition] of Object.entries(schemes)) {
      const expected = resolveCompositionValues(composition, scheme);
      const actual = resolveAll(emitted[theme], scheme);
      const mismatches = [...expected]
        .filter(([name, value]) => actual.get(name) !== value)
        .map(([name, value]) => `${name}: ${actual.get(name)} != ${value}`);
      assert.deepEqual(mismatches, [], `${theme} ${scheme}`);
    }
  }
});

// Modes (specs 043/044). A mode is a reassignment of part of the token set
// that applies on top of a theme. The stylesheets emit, per mode, only what
// the cascade below it does not already produce.

test('a mode emits only the tokens whose expression differs from what the lower layers produce', () => {
  const base = new Map([
    ['--ki-a', '#000000'],
    ['--ki-b', 'var(--ki-a)'],
    ['--ki-c', '1px'],
  ]);
  const theme = new Map([['--ki-b', '#111111']]);
  const target = new Map([
    ['--ki-a', '#000000'],
    ['--ki-b', 'var(--ki-c)'],
    ['--ki-c', '1px'],
  ]);

  assert.deepEqual([...layeredOverrides({ target, layers: [base] })], [['--ki-b', 'var(--ki-c)']]);
  // The theme already moved --ki-b; the mode must say it again above the theme.
  assert.deepEqual(
    [...layeredOverrides({ target, layers: [base, theme] })],
    [['--ki-b', 'var(--ki-c)']],
  );
  // Nothing to say when the lower layers already produce the target.
  assert.deepEqual(
    [
      ...layeredOverrides({
        target: new Map([...base, ['--ki-b', '#111111']]),
        layers: [base, theme],
      }),
    ],
    [],
  );
});

test('a mode target must expose exactly the token names of the base layer', () => {
  const base = new Map([['--ki-a', '#000000']]);
  assert.throws(
    () => layeredOverrides({ target: new Map(), layers: [base] }),
    /does not define --ki-a/u,
  );
  assert.throws(
    () => layeredOverrides({ target: new Map([...base, ['--ki-z', '1px']]), layers: [base] }),
    /--ki-z, which the base layer does not/u,
  );
});

test('the modes are reduced transparency, which more contrast also activates, then more contrast', () => {
  assert.deepEqual(
    MODES.map(({ name, media, activations }) => [name, media, activations]),
    [
      [
        'reduced-transparency',
        '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
        ["[data-ki-transparency='reduce']", "[data-ki-contrast='more']"],
      ],
      ['contrast-more', '(prefers-contrast: more)', ["[data-ki-contrast='more']"]],
    ],
  );
});

test('a default-theme mode applies under its media query and under its declaration, on the root and on every theme root', () => {
  const contrast = MODES.find((mode) => mode.name === 'contrast-more');
  const css = renderModeRules(
    contrast,
    new Map([['--ki-outline-control', 'var(--ki-outline-strong)']]),
  );

  assert.equal(
    css,
    [
      '@media (prefers-contrast: more) {',
      '  :root,',
      '  :where([data-ki-theme]) {',
      '    --ki-outline-control: var(--ki-outline-strong);',
      '  }',
      '}',
      '',
      // Same specificity as the default rule it follows: `:where()` wraps
      // the declaration, so a theme override still outranks the mode and a
      // theme re-asserts its own mode values in its own stylesheet.
      ":root:where([data-ki-contrast='more']),",
      ":where([data-ki-theme]:is([data-ki-contrast='more'])),",
      ":where(:is(:root, [data-ki-theme]):is([data-ki-contrast='more']) [data-ki-theme]) {",
      '  --ki-outline-control: var(--ki-outline-strong);',
      '}',
      '',
    ].join('\n'),
  );
});

test('a theme re-asserts its mode values above its own overrides', () => {
  const transparency = MODES.find((mode) => mode.name === 'reduced-transparency');
  const css = renderModeRules(transparency, new Map([['--ki-blur', '0px']]), 'material3');

  assert.equal(
    css,
    [
      '@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {',
      "  :root[data-ki-theme='material3'],",
      "  [data-ki-theme='material3'] {",
      '    --ki-blur: 0px;',
      '  }',
      '}',
      '',
      ":root[data-ki-theme='material3']:where([data-ki-transparency='reduce'], [data-ki-contrast='more']),",
      "[data-ki-theme='material3']:where([data-ki-transparency='reduce'], [data-ki-contrast='more']),",
      "[data-ki-theme='material3']:where(:is(:root, [data-ki-theme]):is([data-ki-transparency='reduce'], [data-ki-contrast='more']) *) {",
      '  --ki-blur: 0px;',
      '}',
      '',
    ].join('\n'),
  );
});

test('a mode with nothing to say renders nothing, and the stylesheets append the modes after their own rule', () => {
  const [transparency, contrast] = MODES;
  assert.equal(renderModeRules(contrast, new Map()), '');

  const base = renderBaseStylesheet(new Map([['--ki-a', '1px']]), {
    modes: [
      { mode: transparency, declarations: new Map([['--ki-a', '2px']]) },
      { mode: contrast, declarations: new Map() },
    ],
  });
  assert.ok(base.endsWith(renderModeRules(transparency, new Map([['--ki-a', '2px']]))));
  assert.doesNotMatch(base, /@media \(prefers-contrast: more\) \{/u);

  const theme = renderThemeStylesheet('material3', new Map([['--ki-a', '3px']]), {
    modes: [{ mode: contrast, declarations: new Map([['--ki-a', '4px']]) }],
  });
  assert.ok(theme.startsWith(":root[data-ki-theme='material3'],\n[data-ki-theme='material3'] {"));
  assert.ok(theme.endsWith(renderModeRules(contrast, new Map([['--ki-a', '4px']]), 'material3')));
});

test('under every mode the emitted stylesheets resolve to the Style Dictionary value of every token in every theme and scheme', async () => {
  const read = async (config) =>
    compositionDeclarations(
      await new StyleDictionary({ ...config, log: { verbosity: 'silent' } }).getPlatformTokens(
        'css',
      ),
    );
  const configs = {
    onmars: { light: lightConfig, dark: darkConfig },
    material3: { light: material3LightConfig, dark: material3DarkConfig },
  };
  const combined = async (theme, mode) =>
    combineSchemes({
      light: await read(mode ? withMode(configs[theme].light, mode) : configs[theme].light),
      dark: await read(mode ? withMode(configs[theme].dark, mode) : configs[theme].dark),
    });

  const base = await combined('onmars');
  const material3 = themeOverrides({ base, theme: await combined('material3') });
  const baseLayers = [base];
  const themeLayers = [];
  const emitted = new Map();
  for (const mode of MODES) {
    const baseMode = layeredOverrides({
      target: await combined('onmars', mode.name),
      layers: baseLayers,
    });
    baseLayers.push(baseMode);
    const themeMode = layeredOverrides({
      target: await combined('material3', mode.name),
      layers: [...baseLayers, material3, ...themeLayers],
    });
    themeLayers.push(themeMode);
    emitted.set(mode.name, {
      onmars: new Map(baseLayers.flatMap((layer) => [...layer])),
      material3: new Map([...baseLayers, material3, ...themeLayers].flatMap((layer) => [...layer])),
    });
  }

  assert.ok(emitted.get('contrast-more').onmars.size === base.size);
  for (const mode of MODES) {
    for (const theme of ['onmars', 'material3']) {
      for (const scheme of ['light', 'dark']) {
        const composition = await read(withMode(configs[theme][scheme], mode.name));
        const expected = resolveCompositionValues(composition, scheme);
        const actual = resolveAll(emitted.get(mode.name)[theme], scheme);
        const mismatches = [...expected]
          .filter(([name, value]) => actual.get(name) !== value)
          .map(([name, value]) => `${name}: ${actual.get(name)} != ${value}`);
        assert.deepEqual(mismatches, [], `${mode.name} ${theme} ${scheme}`);
      }
    }
  }
});

test('the two mode files reassign disjoint token sets, so they compose in any combination', async () => {
  const { readFile } = await import('node:fs/promises');
  const paths = (tree, prefix = []) =>
    Object.entries(tree).flatMap(([key, value]) => {
      if (key.startsWith('$') || value === null || typeof value !== 'object') return [];
      return '$value' in value ? [[...prefix, key].join('.')] : paths(value, [...prefix, key]);
    });
  const read = async (name) =>
    paths(
      JSON.parse(
        await readFile(new URL(`../tokens/modes/${name}.tokens.json`, import.meta.url), 'utf8'),
      ),
    );
  const transparency = new Set(await read('reduced-transparency'));
  const contrast = await read('contrast-more');

  assert.ok(transparency.size > 0 && contrast.length > 0);
  assert.deepEqual(
    contrast.filter((path) => transparency.has(path)),
    [],
  );
});

// Density (spec 045): three tokens inherited from the document root, consumed
// by component CSS, set on any element by a density declaration (the target
// minimum joined the other two with touch, 045 Amendment A1).
const inheritedTokens = new Set([
  '--ki-density-control-offset',
  '--ki-density-space-scale',
  '--ki-density-target-min',
]);

test('document-inherited tokens are declared once on :root, never on a theme root, then each density level', () => {
  const css = renderBaseStylesheet(
    new Map([
      ['--ki-space-md', '0.5rem'],
      ['--ki-density-control-offset', '0rem'],
      ['--ki-density-space-scale', '1'],
    ]),
    {
      inherited: inheritedTokens,
      densities: [
        {
          level: 'compact',
          declarations: new Map([
            ['--ki-density-control-offset', '-0.5rem'],
            ['--ki-density-space-scale', '0.75'],
          ]),
        },
        {
          level: 'default',
          declarations: new Map([
            ['--ki-density-control-offset', '0rem'],
            ['--ki-density-space-scale', '1'],
          ]),
        },
      ],
    },
  );

  assert.ok(
    css.endsWith(
      [
        ':root,',
        ':where([data-ki-theme]) {',
        '  --ki-space-md: 0.5rem;',
        '}',
        '',
        // A theme root does not redeclare them, so a themed region nested in
        // a compact region stays compact: the nearest declaration wins by
        // plain inheritance.
        ':root {',
        '  --ki-density-control-offset: 0rem;',
        '  --ki-density-space-scale: 1;',
        '}',
        '',
        "[data-ki-density='compact'] {",
        '  --ki-density-control-offset: -0.5rem;',
        '  --ki-density-space-scale: 0.75;',
        '}',
        '',
        "[data-ki-density='default'] {",
        '  --ki-density-control-offset: 0rem;',
        '  --ki-density-space-scale: 1;',
        '}',
        '',
      ].join('\n'),
    ),
    css,
  );
});

test('a document-inherited token is one nothing aliases, and no theme or mode reassigns it or what it references', () => {
  const base = new Map([
    ['--ki-a', '1px'],
    ['--ki-density-control-offset', 'var(--ki-a)'],
    ['--ki-density-space-scale', '1'],
    ['--ki-density-target-min', '24px'],
  ]);
  assert.doesNotThrow(() =>
    assertInheritedTokens({ declarations: base, inherited: inheritedTokens }),
  );
  assert.throws(
    () =>
      assertInheritedTokens({
        declarations: new Map([...base, ['--ki-b', 'calc(var(--ki-density-space-scale) * 2px)']]),
        inherited: inheritedTokens,
      }),
    /--ki-b aliases --ki-density-space-scale/u,
  );
  assert.throws(
    () =>
      assertInheritedTokens({
        declarations: base,
        inherited: inheritedTokens,
        overrides: new Map([['--ki-density-space-scale', '0.9']]),
        label: 'material3',
      }),
    /material3 reassigns --ki-density-space-scale, which is inherited from the document/u,
  );
  assert.throws(
    () =>
      assertInheritedTokens({
        declarations: base,
        inherited: inheritedTokens,
        overrides: new Map([['--ki-a', '2px']]),
        label: 'contrast-more',
      }),
    /contrast-more reassigns --ki-a, which a token inherited from the document references/u,
  );
});

test('every density rule declares every density token a level changes, so the nearest declaration wins whatever it nests in', () => {
  const base = new Map([
    ['--ki-space-md', '0.5rem'],
    ['--ki-density-control-offset', 'var(--ki-space-zero)'],
    ['--ki-density-space-scale', 'var(--ki-scale-unit)'],
    ['--ki-density-target-min', 'var(--ki-size-target-min)'],
  ]);
  const rules = densityRules(
    [
      {
        level: 'compact',
        declarations: new Map([
          ['--ki-density-control-offset', 'var(--ki-space-minus-md)'],
          ['--ki-density-space-scale', 'var(--ki-scale-compact)'],
        ]),
      },
      {
        level: 'touch',
        declarations: new Map([
          ['--ki-density-control-offset', 'var(--ki-space-xs)'],
          ['--ki-density-target-min', 'var(--ki-size-target-touch)'],
        ]),
      },
    ],
    base,
  );

  assert.deepEqual(
    rules.map(({ level, declarations }) => [level, [...declarations]]),
    [
      [
        'compact',
        [
          ['--ki-density-control-offset', 'var(--ki-space-minus-md)'],
          ['--ki-density-space-scale', 'var(--ki-scale-compact)'],
          ['--ki-density-target-min', 'var(--ki-size-target-min)'],
        ],
      ],
      [
        'touch',
        [
          ['--ki-density-control-offset', 'var(--ki-space-xs)'],
          ['--ki-density-space-scale', 'var(--ki-scale-unit)'],
          ['--ki-density-target-min', 'var(--ki-size-target-touch)'],
        ],
      ],
      [
        'default',
        [
          ['--ki-density-control-offset', 'var(--ki-space-zero)'],
          ['--ki-density-space-scale', 'var(--ki-scale-unit)'],
          ['--ki-density-target-min', 'var(--ki-size-target-min)'],
        ],
      ],
    ],
  );
});

test('the shipped density levels change the inherited tokens and nothing else', async () => {
  const read = async (config) =>
    compositionDeclarations(
      await new StyleDictionary({ ...config, log: { verbosity: 'silent' } }).getPlatformTokens(
        'css',
      ),
    );
  const light = await read(lightConfig);
  const compact = await read(withDensity(lightConfig, 'compact'));
  const touch = await read(withDensity(lightConfig, 'touch'));
  const inherited = new Set(
    [...light].filter(([, token]) => token.inherited).map(([name]) => name),
  );

  assert.deepEqual([...inherited].sort(), [...inheritedTokens].sort());
  assert.deepEqual(DENSITIES, ['compact', 'touch']);
  const changed = (level) =>
    [...level]
      .filter(([name, token]) => light.get(name).expression !== token.expression)
      .map(([name]) => name)
      .sort();
  assert.deepEqual(changed(compact), ['--ki-density-control-offset', '--ki-density-space-scale']);
  assert.equal(compact.get('--ki-density-control-offset').resolved, '-0.5rem');
  assert.equal(compact.get('--ki-density-space-scale').resolved, '0.75');
  // Touch (045 A1): one +4px step and 44 x 44 targets; spacing stays default.
  assert.deepEqual(changed(touch), ['--ki-density-control-offset', '--ki-density-target-min']);
  assert.equal(touch.get('--ki-density-control-offset').resolved, '0.25rem');
  assert.equal(touch.get('--ki-density-space-scale').resolved, '1');
  assert.equal(touch.get('--ki-density-target-min').resolved, '44px');
  assert.equal(light.get('--ki-density-target-min').resolved, '24px');
});
