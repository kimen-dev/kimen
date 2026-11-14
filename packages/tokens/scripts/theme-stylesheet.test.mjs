import assert from 'node:assert/strict';
import test from 'node:test';

import StyleDictionary from 'style-dictionary';

import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
} from '../style-dictionary.config.mjs';
import {
  combineSchemes,
  compositionDeclarations,
  renderBaseStylesheet,
  renderThemeStylesheet,
  themeOverrides,
} from './theme-stylesheet.mjs';

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

test('the base stylesheet declares the colour scheme and then every token on :root and on any themed subtree', () => {
  const css = renderBaseStylesheet(
    new Map([
      ['--ki-color-white', '#ffffff'],
      ['--ki-surface-s0', 'light-dark(var(--ki-color-white), #0a0a0a)'],
    ]),
  );

  assert.equal(
    css,
    [
      ':root {',
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

test('emitted stylesheets carry no comments', () => {
  const declarations = new Map([['--ki-a', '1px']]);

  assert.doesNotMatch(renderBaseStylesheet(declarations), /\/\*/u);
  assert.doesNotMatch(renderThemeStylesheet('material3', declarations), /\/\*/u);
});

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
  });
  assert.deepEqual(declarations.get('--ki-surface-s0'), {
    expression: 'var(--ki-color-black)',
    resolved: '#000000',
  });
  assert.deepEqual(declarations.get('--ki-border-hairline'), {
    expression: 'var(--ki-size-hairline) solid var(--ki-color-black-3)',
    resolved: '1px solid rgba(0, 0, 0, 0.03)',
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

function resolveAll(declarations, scheme) {
  const resolved = new Map();
  const resolve = (name) => {
    if (!resolved.has(name)) {
      resolved.set(
        name,
        pickScheme(declarations.get(name), scheme).replaceAll(
          /var\((--[a-z0-9-]+)\)/gu,
          (_, reference) => resolve(reference),
        ),
      );
    }
    return resolved.get(name);
  };
  for (const name of declarations.keys()) resolve(name);
  return resolved;
}

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
    for (const [scheme, expected] of Object.entries(schemes)) {
      const actual = resolveAll(emitted[theme], scheme);
      const mismatches = [...expected]
        .filter(([name, token]) => actual.get(name) !== token.resolved)
        .map(([name, token]) => `${name}: ${actual.get(name)} != ${token.resolved}`);
      assert.deepEqual(mismatches, [], `${theme} ${scheme}`);
    }
  }
});
