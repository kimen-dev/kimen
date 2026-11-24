import assert from 'node:assert/strict';
import test from 'node:test';

import StyleDictionary from 'style-dictionary';

import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
} from '../style-dictionary.config.mjs';
import { compositionDeclarations, MODES } from './theme-stylesheet.mjs';

const configs = Object.entries({
  lightConfig,
  darkConfig,
  material3LightConfig,
  material3DarkConfig,
});

// The emitted value format is part of the published token surface
// (public-api.json records every effective value), so a Style Dictionary
// upgrade must not change it silently. Style Dictionary 5.7 changed two
// predefined transforms of the `css` group: `color/css` now prints the raw
// alpha channel (0.10196078431372549 instead of 0.1) and `time/seconds` now
// also converts DTCG `duration` tokens (150ms becomes 0.15s).
async function transformedValues(config) {
  const platform = config.platforms.css;
  const dictionary = new StyleDictionary({
    log: { verbosity: 'silent' },
    hooks: config.hooks,
    tokens: {
      ki: {
        translucent: { $type: 'color', $value: '#3a3a3a1a' },
        opaque: { $type: 'color', $value: '#13B9EC' },
        nearlyOpaque: { $type: 'color', $value: '#13b9ecfe' },
        delay: { $type: 'duration', $value: '150ms' },
        none: { $type: 'duration', $value: '0ms' },
        derived: { $type: 'color', $value: 'color-mix(in srgb, {ki.opaque} 12%, transparent)' },
        aliasOfDerived: { $type: 'color', $value: '{ki.derived}' },
      },
    },
    platforms: {
      css: { transformGroup: platform.transformGroup, transforms: platform.transforms, prefix: '' },
    },
  });
  const tokens = await dictionary.exportPlatform('css');
  return Object.fromEntries(Object.entries(tokens.ki).map(([name, token]) => [name, token.$value]));
}

for (const [name, config] of configs) {
  test(`${name} keeps the two-decimal rgba() alpha for translucent colours`, async () => {
    const values = await transformedValues(config);
    assert.equal(values.translucent, 'rgba(58, 58, 58, 0.1)');
    assert.equal(values.nearlyOpaque, 'rgba(19, 185, 236, 1)');
  });

  test(`${name} keeps opaque colours as lowercase hex`, async () => {
    const values = await transformedValues(config);
    assert.equal(values.opaque, '#13b9ec');
  });

  test(`${name} keeps duration tokens in their authored milliseconds`, async () => {
    const values = await transformedValues(config);
    assert.equal(values.delay, '150ms');
    assert.equal(values.none, '0ms');
  });

  // A translucent variant of a ramp step (S15) is authored as a colour mix of
  // that step, so the stylesheet recomputes it wherever the step is
  // reassigned. Its resolved value — what the token reference prints and
  // every alias resolves to — is the same rgba() a literal would give.
  test(`${name} resolves a colour mix of a ramp step to its rgba() value`, async () => {
    const values = await transformedValues(config);
    assert.equal(values.derived, 'rgba(19, 185, 236, 0.12)');
    assert.equal(values.aliasOfDerived, 'rgba(19, 185, 236, 0.12)');
  });
}

test('a colour mix keeps its reference to the ramp step in the emitted declaration', async () => {
  const dictionary = await new StyleDictionary({
    log: { verbosity: 'silent' },
    hooks: lightConfig.hooks,
    tokens: {
      ki: {
        step: { $type: 'color', $value: '#bc4c26' },
        alpha: { $type: 'color', $value: 'color-mix(in srgb, {ki.step} 12%, transparent)' },
      },
    },
    platforms: { css: { transformGroup: lightConfig.platforms.css.transformGroup, prefix: '' } },
  }).getPlatformTokens('css');
  const declarations = compositionDeclarations(dictionary);

  assert.deepEqual(declarations.get('--ki-alpha'), {
    expression: 'color-mix(in srgb, var(--ki-step) 12%, transparent)',
    resolved: 'rgba(188, 76, 38, 0.12)',
    inherited: false,
  });
});

for (const value of [
  'color-mix(in oklch, {ki.step} 12%, transparent)',
  'color-mix(in srgb, {ki.step} 12%, {ki.step})',
  'color-mix(in srgb, {ki.step} 12.5%, transparent)',
  'color-mix(in srgb, {ki.translucent} 12%, transparent)',
]) {
  test(`a colour mix the transform cannot resolve exactly fails the build: ${value}`, async () => {
    const dictionary = await new StyleDictionary({
      log: { verbosity: 'silent' },
      hooks: lightConfig.hooks,
      tokens: {
        ki: {
          step: { $type: 'color', $value: '#bc4c26' },
          translucent: { $type: 'color', $value: '#bc4c261f' },
          alpha: { $type: 'color', $value: value },
        },
      },
      platforms: { css: { transformGroup: lightConfig.platforms.css.transformGroup, prefix: '' } },
    }).getPlatformTokens('css');
    assert.throws(() => compositionDeclarations(dictionary), /--ki-alpha is a colour mix/u);
  });
}

// A mode's values are tokens of every composition (`--ki-<mode>-button-…`),
// so one composition per scheme covers every mode too.
test('onmars tertiary button tokens use the secondary role in every scheme and mode', async () => {
  const prefixes = ['--ki-', ...MODES.map((mode) => `--ki-${mode.name}-`)];

  for (const [scheme, config] of Object.entries({ light: lightConfig, dark: darkConfig })) {
    const dictionary = await new StyleDictionary(config).getPlatformTokens('css');
    const declarations = compositionDeclarations(dictionary);

    for (const prefix of prefixes) {
      const tertiary = `${prefix}button-tertiary-`;
      const secondary = `${prefix}button-secondary-`;
      for (const [name, token] of declarations) {
        if (!name.startsWith(tertiary)) continue;
        const counterpart = `${secondary}${name.slice(tertiary.length)}`;
        assert.deepEqual(token, declarations.get(counterpart), `${scheme}: ${name}`);
      }
    }
  }
});
