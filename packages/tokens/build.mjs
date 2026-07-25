// Builds @kimen/tokens: light (:root) + dark (prefers-color-scheme/attribute)
// into a single dist/css/tokens.css. Intermediate per-mode files are kept in
// dist/css/ for split loading and debugging.
//
// A warning-free build is the expected outcome. Layer overrides (primitive →
// theme → semantic → component, material3 over onmars, dark over light) are
// declared intentional via each config's include/source split, and the dark
// file's cross-file var() references via a scoped platform log — see
// style-dictionary.config.mjs. Any warning this build prints is therefore a
// real problem (duplicate token in the same layer, unexpected filtered
// reference), not noise to ignore.
import StyleDictionary from 'style-dictionary';
import { readFile, writeFile } from 'node:fs/promises';
import {
  lightConfig,
  darkConfig,
  material3LightConfig,
  material3DarkConfig,
} from './style-dictionary.config.mjs';

const light = new StyleDictionary(lightConfig);
await light.buildAllPlatforms();

const dark = new StyleDictionary(darkConfig);
await dark.buildAllPlatforms();

const lightCss = await readFile(new URL('./dist/css/tokens.light.css', import.meta.url), 'utf8');
const darkCss = await readFile(new URL('./dist/css/tokens.dark.css', import.meta.url), 'utf8');
await writeFile(new URL('./dist/css/tokens.css', import.meta.url), `${lightCss}\n${darkCss}`);

console.log('✔ dist/css/tokens.css (theme: onmars — light + dark)');

const material3Light = new StyleDictionary(material3LightConfig);
await material3Light.buildAllPlatforms();

const material3Dark = new StyleDictionary(material3DarkConfig);
await material3Dark.buildAllPlatforms();

const material3LightCss = await readFile(
  new URL('./dist/css/tokens.material3.light.css', import.meta.url),
  'utf8',
);
const material3DarkCss = await readFile(
  new URL('./dist/css/tokens.material3.dark.css', import.meta.url),
  'utf8',
);
await writeFile(
  new URL('./dist/css/tokens.material3.css', import.meta.url),
  `${material3LightCss}\n${material3DarkCss}`,
);

console.log('✔ dist/css/tokens.material3.css (theme: material3 — light + dark)');

// The page contract (opt-in): the three declarations a consumer page needs and
// that a token sheet cannot carry. `color-scheme` is the load-bearing one —
// without it a light-only page whose visitor prefers dark gets Kimen's dark
// component surfaces on a user-agent white canvas, with light scrollbars,
// light autofill and, in the worst case, an invisible field label.
//
// This sheet publishes NO tokens: it only consumes them. That is what keeps it
// outside the public token surface (scripts/lib/css-token-surface.mjs).
const pageContractCss = `/**
 * Do not edit directly, this file was auto-generated.
 *
 * Kimen page contract — opt-in, import after a theme stylesheet:
 *   import '@kimen/tokens/css';
 *   import '@kimen/tokens/css/base';
 *
 * A page that is deliberately light-only or dark-only sets
 * data-ki-color-scheme on <html> instead of relying on the visitor's
 * preference; both the tokens and the user agent then follow that choice.
 */
:root {
  color-scheme: light dark;
  background-color: var(--ki-surface-s0);
  color: var(--ki-text-high-em);
  font-family: var(--ki-typography-family-body);
}

:root[data-ki-color-scheme="light"] {
  color-scheme: light;
}

:root[data-ki-color-scheme="dark"] {
  color-scheme: dark;
}
`;

await writeFile(new URL('./dist/css/base.css', import.meta.url), pageContractCss);

console.log('✔ dist/css/base.css (page contract — opt-in)');
