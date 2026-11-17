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
  combineSchemes,
  compositionDeclarations,
  renderBaseStylesheet,
  renderThemeStylesheet,
  themeOverrides,
} from './scripts/theme-stylesheet.mjs';
import {
  darkConfig,
  lightConfig,
  material3DarkConfig,
  material3LightConfig,
} from './style-dictionary.config.mjs';

const dist = new URL('./dist/css/', import.meta.url);

async function composition(config) {
  const dictionary = await new StyleDictionary(config).getPlatformTokens('css');
  return compositionDeclarations(dictionary);
}

// Deprecations (spec 041) are declared on base definitions, so the default
// light composition carries all of them. An incomplete deprecation, a
// replacement that is not a live published token, or a deprecated token the
// package still ships at its removal version fails the build.
const { version } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const deprecations = collectDeprecations(
  (await new StyleDictionary(lightConfig).getPlatformTokens('css')).allTokens,
);
assertNoDeprecationDue(deprecations, version);

await mkdir(dist, { recursive: true });

const onmars = combineSchemes({
  light: await composition(lightConfig),
  dark: await composition(darkConfig),
});
await writeFile(new URL('tokens.css', dist), renderBaseStylesheet(onmars, { deprecations }));

console.log(
  `✔ dist/css/tokens.css (theme: onmars — ${onmars.size} tokens, light + dark, ${deprecations.size} deprecated)`,
);

const material3 = themeOverrides({
  base: onmars,
  theme: combineSchemes({
    light: await composition(material3LightConfig),
    dark: await composition(material3DarkConfig),
  }),
});
await writeFile(
  new URL('tokens.material3.css', dist),
  renderThemeStylesheet('material3', material3, { deprecations }),
);

console.log(
  `✔ dist/css/tokens.material3.css (theme: material3 — ${material3.size} overrides of onmars)`,
);

// The page contract (opt-in): what a consumer page needs beyond tokens to
// read as a Kimen page — the page background, the page text colour and the
// body typeface. The colour scheme is NOT here: it is declared by the token
// stylesheet, because the tokens themselves resolve from it.
//
// This sheet publishes NO tokens: it only consumes them. That is what keeps it
// outside the public token surface (scripts/lib/css-token-surface.mjs).
const pageContractCss = `:root {
  background-color: var(--ki-surface-s0);
  color: var(--ki-text-high-em);
  font-family: var(--ki-typography-family-body);
}
`;

await writeFile(new URL('base.css', dist), pageContractCss);

console.log('✔ dist/css/base.css (page contract — opt-in)');
