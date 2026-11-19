// Kimen tokens: DTCG sources → CSS custom properties (constitution Art. VI).
// Layers: primitive → theme (onmars is the default theme) → semantic →
// component. This file declares the four token COMPOSITIONS (theme × scheme)
// and how their values are transformed; ./build.mjs merges them into the
// published stylesheets (see ./scripts/theme-stylesheet.mjs for the emitted
// shape). Run via ./build.mjs.
import { readdirSync } from 'node:fs';

import StyleDictionary from 'style-dictionary';
import { transformGroups, transforms } from 'style-dictionary/enums';

// Kimen owns the value format of its CSS sheets instead of inheriting it from
// Style Dictionary's predefined `css` transform group: every emitted value is
// part of the published token surface (public-api.json), and Style Dictionary
// 5.7 changed two of that group's transforms without a major version.
//   - `color/css` started printing the raw alpha channel
//     (`rgba(58, 58, 58, 0.10196078431372549)` for `#3a3a3a1a`). Kimen keeps
//     the two-decimal alpha (`0.1`), the percentage those 8-bit hex sources
//     approximate (0x1a ≈ 10%); every alpha the sources use today rounds back
//     to the same 8-bit value either way. Opaque colours stay lowercase hex.
//   - `time/seconds` started converting DTCG `duration` tokens too
//     (`150ms` → `0.15s`). Kimen keeps durations in their authored unit; the
//     transform still applies to legacy `time` tokens (there are none today).
// Both are pinned by scripts/style-dictionary-config.test.mjs.
const KIMEN_CSS_GROUP = 'kimen/css';
const KIMEN_COLOR_CSS = 'kimen/color/css';
const KIMEN_TIME_SECONDS = 'kimen/time/seconds';
const predefined = StyleDictionary.hooks.transforms;
const colorCss = predefined[transforms.colorCss];
const colorRgb = predefined[transforms.colorRgb];
const colorHex = predefined[transforms.colorHex];
const timeSeconds = predefined[transforms.timeSeconds];

const kimenCssHooks = {
  transforms: {
    [KIMEN_COLOR_CSS]: {
      type: colorCss.type,
      filter: colorCss.filter,
      // color/rgb is rgba() with a two-decimal alpha unless the colour is
      // fully opaque, which is exactly when color/hex yields #rrggbb.
      transform: (token, platform, options) => {
        const rgb = colorRgb.transform(token, platform, options);
        return rgb.startsWith('rgba(') ? rgb : colorHex.transform(token, platform, options);
      },
    },
    [KIMEN_TIME_SECONDS]: {
      ...timeSeconds,
      filter: (token, options) => (options.usesDtcg ? token.$type : token.type) === 'time',
    },
  },
  transformGroups: {
    [KIMEN_CSS_GROUP]: StyleDictionary.hooks.transformGroups[transformGroups.css].map((name) => {
      if (name === transforms.colorCss) return KIMEN_COLOR_CSS;
      if (name === transforms.timeSeconds) return KIMEN_TIME_SECONDS;
      return name;
    }),
  },
};

const comparePath = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const componentDirectory = new URL('./tokens/component/', import.meta.url);
const componentSources = readdirSync(componentDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.tokens.json'))
  .map((entry) => `tokens/component/${entry.name}`)
  .sort(comparePath);
const componentBaseLayers = componentSources.filter(
  (sourcePath) => !sourcePath.endsWith('.material3.tokens.json'),
);
const material3ComponentOverrides = componentSources.filter((sourcePath) =>
  sourcePath.endsWith('.material3.tokens.json'),
);
const componentBases = new Set(componentBaseLayers);

for (const overridePath of material3ComponentOverrides) {
  const basePath = overridePath.replace('.material3.tokens.json', '.tokens.json');
  if (!componentBases.has(basePath)) {
    throw new Error(`Component token override has no base source: ${overridePath}`);
  }
}

const ONMARS_FOUNDATION = ['tokens/primitive.tokens.json', 'tokens/themes/onmars.tokens.json'];
const ONMARS_SEMANTIC = ['tokens/semantic.tokens.json'];
// The material3 layer only overrides tokens the base layers already define
// (theme over onmars theme, semantic over semantic, component over component).
const MATERIAL3_OVERRIDES = [
  'tokens/themes/material3.tokens.json',
  'tokens/semantic/material3.tokens.json',
  ...material3ComponentOverrides,
];

// Every composition is layer-ordered, while file discovery within the
// component layer is deterministic: all bases first, then theme overrides.
const LAYERS = [...ONMARS_FOUNDATION, ...ONMARS_SEMANTIC, ...componentBaseLayers];

// Layer overrides are declared through Style Dictionary's include/source
// split: overriding an `include` token from `source` is silent by design,
// while two `source` files colliding still emits a "Token collisions
// detected" warning. Each layer stays collision-checked as `source` in
// exactly one composition (base layers in lightConfig, material3 overrides in
// material3LightConfig, each dark-mode file as the sole source of its own
// config), so intentional overrides are quiet and a genuine duplicate —
// e.g. two component files defining the same token — still warns.
//
// A composition carries no `files`: no composition is a stylesheet on its own.
// The scheme pair of each theme is merged into one declaration per token and
// a theme is emitted as its difference from the default theme, which takes
// all four dictionaries at once (./build.mjs).
const cssPlatform = { transformGroup: KIMEN_CSS_GROUP, prefix: '' };

export const lightConfig = {
  source: LAYERS,
  hooks: kimenCssHooks,
  platforms: { css: cssPlatform },
};

export const darkConfig = {
  include: LAYERS,
  source: ['tokens/modes/dark.tokens.json'],
  hooks: kimenCssHooks,
  platforms: { css: cssPlatform },
};

export const material3LightConfig = {
  include: LAYERS,
  source: MATERIAL3_OVERRIDES,
  hooks: kimenCssHooks,
  platforms: { css: cssPlatform },
};

// material3's dark scheme deliberately does NOT include the onmars dark file:
// a theme's dark values are its own decision, never inherited from another
// theme's mode file.
export const material3DarkConfig = {
  include: [...LAYERS, ...MATERIAL3_OVERRIDES],
  source: ['tokens/modes/material3.dark.tokens.json'],
  hooks: kimenCssHooks,
  platforms: { css: cssPlatform },
};

// Modes (specs 043/044): each is a file of references layered over a whole
// composition, so one file serves every theme and scheme. A mode's
// composition includes every file of the composition it modifies plus the
// modes it implies (more contrast implies reduced transparency) and takes its
// own file as the sole `source`, keeping collisions inside it audible.
export const MODE_SOURCES = Object.freeze({
  'reduced-transparency': Object.freeze(['tokens/modes/reduced-transparency.tokens.json']),
  'contrast-more': Object.freeze([
    'tokens/modes/reduced-transparency.tokens.json',
    'tokens/modes/contrast-more.tokens.json',
  ]),
});

export function withMode(config, mode) {
  const sources = MODE_SOURCES[mode];
  if (sources === undefined) throw new Error(`unknown mode ${JSON.stringify(mode)}`);
  return {
    ...config,
    include: [...(config.include ?? []), ...config.source, ...sources.slice(0, -1)],
    source: sources.slice(-1),
  };
}

// Densities (spec 045): a level reassigns the document-inherited density
// tokens and nothing else. Its composition is the default one with the
// level's file as the sole `source`.
export const DENSITY_SOURCES = Object.freeze({
  compact: 'tokens/modes/compact.tokens.json',
  touch: 'tokens/modes/touch.tokens.json',
});

export function withDensity(config, level) {
  const source = DENSITY_SOURCES[level];
  if (source === undefined) throw new Error(`unknown density ${JSON.stringify(level)}`);
  return {
    ...config,
    include: [...(config.include ?? []), ...config.source],
    source: [source],
  };
}
