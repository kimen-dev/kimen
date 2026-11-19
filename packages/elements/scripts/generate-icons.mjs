import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = new URL('../vendor/lucide-1.63.0.json', import.meta.url);
const registry = new URL('../src/utils/icon-registry.mjs', import.meta.url);
const iconsDirectory = fileURLToPath(new URL('../icons/', import.meta.url));
const svgTemplate =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{body}</svg>';
const iconName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
// The vendored asset contains only geometry. Reject links, events, nested SVG,
// scripts, external references and every other non-geometry element/attribute.
const geometry =
  /^(?:<(?:path|circle|rect|line|ellipse|polyline|polygon)(?: (?:d="[AaCcEeHhLlMmQqSsTtVvZz0-9.,+ -]+"|(?:cx|cy|r|width|height|x|y|rx|ry|x1|y1|x2|y2|points)="[0-9.,+ -]+"|fill="currentColor"))+\/>)+$/u;

export async function generateIconModules({ output = iconsDirectory } = {}) {
  const { name, version, count, svg, icons } = JSON.parse(await readFile(source, 'utf8'));
  if (name !== 'Lucide' || version !== '1.63.0' || svg !== svgTemplate) {
    throw new Error('Unexpected Lucide version or SVG template');
  }
  if (icons === null || typeof icons !== 'object' || Array.isArray(icons)) {
    throw new Error('Lucide icons must be a name-to-markup object');
  }

  const entries = Object.entries(icons);
  if (entries.length !== count || count !== 2193) {
    throw new Error('Unexpected Lucide icon inventory');
  }
  for (const [name, markup] of entries) {
    if (!iconName.test(name) || typeof markup !== 'string' || !geometry.test(markup)) {
      throw new Error(`Invalid Lucide icon name or markup: ${name}`);
    }
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await copyFile(registry, join(output, '_registry.mjs'));
  for (const [name, markup] of entries) {
    // An alias is selectable by its own name, just as in the vendored data.
    const module = `import { registerIcon } from './_registry.mjs';\nregisterIcon(${JSON.stringify(name)}, ${JSON.stringify(markup)});\n`;
    await writeFile(join(output, `${name}.js`), module);
    await writeFile(join(output, `${name}.d.ts`), 'export {};\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generateIconModules();
}
