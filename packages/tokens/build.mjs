// Builds @kimen/tokens: the four token compositions (theme × scheme) merged
// into the stylesheets the package exports.
//
//   dist/css/tokens.css            the onmars default theme, both schemes
//   dist/css/tokens.material3.css  what material3 changes over the default
//   dist/css/base.css              the opt-in page contract
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
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import StyleDictionary from 'style-dictionary';

import { assertNoDeprecationDue, collectDeprecations } from './scripts/deprecation.mjs';
import {
  assertInheritedTokens,
  combineSchemes,
  compositionDeclarations,
  DENSITIES,
  densityRules,
  layeredOverrides,
  MODES,
  renderBaseStylesheet,
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
  withMode,
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
const deprecations = collectDeprecations(
  (await new StyleDictionary(sharedConfig).getPlatformTokens('css')).allTokens,
);
assertNoDeprecationDue(deprecations, version);

await mkdir(dist, { recursive: true });

const themes = {
  onmars: { light: lightConfig, dark: darkConfig },
  material3: { light: material3LightConfig, dark: material3DarkConfig },
};
// One theme's two schemes merged into one expression per token, optionally
// with a mode layered over both.
async function theme(name, mode, variant = (config) => config) {
  const { light, dark } = themes[name];
  return combineSchemes({
    light: await composition(variant(mode ? withMode(light, mode) : light)),
    dark: await composition(variant(mode ? withMode(dark, mode) : dark)),
  });
}

const onmars = await theme('onmars');
const material3 = themeOverrides({ base: onmars, theme: await theme('material3') });

// Each mode is emitted as what the cascade below it does not already produce,
// in cascade order: the default theme's mode rules follow the default rule
// (and every earlier mode), and a theme re-asserts, after its own rule, the
// mode values its overrides displaced (./scripts/theme-stylesheet.mjs).
const baseLayers = [onmars];
const themeLayers = [];
const baseModes = [];
const material3Modes = [];
for (const mode of MODES) {
  const declarations = layeredOverrides({
    target: await theme('onmars', mode.name),
    layers: baseLayers,
  });
  baseLayers.push(declarations);
  baseModes.push({ mode, declarations });
  const reasserted = layeredOverrides({
    target: await theme('material3', mode.name),
    layers: [...baseLayers, material3, ...themeLayers],
  });
  themeLayers.push(reasserted);
  material3Modes.push({ mode, declarations: reasserted });
}

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
for (const { mode, declarations } of [...baseModes, ...material3Modes]) {
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
    target: await theme('onmars', undefined, (config) => withDensity(config, level)),
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

await writeFile(
  new URL('tokens.css', dist),
  renderBaseStylesheet(onmars, { deprecations, modes: baseModes, inherited, densities }),
);

const modeSummary = (modes) =>
  modes.map(({ mode, declarations }) => `${mode.name} ${declarations.size}`).join(', ');
console.log(
  `✔ dist/css/tokens.css (theme: onmars — ${onmars.size} tokens, light + dark, ${deprecations.size} deprecated; densities: ${densities.map(({ level }) => level).join(', ')}; modes: ${modeSummary(baseModes)})`,
);

await writeFile(
  new URL('tokens.material3.css', dist),
  renderThemeStylesheet('material3', material3, { deprecations, modes: material3Modes }),
);

console.log(
  `✔ dist/css/tokens.material3.css (theme: material3 — ${material3.size} overrides of onmars; modes: ${modeSummary(material3Modes)})`,
);

// The page contract (opt-in): what a consumer page needs beyond tokens to
// read as a Kimen page — the page background, the page text colour and the
// body typeface. The colour scheme is NOT here: it is declared by the token
// stylesheet, because the tokens themselves resolve from it.
//
// This sheet publishes NO tokens: it only consumes them. That is what keeps it
// outside the public token surface (scripts/lib/css-token-surface.mjs).
const pageContractCss = `:root {
  background-color: var(--ki-surface-base);
  color: var(--ki-text-high-em);
  font-family: var(--ki-typography-family-body);
}
`;

await writeFile(new URL('base.css', dist), pageContractCss);

console.log('✔ dist/css/base.css (page contract — opt-in)');
