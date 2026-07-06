// Builds @kimen/tokens: light (:root) + dark (prefers-color-scheme/attribute)
// into a single dist/css/tokens.css. Intermediate per-mode files are kept in
// dist/css/ for split loading and debugging.
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
