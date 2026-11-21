// Emits packages/elements/docs/tokens-reference.mdx from the DTCG sources.
//
// Manual tool, not a gate: run it after changing token sources and commit the
// regenerated MDX alongside them.
//
//   pnpm --filter @kimen/tokens run reference
//
// The reference documents the public styling contract only: the semantic and
// component layers. Primitives (and the theme layer that feeds them) are
// internal and deliberately excluded. Values are resolved against the onmars
// light composition (lightConfig); dark mode and material3 reassign the same
// custom properties, so names and descriptions apply to every theme.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import StyleDictionary from 'style-dictionary';

import { darkConfig, lightConfig, sharedConfig, withMode } from '../style-dictionary.config.mjs';
import { deprecationNote, readDeprecation } from './deprecation.mjs';
import {
  combineSchemes,
  compositionDeclarations,
  layeredOverrides,
  MODES,
} from './theme-stylesheet.mjs';

const OUTPUT_URL = new URL('../../elements/docs/tokens-reference.mdx', import.meta.url);
const SEMANTIC_FILE = 'tokens/semantic.tokens.json';
const COMPONENT_DIR = 'tokens/component/';

// Table cells are markdown text parsed by MDX: pipes break the table and
// braces/angle brackets would be read as JSX. Inline code spans (the token
// name and value cells) only need the pipe escape.
//
// Semgrep reads the chain below as hand-rolled HTML escaping and asks for
// DOMPurify. It is not sanitization: the input is our own committed token
// `$description` strings, the output is an MDX table cell in generated docs,
// and the five characters are MDX/table syntax rather than an injection
// allowlist. There is no untrusted input and no DOM on this path — it is a
// manual build tool, not a gate. Suppressed with the reason on the record.
const escapeText = (text) =>
  text // nosemgrep: javascript.audit.detect-replaceall-sanitization.detect-replaceall-sanitization
    .replaceAll('\n', ' ')
    .replaceAll('|', '\\|')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
    .replaceAll('<', '&lt;');
const escapeCode = (text) => text.replaceAll('\n', ' ').replaceAll('|', '\\|');

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function renderTable(tokens) {
  const rows = tokens
    .toSorted((left, right) => compareText(left.name, right.name))
    .map((token) => {
      const name = `\`--${token.name}\``;
      const value = `\`${escapeCode(String(token.$value))}\``;
      const { deprecation } = readDeprecation(token);
      const note = deprecation === null ? '' : `${deprecationNote(deprecation)} `;
      const description = escapeText(`${note}${token.$description ?? '—'}`);
      return `| ${name} | ${value} | ${description} |`;
    });

  return [
    '| Token | Value (onmars light) | Description |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function groupBy(tokens, keyOf) {
  const groups = new Map();

  for (const token of tokens) {
    const key = keyOf(token);
    const group = groups.get(key) ?? [];
    group.push(token);
    groups.set(key, group);
  }

  return [...groups.entries()].toSorted(([left], [right]) => compareText(left, right));
}

function renderSections(groups, headingOf) {
  return groups.flatMap(([key, tokens]) => [`### ${headingOf(key)}`, '', renderTable(tokens)]);
}

function renderDeprecatedSection(tokens) {
  const rows = tokens
    .map((token) => ({ token, deprecation: readDeprecation(token).deprecation }))
    .filter(({ deprecation }) => deprecation !== null)
    .toSorted((left, right) => compareText(left.token.name, right.token.name))
    .map(({ token, deprecation }) =>
      [
        `\`--${token.name}\``,
        `\`${deprecation.replacement}\``,
        deprecation.since,
        deprecation.removal,
        escapeText(deprecation.reason),
      ].join(' | '),
    )
    .map((row) => `| ${row} |`);
  if (rows.length === 0) return [];

  return [
    '## Deprecated tokens',
    '',
    'Still published with their values until the version shown. Use the replacement',
    'listed for each token (spec 041; see',
    '`docs/migrations/deprecated-tokens.md`).',
    '',
    '| Token | Replacement | Deprecated since | Removed in | Why |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ];
}

/**
 * What each preference mode reassigns in the default theme (specs 043/044),
 * with the expression it gives each token. A theme that sets one of these
 * tokens sets it for the mode too, so the list is the exact set a theme
 * restates under the mode.
 */
function renderModesSection(modes) {
  if (modes.length === 0) return [];
  const section = modes.flatMap(({ mode, declarations }) => [
    `### ${mode.name}`,
    '',
    `Active under \`@media ${escapeCode(mode.media)}\` and on a token root carrying, or inside one`,
    `carrying, ${mode.activations.map((activation) => `\`${activation}\``).join(' or ')}.`,
    '',
    '| Token | Value under the mode (onmars) |',
    '| --- | --- |',
    ...[...declarations]
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([name, expression]) => `| \`${name}\` | \`${escapeCode(expression)}\` |`),
    '',
  ]);
  return [
    '## Preference modes',
    '',
    'The tokens each mode reassigns, on top of the active theme. A theme that',
    'sets one of them in its own rule replaces the mode value too, because both',
    'rules declare the same property on the same element: restate it under the',
    "mode's media query and declaration (see *Docs → Tokens & theming*). More",
    'contrast also applies reduced transparency.',
    '',
    ...section,
  ];
}

/** The reference MDX for Style Dictionary platform tokens of the onmars light composition. */
export function renderReference(allTokens, { modes = [] } = {}) {
  const semanticTokens = allTokens.filter((token) => token.filePath === SEMANTIC_FILE);
  const componentTokens = allTokens.filter((token) => token.filePath.startsWith(COMPONENT_DIR));
  const semanticGroups = groupBy(semanticTokens, (token) => token.path[1]);
  const componentGroups = groupBy(componentTokens, (token) =>
    token.filePath.slice(COMPONENT_DIR.length).replace('.tokens.json', ''),
  );

  const lines = [
    "import { Meta } from '@storybook/addon-docs/blocks';",
    '',
    '<Meta title="Docs/Tokens reference" />',
    '',
    '{/* GENERATED FILE — do not edit by hand.',
    '    Source: the DTCG files under packages/tokens/tokens/.',
    '    Generator: packages/tokens/scripts/generate-reference.mjs.',
    '    Regenerate after any token source change:',
    '      pnpm --filter @kimen/tokens run reference */}',
    '',
    '# Tokens reference',
    '',
    '> **Generated reference — do not edit by hand.** This page is emitted by',
    '> `packages/tokens/scripts/generate-reference.mjs` from the DTCG sources in',
    '> `packages/tokens/tokens/`. Regenerate it after changing token sources with',
    '> `pnpm --filter @kimen/tokens run reference` and commit the result. It is',
    '> generated manually and is not verified by a CI gate.',
    '',
    `Every custom property in the public styling contract: ${semanticTokens.length} semantic`,
    `and ${componentTokens.length} component tokens. Values are the resolved **onmars light**`,
    'values; dark mode and the material3 theme reassign the same custom properties,',
    'so the names and descriptions on this page apply to every theme (see',
    '*Docs → Tokens & theming* for the model). Primitive tokens are internal and',
    'deliberately not listed: components never consume them, and reassigning the',
    'two layers below is the whole re-theming surface.',
    '',
    '## Semantic tokens',
    '',
    'Meaning, not appearance. This is the layer a brand reassigns to re-theme',
    'every component at once.',
    '',
    ...renderSections(semanticGroups, (key) => `\`ki.${key}\``),
    '## Component tokens',
    '',
    'The public styling contract of each element. Reassign them on `:root` for a',
    'theme-wide change, on a theme root (an element with `data-ki-theme`) for a',
    'region, or on one element for that instance. A token that another token',
    'aliases is recomputed only on the root and on theme roots.',
    '',
    ...renderSections(componentGroups, (key) => `\`ki-${key}\``),
    ...renderModesSection(modes),
    ...renderDeprecatedSection(allTokens),
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}

async function composition(config) {
  const dictionary = await new StyleDictionary({
    ...config,
    log: { verbosity: 'silent' },
  }).getPlatformTokens('css');
  return compositionDeclarations(dictionary);
}

// The same layering ../build.mjs emits: each mode as what the default rule and
// the modes before it do not already produce.
async function defaultThemeModes() {
  const onmars = async (mode) =>
    combineSchemes({
      light: await composition(mode ? withMode(lightConfig, mode) : lightConfig),
      dark: await composition(mode ? withMode(darkConfig, mode) : darkConfig),
    });
  const layers = [await onmars()];
  const modes = [];
  for (const mode of MODES) {
    const declarations = layeredOverrides({ target: await onmars(mode.name), layers });
    layers.push(declarations);
    modes.push({ mode, declarations });
  }
  return modes;
}

async function main() {
  const [definitions, onmars] = await Promise.all(
    [sharedConfig, lightConfig].map((config) =>
      new StyleDictionary({ ...config, log: { verbosity: 'silent' } }).getPlatformTokens('css'),
    ),
  );
  // The theme overlay replaces Style Dictionary's filePath. Preserve the
  // defining file and deprecation metadata while showing the onmars values.
  const values = new Map(onmars.allTokens.map((token) => [token.name, token.$value]));
  const allTokens = definitions.allTokens.map((token) => ({
    ...token,
    $value: values.get(token.name),
  }));
  await writeFile(OUTPUT_URL, renderReference(allTokens, { modes: await defaultThemeModes() }));
  const published = allTokens.filter(
    (token) => token.filePath === SEMANTIC_FILE || token.filePath.startsWith(COMPONENT_DIR),
  );
  console.log(`tokens-reference.mdx: ${published.length} tokens → ${fileURLToPath(OUTPUT_URL)}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await main();
}
