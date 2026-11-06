import assert from 'node:assert/strict';
import test from 'node:test';

import StyleDictionary from 'style-dictionary';

import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
} from '../style-dictionary.config.mjs';

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
}
