// Builds @kimen/tokens: light (:root) + dark (prefers-color-scheme/attribute)
// into a single dist/css/tokens.css. Intermediate per-mode files are kept in
// dist/css/ for split loading and debugging.
import StyleDictionary from 'style-dictionary';
import { readFile, writeFile } from 'node:fs/promises';
import { lightConfig, darkConfig } from './style-dictionary.config.mjs';

const light = new StyleDictionary(lightConfig);
await light.buildAllPlatforms();

const dark = new StyleDictionary(darkConfig);
await dark.buildAllPlatforms();

const lightCss = await readFile(new URL('./dist/css/tokens.light.css', import.meta.url), 'utf8');
const darkCss = await readFile(new URL('./dist/css/tokens.dark.css', import.meta.url), 'utf8');
await writeFile(new URL('./dist/css/tokens.css', import.meta.url), `${lightCss}\n${darkCss}`);

console.log('✔ dist/css/tokens.css (theme: onmars — light + dark)');
