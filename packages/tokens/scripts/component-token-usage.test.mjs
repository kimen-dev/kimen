import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
  withDensity,
} from '../style-dictionary.config.mjs';
import { DENSITIES, MODES, modeValueName } from './theme-stylesheet.mjs';

const tokenReads = (css) =>
  Array.from(css.matchAll(/\bvar\(\s*(--ki-[a-z0-9-]+)\s*[,)]/gu), ([, name]) => name);

test('every public component token is read by a component stylesheet or aliased by a token', async () => {
  const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const tokenPackageRoot = join(workspaceRoot, 'packages/tokens');
  const componentsRoot = join(workspaceRoot, 'packages/elements/src/components');
  // Like the elements surface build, resolve workspace-only tooling at runtime.
  const { createOrderedTokenInventory, loadOrderedTokenCompositions, readComponentCss } =
    await import(pathToFileURL(join(workspaceRoot, 'scripts/lib/token-inventory.mjs')).href);
  const schemes = [
    { id: 'onmars-light', theme: 'onmars', scheme: 'light', config: lightConfig },
    { id: 'onmars-dark', theme: 'onmars', scheme: 'dark', config: darkConfig },
    { id: 'material3-light', theme: 'material3', scheme: 'light', config: material3LightConfig },
    { id: 'material3-dark', theme: 'material3', scheme: 'dark', config: material3DarkConfig },
  ];
  const compositions = await loadOrderedTokenCompositions({
    workspaceRoot,
    tokenPackageRoot,
    configurations: [
      ...schemes,
      ...schemes.flatMap((scheme) =>
        DENSITIES.map((density) => ({
          ...scheme,
          id: `${scheme.id}-${density}`,
          config: withDensity(scheme.config, density),
        })),
      ),
    ],
  });
  const { publicTokens } = createOrderedTokenInventory(compositions);
  const namesByPath = new Map(publicTokens.map(({ path, cssName }) => [path, cssName]));

  // The token build generates a reference from the base name to its mode
  // value. Other references come from DTCG aliases and CSS-valued tokens.
  const used = new Set(
    publicTokens.flatMap(({ cssName }) => MODES.map((mode) => modeValueName(mode, cssName))),
  );
  for (const { records } of compositions) {
    for (const { value, path, references, cssName } of records) {
      for (const name of tokenReads(JSON.stringify(value))) {
        if (cssName !== name) used.add(name);
      }
      for (const reference of references) {
        const name = namesByPath.get(reference);
        if (name !== undefined && reference !== path) used.add(name);
      }
    }
  }
  for (const contents of Object.values(await readComponentCss({ componentsRoot }))) {
    const css = contents.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu, '');
    for (const name of tokenReads(css)) used.add(name);
  }

  const dead = publicTokens
    .filter(({ layer, cssName }) => layer === 'component' && !used.has(cssName))
    .map(({ cssName }) => cssName)
    .sort();
  assert.equal(dead.length, 0, `Dead component tokens (${dead.length}):\n${dead.join('\n')}`);
});
