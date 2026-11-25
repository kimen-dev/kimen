// Builds @kimen/tokens: the four token compositions (theme × scheme) merged
// into the stylesheets the package exports.
//
//   dist/css/tokens.css            the onmars default theme, both schemes
//   dist/css/tokens.material3.css  what material3 changes over the default
//   dist/css/base.css              the opt-in page contract
//   dist/css/core.css              spec 166: every token but the component ones
//   dist/css/ki-<tag>.css          spec 166: the component tokens one tag needs
//
// The emitted shape — one `light-dark()` declaration per scheme-dependent
// token, a colour-scheme contract on the token sheet itself, themed subtrees,
// themes as overrides — is documented where it is produced:
// ./scripts/theme-stylesheet.mjs.
//
// A warning-free build is the expected outcome. Layer overrides (primitive →
// theme → semantic → component, material3 over onmars, dark over light) are
// declared intentional via each config's include/source split — see
// style-dictionary.config.mjs. Any warning this build prints is therefore a
// real problem (a duplicate token in the same layer), not noise to ignore, and
// anything the stylesheet cannot express (a token that is not a colour and
// still depends on the scheme, two tokens compiling to one custom property)
// fails the build outright.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import StyleDictionary from 'style-dictionary';

import { readComponentTokenUsage } from '../../scripts/lib/component-token-usage.mjs';
import {
  componentSourceOf,
  declaredNames,
  isFoundation,
  pick,
  pickModes,
  tagSources,
  unresolvedReferences,
} from './scripts/component-sheets.mjs';
import { assertNoDeprecationDue, collectDeprecations } from './scripts/deprecation.mjs';
import {
  assertInheritedTokens,
  combineSchemes,
  compactTokenStylesheet,
  compositionDeclarations,
  DENSITIES,
  densityRules,
  layeredOverrides,
  modeReassignments,
  renderBaseStylesheet,
  renderComponentStylesheet,
  renderThemeStylesheet,
  themeOverrides,
} from './scripts/theme-stylesheet.mjs';
import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
  sharedConfig,
  withDensity,
} from './style-dictionary.config.mjs';

const dist = new URL('./dist/css/', import.meta.url);

async function composition(config) {
  const dictionary = await new StyleDictionary(config).getPlatformTokens('css');
  return compositionDeclarations(dictionary);
}

// Deprecations (spec 041) are declared on shared base definitions. An incomplete deprecation, a
// replacement that is not a live published token, or a deprecated token the
// package still ships at its removal version fails the build.
const { version } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const sharedTokens = (await new StyleDictionary(sharedConfig).getPlatformTokens('css')).allTokens;
const deprecations = collectDeprecations(sharedTokens);
assertNoDeprecationDue(deprecations, version);

await mkdir(dist, { recursive: true });

const themes = {
  onmars: { light: lightConfig, dark: darkConfig },
  material3: { light: material3LightConfig, dark: material3DarkConfig },
};
// One theme's two schemes merged into one expression per token, optionally
// varied (a density level) in both.
async function theme(name, variant = (config) => config) {
  const { light, dark } = themes[name];
  return combineSchemes({
    light: await composition(variant(light)),
    dark: await composition(variant(dark)),
  });
}

const onmars = await theme('onmars');
const material3Theme = await theme('material3');
const material3 = themeOverrides({ base: onmars, theme: material3Theme });

// Each mode re-points the tokens that have a value for it to that value, in
// the default stylesheet and for every theme at once; a theme's own mode
// values are among its overrides (./scripts/theme-stylesheet.mjs).
const baseModes = modeReassignments(onmars, deprecations);
// The same re-pointing must hold with material3's own mode values.
modeReassignments(material3Theme, deprecations);

// Density (spec 045): the document-inherited tokens, declared on :root alone,
// and one rule per level that reassigns them on any element.
const lightComposition = await composition(lightConfig);
const inherited = new Set(
  [...lightComposition].filter(([, token]) => token.inherited).map(([name]) => name),
);
assertInheritedTokens({ declarations: onmars, inherited });
assertInheritedTokens({
  declarations: onmars,
  inherited,
  overrides: material3,
  label: 'material3',
});
for (const { mode, declarations } of baseModes) {
  assertInheritedTokens({
    declarations: onmars,
    inherited,
    overrides: declarations,
    label: mode.name,
  });
}
const levels = [];
for (const level of DENSITIES) {
  const declarations = layeredOverrides({
    target: await theme('onmars', (config) => withDensity(config, level)),
    layers: [onmars],
  });
  for (const name of declarations.keys()) {
    if (!inherited.has(name)) {
      throw new Error(
        `density ${level} reassigns ${name}, which is not inherited from the document`,
      );
    }
  }
  levels.push({ level, declarations });
}
const densities = densityRules(levels, onmars);

// Spec 061's style queries compare against the default blur, even when the
// theme replaces the public filter with a complete value.
const baseWithBackdropDefaults = new Map([
  ...onmars,
  ['--_ki-backdrop-filter-default', 'blur(var(--ki-effect-component-backdrop-blur))'],
  ['--_ki-listbox-backdrop-filter-default', 'blur(var(--ki-blur-48))'],
]);
await writeFile(
  new URL('tokens.css', dist),
  compactTokenStylesheet(
    renderBaseStylesheet(baseWithBackdropDefaults, {
      deprecations,
      modes: baseModes,
      inherited,
      densities,
    }),
    {
      declarations: onmars,
      modes: baseModes,
      inline: (name) => name.startsWith('--ki-foundation-'),
    },
  ),
);

const modeSummary = (modes) =>
  modes.map(({ mode, declarations }) => `${mode.name} ${declarations.size}`).join(', ');
console.log(
  `✔ dist/css/tokens.css (theme: onmars — ${onmars.size} tokens, light + dark, ${deprecations.size} deprecated; densities: ${densities.map(({ level }) => level).join(', ')}; modes: ${modeSummary(baseModes)})`,
);

// Every literal foundation the theme reads is inlined (spec 166 D1), so the
// theme works over the core sheet, which carries no foundation: the values
// are the same, only the expressions name the literal instead of the token.
const material3Css = compactTokenStylesheet(
  renderThemeStylesheet('material3', material3, { deprecations }),
  {
    declarations: material3Theme,
    modes: baseModes,
    inline: isFoundation,
    foundationsLast: true,
    transitive: true,
  },
);
await writeFile(new URL('tokens.material3.css', dist), material3Css);

console.log(
  `✔ dist/css/tokens.material3.css (theme: material3 — ${material3.size} overrides of onmars)`,
);

// Spec 166: the core sheet and one sheet per tag, beside the full sheet,
// which stays exactly as it is. A token belongs to a component source when
// its base definition lives in tokens/component/; the core carries every
// other token but the foundations; a tag's sheet carries every source the
// tag needs (./scripts/component-sheets.mjs). Each split declaration is the
// full sheet's own, compacted the same way.
const sourceOf = new Map(
  sharedTokens
    .filter(({ filePath }) => componentSourceOf(filePath) !== null)
    .map(({ name, filePath }) => [`--${name}`, componentSourceOf(filePath)]),
);
const usage = await readComponentTokenUsage({
  componentsRoot: fileURLToPath(new URL('../elements/src/components/', import.meta.url)),
});
const sourcesByTag = tagSources({ usage, sourceOf, expressions: [onmars, material3Theme] });
const needed = new Set([...sourcesByTag.values()].flat());
for (const source of new Set(sourceOf.values())) {
  if (!needed.has(source)) {
    throw new Error(`no component reads the tokens of tokens/component/${source}.tokens.json`);
  }
}
const isCoreToken = (name) => !sourceOf.has(name) && !isFoundation(name);
const compactSplit = (css) =>
  compactTokenStylesheet(css, { declarations: onmars, modes: baseModes, inline: isFoundation });

const coreCss = compactSplit(
  renderBaseStylesheet(pick(baseWithBackdropDefaults, isCoreToken), {
    deprecations,
    modes: pickModes(baseModes, isCoreToken),
    inherited,
    densities,
  }),
);
const coreNames = declaredNames(coreCss);
const coreGaps = unresolvedReferences(coreCss, coreNames);
if (coreGaps.length > 0) {
  throw new Error(`the core sheet reads tokens it does not declare: ${coreGaps.join(', ')}`);
}
await writeFile(new URL('core.css', dist), coreCss);

for (const file of await readdir(dist)) {
  if (/^ki-[a-z0-9-]+\.css$/u.test(file)) await rm(new URL(file, dist));
}
const splitNames = new Set(coreNames);
for (const [tag, sources] of sourcesByTag) {
  const inSheet = (name) => sources.includes(sourceOf.get(name));
  const css = compactSplit(
    renderComponentStylesheet(pick(onmars, inSheet), {
      deprecations,
      modes: pickModes(baseModes, inSheet),
    }),
  );
  const names = declaredNames(css);
  const gaps = unresolvedReferences(css, new Set([...coreNames, ...names]));
  if (gaps.length > 0) {
    throw new Error(
      `the ${tag} sheet reads tokens neither it nor the core declares: ${gaps.join(', ')}`,
    );
  }
  for (const name of names) splitNames.add(name);
  await writeFile(new URL(`${tag}.css`, dist), css);
}
const material3Gaps = unresolvedReferences(
  material3Css,
  new Set([...splitNames, ...declaredNames(material3Css)]),
);
if (material3Gaps.length > 0) {
  throw new Error(
    `material3 reads tokens the core and the tag sheets do not declare: ${material3Gaps.join(', ')}`,
  );
}
console.log(
  `✔ dist/css/core.css and ${sourcesByTag.size} tag sheets (dist/css/ki-*.css), from ${new Set(sourceOf.values()).size} component sources`,
);

// The page contract (opt-in): what a consumer page needs beyond tokens to
// read as a Kimen page — the page background, the page text colour and the
// body typeface. The colour scheme is NOT here: it is declared by the token
// stylesheet, because the tokens themselves resolve from it.
//
// This sheet publishes NO tokens: it only consumes them. That is what keeps it
// outside the public token surface (scripts/lib/css-token-surface.mjs).
//
// Before registration (spec 001 S17) a custom element is an inline box, so
// the items of a group — segments, radios, options — run together as one line
// of text when the component script is late or fails. Until each tag
// registers, its items lay out as blocks: a readable list, no paint, zero
// specificity so any page rule wins, and nothing once the tag is defined.
const PRE_REGISTRATION_BLOCKS = [
  'ki-segment',
  'ki-radio',
  'ki-checkbox',
  'ki-option',
  'ki-menu-item',
  'ki-list-item',
  'ki-tab',
  'ki-tree-item',
  'ki-step',
  'ki-timeline-item',
  'ki-sidebar-item',
  'ki-mobile-nav-item',
];
const pageContractCss = `:root {
  background-color: var(--ki-surface-base);
  color: var(--ki-text-high-em);
  font-family: var(--ki-typography-family-body);
}

:where(${PRE_REGISTRATION_BLOCKS.join(', ')}):where(:not(:defined)) {
  display: block;
}
`;

await writeFile(new URL('base.css', dist), pageContractCss);

console.log('✔ dist/css/base.css (page contract — opt-in)');
