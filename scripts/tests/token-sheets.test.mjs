// @spec:166-tokens-core-and-component-sheets
//
// The core and per-tag token sheets, read as a consumer receives them: the
// built stylesheets of @kimen/tokens, its package exports, its size gate and
// the generated component documentation. The browser half of the contract
// (computed styles, overrides, themes and modes) lives in
// packages/elements/browser-tests/token-sheets.browser.spec.ts.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { MODES, modeValueName } from '../../packages/tokens/scripts/theme-stylesheet.mjs';
import { buildPublicStylesheetSurface } from '../lib/css-token-surface.mjs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const sheet = (file) => read(`packages/tokens/dist/css/${file}`);
const tokensPackage = JSON.parse(read('packages/tokens/package.json'));
const tags = readdirSync(new URL('packages/elements/src/components/', root), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('ki-'))
  .map((entry) => entry.name)
  .sort();

const COMPONENT_SELECTOR = ':where(:root), :where([data-ki-theme])';
const FULL_SELECTOR = ':root, :where([data-ki-theme])';

/**
 * Every rule of a stylesheet, flattened: the enclosing `@media` prelude (or
 * ''), the selector with its whitespace collapsed, and its custom-property
 * declarations in order (`!important` stays part of the value).
 */
function rules(css) {
  const source = css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  const result = [];
  const stack = [];
  let buffer = '';
  let depth = 0;
  for (const character of source) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth > 0) {
      buffer += character;
      continue;
    }
    if (character === '{') {
      const prelude = buffer.trim().replaceAll(/\s+/gu, ' ');
      buffer = '';
      if (prelude.startsWith('@media')) {
        stack.push({ media: prelude });
      } else {
        const rule = {
          media: stack.findLast((frame) => frame.media)?.media ?? '',
          selector: prelude,
          declarations: new Map(),
        };
        result.push(rule);
        stack.push({ rule });
      }
    } else if (character === ';' || character === '}') {
      const declaration = buffer.trim();
      buffer = '';
      const rule = stack.at(-1)?.rule;
      if (rule !== undefined && declaration !== '') {
        const colon = declaration.indexOf(':');
        rule.declarations.set(
          declaration.slice(0, colon).trim(),
          declaration
            .slice(colon + 1)
            .trim()
            .replaceAll(/\s+/gu, ' '),
        );
      }
      if (character === '}') stack.pop();
    } else {
      buffer += character;
    }
  }
  return result;
}

const customProperties = (css) =>
  new Set(
    rules(css).flatMap(({ declarations }) =>
      [...declarations.keys()].filter((name) => name.startsWith('--')),
    ),
  );
const mainRule = (css, selector) => rules(css).find((rule) => rule.selector === selector);
const references = (value) => [...value.matchAll(/var\((--[a-z0-9_-]+)/gu)].map((m) => m[1]);
// The component token families a sheet carries, by name prefix.
const declaresFamily = (names, prefix) => [...names].some((name) => name.startsWith(prefix));

const full = sheet('tokens.css');
const fullNames = customProperties(full);
const fullMain = mainRule(full, FULL_SELECTOR);

test('S2 every registered tag has its own token sheet, and the core exists', () => {
  assert.ok(tags.length > 100, 'the component inventory was not found');
  const missing = tags.filter(
    (tag) => !existsSync(new URL(`packages/tokens/dist/css/${tag}.css`, root)),
  );
  assert.deepEqual(missing, []);
  assert.ok(existsSync(new URL('packages/tokens/dist/css/core.css', root)));
});

test('S1 the ki-button sheet declares the button tokens and no other component token', () => {
  const names = customProperties(sheet('ki-button.css'));
  const button = [...fullNames].filter(
    (name) => name.startsWith('--ki-button-') && !name.startsWith('--ki-button-group-'),
  );
  const buttonModeValues = button
    .flatMap((name) => MODES.map((mode) => modeValueName(mode, name)))
    .filter((name) => fullNames.has(name));
  assert.ok(button.length > 100);
  assert.deepEqual([...names].sort(), [...button, ...buttonModeValues].sort());
});

test('S1 the core declares no component token and no foundation', () => {
  const core = sheet('core.css');
  const names = customProperties(core);
  const componentNames = new Set(tags.flatMap((tag) => [...customProperties(sheet(`${tag}.css`))]));
  assert.deepEqual(
    [...names].filter((name) => componentNames.has(name)),
    [],
  );
  assert.deepEqual(
    [...names].filter((name) => name.startsWith('--ki-foundation-')),
    [],
  );
  for (const rule of rules(core)) {
    for (const [name, value] of rule.declarations) {
      for (const reference of references(value)) {
        assert.ok(
          names.has(reference),
          `${name} reads ${reference}, which the core does not declare`,
        );
      }
    }
  }
});

test('S3 the ki-pagination sheet brings the tokens of the components it renders', () => {
  const names = customProperties(sheet('ki-pagination.css'));
  for (const family of [
    '--ki-pagination-',
    '--ki-button-',
    '--ki-icon-button-',
    '--ki-icon-',
    '--ki-counter-',
  ]) {
    assert.ok(declaresFamily(names, family), `ki-pagination's sheet lacks ${family}*`);
  }
  assert.equal(declaresFamily(names, '--ki-alert-'), false);
});

test('S4 the core keeps the full sheet’s colour-scheme contract and selectors', () => {
  const core = rules(sheet('core.css'));
  const fullRules = rules(full);
  assert.deepEqual(
    core.slice(0, 3).map(({ selector, declarations }) => [selector, [...declarations]]),
    fullRules.slice(0, 3).map(({ selector, declarations }) => [selector, [...declarations]]),
  );
  assert.ok(mainRule(sheet('core.css'), FULL_SELECTOR), 'the core has no token root rule');
  assert.deepEqual(
    core.map(({ media, selector }) => `${media} ${selector}`),
    fullRules.map(({ media, selector }) => `${media} ${selector}`),
  );
});

test('S5 a tag sheet declares its tokens at zero specificity', () => {
  for (const tag of tags) {
    const css = sheet(`${tag}.css`);
    const [first] = rules(css);
    if (first === undefined) continue;
    assert.equal(first.media, '', `${tag}: the token rule must come first`);
    assert.equal(first.selector, COMPONENT_SELECTOR, `${tag}: token rule selector`);
  }
});

test('S7 the ki-card sheet re-points its more-contrast tokens as the full sheet does', () => {
  const card = rules(sheet('ki-card.css'));
  const modeRules = (list) =>
    list
      .filter(({ media, selector }) => media !== '' || selector.includes('data-ki-contrast'))
      .map(({ media, selector, declarations }) => [
        `${media} ${selector}`,
        [...declarations].filter(([name]) => name.startsWith('--ki-card-')),
      ])
      .filter(([, declarations]) => declarations.length > 0);
  const expected = modeRules(rules(full));
  assert.ok(expected.length >= 2, 'the full sheet re-points card tokens under more contrast');
  assert.deepEqual(modeRules(card), expected);
});

test('every split declaration carries the expression the full sheet gives it', () => {
  const fullByRule = new Map(
    rules(full).map(({ media, selector, declarations }) => [
      `${media}|${selector === COMPONENT_SELECTOR ? FULL_SELECTOR : selector}`,
      declarations,
    ]),
  );
  for (const file of ['core.css', ...tags.map((tag) => `${tag}.css`)]) {
    for (const { media, selector, declarations } of rules(sheet(file))) {
      const key = `${media}|${selector === COMPONENT_SELECTOR ? FULL_SELECTOR : selector}`;
      const expected = fullByRule.get(key);
      assert.ok(expected, `${file}: ${key} is not a rule of the full sheet`);
      for (const [name, value] of declarations) {
        assert.equal(value, expected.get(name), `${file}: ${name} under ${key}`);
      }
    }
  }
});

test('the core and the tag sheets together declare the full sheet’s tokens, foundations aside', () => {
  const split = new Set([
    ...customProperties(sheet('core.css')),
    ...tags.flatMap((tag) => [...customProperties(sheet(`${tag}.css`))]),
  ]);
  const expected = [...fullNames].filter((name) => !name.startsWith('--ki-foundation-'));
  assert.deepEqual([...split].sort(), expected.sort());
  assert.ok(fullMain.declarations.size > 3000);
});

// The full sheet keeps only the published onmars v1 glass images (spec 062
// S4, until 1.0.0); every other foundation is private, and material3 names
// none, so it reassigns only names the full sheet declares.
test('the full sheet declares the published foundations only, and material3 names none', () => {
  assert.deepEqual([...fullNames].filter((name) => name.startsWith('--ki-foundation-')).sort(), [
    '--ki-foundation-onmars-v1-dialog-bg-image',
    '--ki-foundation-onmars-v1-tooltip-arrow-end',
    '--ki-foundation-onmars-v1-tooltip-arrow-start',
    '--ki-foundation-onmars-v1-tooltip-bg-image',
  ]);
  assert.doesNotMatch(sheet('tokens.material3.css'), /--ki-foundation-/u);
  const undeclared = [...customProperties(sheet('tokens.material3.css'))].filter(
    (name) => !fullNames.has(name),
  );
  assert.deepEqual(undeclared, []);
});

test('S6 material3 reads only tokens the core, the tag sheets and itself declare', () => {
  const material3 = sheet('tokens.material3.css');
  const declared = new Set([
    ...customProperties(sheet('core.css')),
    ...tags.flatMap((tag) => [...customProperties(sheet(`${tag}.css`))]),
    ...customProperties(material3),
  ]);
  const missing = rules(material3).flatMap(({ declarations }) =>
    [...declarations].flatMap(([name, value]) =>
      references(value)
        .filter((reference) => !declared.has(reference))
        .map((reference) => `${name} -> ${reference}`),
    ),
  );
  assert.deepEqual(missing, []);
});

test('S8 the existing stylesheets keep the surface the public API records', () => {
  const recorded = JSON.parse(read('packages/elements/generated/public-api/index.json')).surface
    .packages['@kimen/tokens'].stylesheets;
  const existing = ['./css', './css/base', './css/material3'];
  const surface = buildPublicStylesheetSurface({
    packageExports: Object.fromEntries(
      existing.map((subpath) => [subpath, { target: tokensPackage.exports[subpath] }]),
    ),
    stylesheetSources: Object.fromEntries(
      existing.map((subpath) => [
        subpath,
        readFileSync(
          new URL(tokensPackage.exports[subpath], new URL('packages/tokens/', root)),
          'utf8',
        ),
      ]),
    ),
    publicTokenNames: Object.keys(recorded['./css'].contexts.light),
  });
  for (const subpath of existing) {
    assert.deepEqual(surface[subpath], recorded[subpath], subpath);
  }
});

test('S8 every existing export keeps its key and target, beside the two new ones', () => {
  assert.deepEqual(
    Object.fromEntries(
      ['./css', './css/base', './css/material3', './css/core', './css/ki-*'].map((key) => [
        key,
        tokensPackage.exports[key],
      ]),
    ),
    {
      './css': './dist/css/tokens.css',
      './css/base': './dist/css/base.css',
      './css/material3': './dist/css/tokens.material3.css',
      './css/core': './dist/css/core.css',
      './css/ki-*': './dist/css/ki-*.css',
    },
  );
  assert.deepEqual(tokensPackage.sideEffects, ['./css/*.css', './dist/css/*.css']);
});

test('S10 the size gate measures the approved budgets of the split', async () => {
  const configPath = fileURLToPath(new URL('packages/tokens/.size-limit.mjs', root));
  const { default: entries } = await import(configPath);
  const limitOf = (name) => entries.find((entry) => entry.name === name)?.limit;
  assert.equal(limitOf('onmars tokens stylesheet'), '19217 B');
  assert.equal(limitOf('core tokens stylesheet'), '7000 B');
  assert.equal(limitOf('page with ki-button: core and ki-button sheets'), '8324 B');
  assert.equal(limitOf('ten-component page: core and their sheets'), '11451 B');
  const tagEntries = entries.filter((entry) => entry.name.startsWith('tag sheet '));
  assert.deepEqual(
    tagEntries.map((entry) => entry.name),
    tags.map((tag) => `tag sheet ${tag}`),
  );
  assert.ok(tagEntries.every((entry) => entry.limit === '2200 B'));
  // A page is measured as one bundle of exactly the sheets it loads.
  const imports = (entryName) => {
    const { path } = entries.find((entry) => entry.name === entryName);
    return [
      ...read(`packages/tokens/${path}`).matchAll(
        /@import url\("\.\.\/dist\/css\/([a-z0-9-]+)\.css"\);/gu,
      ),
    ].map((match) => match[1]);
  };
  assert.deepEqual(imports('page with ki-button: core and ki-button sheets'), [
    'core',
    'ki-button',
  ]);
  assert.deepEqual(imports('ten-component page: core and their sheets'), [
    'core',
    'ki-button',
    'ki-input',
    'ki-select',
    'ki-option',
    'ki-checkbox',
    'ki-dialog',
    'ki-card',
    'ki-tabs',
    'ki-tab',
    'ki-tab-panel',
    'ki-alert',
    'ki-toast',
    'ki-toaster',
    'ki-table',
  ]);
});

test('S11 each component’s agent documentation names the token sheets it needs', () => {
  for (const tag of tags) {
    const document = read(`packages/elements/llms/${tag}.md`);
    assert.match(document, /^## Token stylesheets$/mu, tag);
    assert.ok(document.includes('`@kimen/tokens/css/core`'), `${tag} names the core`);
    assert.ok(document.includes(`\`@kimen/tokens/css/${tag}\``), `${tag} names its own sheet`);
  }
});

test('S11 each component’s site page names the token sheets it needs', () => {
  const api = read('site/docs/src/components/CemApi.astro');
  assert.match(api, /@kimen\/tokens\/css\/core/u);
  assert.match(api, /@kimen\/tokens\/css\/\$\{tag\}/u);
});
