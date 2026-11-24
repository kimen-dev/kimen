const CSS_EXPORT = /^\.\/css(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/u;
/** The default theme: the stylesheet every other theme overrides. */
const DEFAULT_THEME_EXPORT = './css';
/** The one exported stylesheet that consumes tokens instead of publishing them. */
const PAGE_CONTRACT_EXPORT = './css/base';
const THEME_FONT_EXPORTS = new Set(['./css/onmars-fonts.css', './css/material3-fonts.css']);
/**
 * The colour-scheme contract the default stylesheet opens with, in this order.
 * Scheme-dependent tokens are `light-dark()` values: without these rules they
 * never leave their light branch.
 *
 * The document default sits at zero specificity (`:where()`), so the
 * `color-scheme` a host page declares for its own document
 * (`html { color-scheme: light }`) wins in either stylesheet order; the two
 * forced schemes keep their specificity. A bare `:root` here would be a
 * different contract — one that overrides the host — and is rejected.
 */
const SCHEME_CONTRACT = [
  [':where(:root)', 'light dark'],
  ["[data-ki-color-scheme='light']", 'light'],
  ["[data-ki-color-scheme='dark']", 'dark'],
];
/** The root, and — at zero specificity — the root of any themed subtree. */
const DEFAULT_THEME_SELECTOR = ':root,:where([data-ki-theme])';
/**
 * The modes (specs 043/044), in the order a stylesheet must declare them.
 * Each is published, when the default stylesheet declares it, as one context
 * per scheme. A mode is a media-query block and a declaration rule carrying
 * the same declarations, every one `!important` and re-pointing a token to
 * the token that holds its value under the mode (`--ki-<mode>-<token>`), so
 * the mode applies over any theme and a theme chooses its mode values by
 * setting those tokens. `activations` lists the declarations that switch it
 * on, the first being its own, so more contrast also applies the reduced
 * transparency block. Selectors are compared with their whitespace collapsed,
 * not removed: a descendant combinator is part of the contract.
 */
const MODE_CONTRACT = [
  {
    name: 'reduced-transparency',
    media: '@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)',
    activations: ["[data-ki-transparency='reduce']", "[data-ki-contrast='more']"],
  },
  {
    name: 'contrast-more',
    media: '@media (prefers-contrast: more)',
    activations: ["[data-ki-contrast='more']"],
  },
];

/**
 * Density levels (spec 045), in the order a stylesheet declares them, each
 * published as one context per scheme; `default` follows them and restores
 * the document-inherited tokens they reassign.
 */
const DENSITY_CONTRACT = ['compact', 'touch'];

function modeSelectors(mode) {
  const activation = mode.activations.join(', ');
  return {
    preference: ':root, :where([data-ki-theme])',
    declared: [
      `:root:where(${activation})`,
      `:where([data-ki-theme]:is(${activation}))`,
      `:where(:is(:root, [data-ki-theme]):is(${activation}) [data-ki-theme])`,
    ].join(', '),
  };
}
const SCHEMES = ['light', 'dark'];
const CUSTOM_PROPERTY = /^--ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Private comparison values for the spec 061 compatibility bridge.
const BACKDROP_DEFAULTS = new Set([
  '--_ki-backdrop-filter-default',
  '--_ki-listbox-backdrop-filter-default',
]);
const ZERO_DIMENSION =
  /(^|[^a-zA-Z0-9_.-])[-+]?0(?:\.0+)?(?:ch|cm|dvh|dvw|em|ex|in|lh|mm|pc|pt|px|q|rem|rlh|svh|svw|vh|vmax|vmin|vw)(?=$|[^a-zA-Z0-9_-])/giu;
const LENGTH =
  /^-?(?:0|(?:\d+|\d*\.\d+)(?:ch|cm|dvh|dvw|em|ex|in|lh|mm|pc|pt|px|q|rem|rlh|svh|svw|vh|vmax|vmin|vw))$/iu;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function assertRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
}

export function stripComments(source, label) {
  let result = '';
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote !== null) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) throw new Error(`${label} contains an unterminated CSS comment`);
      result += ' ';
      index = end + 1;
      continue;
    }
    result += character;
  }
  if (quote !== null) throw new Error(`${label} contains an unterminated CSS string`);
  return result;
}

function findStructuralCharacter(source, start, wanted, label) {
  let quote = null;
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === wanted && parentheses === 0 && brackets === 0) return index;
    if (parentheses < 0 || brackets < 0) {
      throw new Error(`${label} contains unbalanced CSS syntax`);
    }
  }
  return -1;
}

function matchingBrace(source, opening, label) {
  let quote = null;
  let escaped = false;
  let depth = 1;
  for (let index = opening + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`${label} contains an unclosed CSS block`);
}

export function splitTopLevel(source, delimiter, label) {
  const result = [];
  let start = 0;
  let quote = null;
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === delimiter && parentheses === 0 && brackets === 0) {
      result.push(source.slice(start, index));
      start = index + 1;
    }
    if (parentheses < 0 || brackets < 0) {
      throw new Error(`${label} contains unbalanced CSS syntax`);
    }
  }
  if (quote !== null || parentheses !== 0 || brackets !== 0) {
    throw new Error(`${label} contains unbalanced CSS syntax`);
  }
  result.push(source.slice(start));
  return result;
}

function plainDeclarations(body, label) {
  if (body.includes('{') || body.includes('}')) {
    throw new Error(`${label} contains an unexpected nested rule`);
  }
  const result = [];
  for (const raw of splitTopLevel(body, ';', label)) {
    const declaration = raw.trim();
    if (declaration === '') continue;
    const colon = declaration.indexOf(':');
    if (colon <= 0) throw new Error(`${label} contains an invalid declaration`);
    result.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
  }
  return result;
}

const IMPORTANT = /\s*!\s*important$/iu;

/**
 * The custom properties a rule declares. Only a mode's rules are `!important`,
 * and every declaration in them is: `important` says which kind `body` is.
 */
function declarations(body, label, privateNames = new Set(), { important = false } = {}) {
  const result = new Map();
  for (const [name, declared] of plainDeclarations(body, label)) {
    if (IMPORTANT.test(declared) !== important) {
      throw new Error(`${label} declares ${name}${important ? ' without' : ' with'} !important`);
    }
    const value = declared.replace(IMPORTANT, '');
    if ((!CUSTOM_PROPERTY.test(name) && !privateNames.has(name)) || value === '') {
      throw new Error(`${label} contains unsupported declaration ${name || '<empty>'}`);
    }
    if (result.has(name)) throw new Error(`${label} declares ${name} more than once`);
    result.set(name, value);
  }
  for (const name of privateNames) result.delete(name);
  if (result.size === 0) throw new Error(`${label} contains no Kimen custom properties`);
  return result;
}

function canonicalPrelude(prelude) {
  return prelude
    .trim()
    .replaceAll(/"([^"\\]*)"/gu, "'$1'")
    .replaceAll(/\s+/gu, '');
}

/** Whitespace collapsed, never removed, and normalized around `,`, `(` and `)`. */
function spacedPrelude(prelude) {
  return prelude
    .trim()
    .replaceAll(/"([^"\\]*)"/gu, "'$1'")
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\s*,\s*/gu, ', ')
    .replaceAll(/\(\s+/gu, '(')
    .replaceAll(/\s+\)/gu, ')');
}

/** The top-level rules of a theme stylesheet. It has no conditional rules at all. */
function parseRules(source, label, { allowFontFace = false } = {}) {
  const rules = [];
  let cursor = 0;
  while (cursor < source.length) {
    while (cursor < source.length && /[\s;]/u.test(source[cursor])) cursor += 1;
    if (cursor >= source.length) break;
    const opening = findStructuralCharacter(source, cursor, '{', label);
    if (opening === -1) throw new Error(`${label} contains trailing CSS outside a block`);
    const prelude = source.slice(cursor, opening).trim();
    if (prelude === '') throw new Error(`${label} contains a block without a prelude`);
    const closing = matchingBrace(source, opening, label);
    const selector = canonicalPrelude(prelude);
    if (selector.startsWith('@') && !(allowFontFace && prelude === '@font-face')) {
      // The scheme is `color-scheme` plus `light-dark()`, never a media query:
      // a conditional rule here would be a second, divergent scheme switch.
      // The only conditional rules are the preference blocks of the modes.
      const media = spacedPrelude(prelude);
      if (!MODE_CONTRACT.some((mode) => mode.media === media)) {
        throw new Error(`${label} contains unsupported conditional rule ${prelude}`);
      }
      const nested = parseRules(source.slice(opening + 1, closing), `${label} ${media}`);
      rules.push({ selector, prelude, media, nested });
      cursor = closing + 1;
      continue;
    }
    rules.push({ selector, prelude, body: source.slice(opening + 1, closing) });
    cursor = closing + 1;
  }
  return rules;
}

function mergeDeclarations(base, override) {
  return new Map([...base, ...override]);
}

function matchingParenthesis(source, opening, label) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let index = opening + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`${label} contains an unclosed var() reference`);
}

function replaceVariables(value, resolveProperty, label) {
  let result = '';
  let cursor = 0;
  while (cursor < value.length) {
    const match = /var\s*\(/giu.exec(value.slice(cursor));
    if (match === null) {
      result += value.slice(cursor);
      break;
    }
    const start = cursor + match.index;
    const opening = start + match[0].lastIndexOf('(');
    const closing = matchingParenthesis(value, opening, label);
    result += value.slice(cursor, start);
    const arguments_ = splitTopLevel(value.slice(opening + 1, closing), ',', label);
    const reference = arguments_.shift()?.trim();
    if (typeof reference !== 'string' || !CUSTOM_PROPERTY.test(reference)) {
      throw new Error(`${label} contains an invalid var() reference`);
    }
    let replacement;
    try {
      replacement = resolveProperty(reference);
    } catch (error) {
      if (arguments_.length === 0) throw error;
      replacement = replaceVariables(arguments_.join(',').trim(), resolveProperty, label);
    }
    result += replacement;
    cursor = closing + 1;
  }
  return result;
}

/** Replace every `light-dark(a, b)` with the branch the scheme selects. */
function selectScheme(value, scheme, label) {
  let result = '';
  let cursor = 0;
  while (cursor < value.length) {
    const match = /light-dark\s*\(/giu.exec(value.slice(cursor));
    if (match === null) {
      result += value.slice(cursor);
      break;
    }
    const start = cursor + match.index;
    const opening = start + match[0].lastIndexOf('(');
    const closing = matchingParenthesis(value, opening, label);
    const branches = splitTopLevel(value.slice(opening + 1, closing), ',', label).map((branch) =>
      branch.trim(),
    );
    if (branches.length !== 2 || branches.includes('')) {
      throw new Error(`${label} contains a light-dark() that does not take exactly two values`);
    }
    result += value.slice(cursor, start);
    result += selectScheme(branches[SCHEMES.indexOf(scheme)], scheme, label);
    cursor = closing + 1;
  }
  return result;
}

function normalizeShadow(value) {
  return splitTopLevel(value, ',', 'shadow value')
    .map((layer) => {
      const tokens = layer.trim().split(/\s+/u);
      let lengthCount = 0;
      while (lengthCount < tokens.length && LENGTH.test(tokens[lengthCount])) lengthCount += 1;
      if (lengthCount === 3) tokens.splice(3, 0, '0');
      return tokens.join(' ');
    })
    .join(',');
}

// A translucent ramp variant is an sRGB mix of its step with `transparent`
// (spec 001 S15). The mix is premultiplied, so it is the step's channels at
// the scaled alpha: the same effective value an rgba() literal publishes, and
// the snapshot records it that way. Any other mix is left as written.
const TRANSPARENT_MIX =
  /color-mix\(in srgb,(#[0-9a-f]{6}|rgba?\(\d+,\d+,\d+(?:,[\d.]+)?\)) (\d+(?:\.\d+)?)%,transparent\)/giu;

function mixedWithTransparent(_, colour, percent) {
  let channels;
  let alpha = 1;
  if (colour.startsWith('#')) {
    channels = [1, 3, 5].map((start) => Number.parseInt(colour.slice(start, start + 2), 16));
  } else {
    const parts = colour
      .slice(colour.indexOf('(') + 1, -1)
      .split(',')
      .map(Number);
    channels = parts.slice(0, 3);
    alpha = parts[3] ?? 1;
  }
  return `rgba(${channels.join(',')},${Number(((alpha * Number(percent)) / 100).toFixed(4))})`;
}

function normalizeCssValue(value, propertyName) {
  let normalized = value
    .trim()
    .replaceAll(ZERO_DIMENSION, '$10')
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\(\s+/gu, '(')
    .replaceAll(/\s+\)/gu, ')')
    .replaceAll(/\s*,\s*/gu, ',')
    .replaceAll(/\s*\/\s*/gu, '/')
    .replaceAll(TRANSPARENT_MIX, mixedWithTransparent);
  if (normalized.toLowerCase() === 'linear') normalized = 'cubic-bezier(0,0,1,1)';
  if (propertyName.endsWith('-shadow') && normalized.toLowerCase() !== 'none') {
    normalized = normalizeShadow(normalized);
  }
  return normalized;
}

function resolvedPublicValues(declarationMap, publicTokenNames, scheme, label) {
  const cache = new Map();
  const resolving = [];
  const resolveProperty = (name) => {
    if (cache.has(name)) return cache.get(name);
    const cycle = resolving.indexOf(name);
    if (cycle !== -1) {
      throw new Error(
        `${label} contains a custom-property cycle: ${[...resolving.slice(cycle), name].join(' -> ')}`,
      );
    }
    const raw = declarationMap.get(name);
    if (raw === undefined) throw new Error(`${label} references missing custom property ${name}`);
    resolving.push(name);
    const resolved = normalizeCssValue(
      selectScheme(
        replaceVariables(raw, resolveProperty, `${label} ${name}`),
        scheme,
        `${label} ${name}`,
      ),
      name,
    );
    resolving.pop();
    cache.set(name, resolved);
    return resolved;
  };

  return sortedObject(
    publicTokenNames.map((name) => {
      if (!declarationMap.has(name)) throw new Error(`${label} is missing public token ${name}`);
      return [name, resolveProperty(name)];
    }),
  );
}

function contexts(declarationMaps, publicTokenNames, label) {
  return sortedObject(
    [...declarationMaps].flatMap(([mode, declarationMap]) =>
      SCHEMES.map((scheme) => {
        const name = mode === '' ? scheme : `${mode}/${scheme}`;
        return [
          name,
          resolvedPublicValues(declarationMap, publicTokenNames, scheme, `${label} ${name}`),
        ];
      }),
    ),
  );
}

function sameDeclarations(left, right) {
  return left.size === right.size && [...left].every(([name, value]) => right.get(name) === value);
}

/**
 * The mode blocks that follow the default stylesheet's own rules: for each
 * mode of the contract, in order, either nothing or its preference block (one
 * rule) and its declaration rule, with exactly the same declarations, each
 * re-pointing a token the stylesheet declares to its declared mode value.
 */
function modeDeclarations(rules, { label, known }) {
  const modes = new Map();
  let index = 0;
  for (const mode of MODE_CONTRACT) {
    const preference = rules[index];
    if (preference?.media !== mode.media) continue;
    const selectors = modeSelectors(mode);
    const [inner, ...extra] = preference.nested;
    const declared = rules[index + 1];
    if (
      extra.length > 0 ||
      inner === undefined ||
      inner.media !== undefined ||
      spacedPrelude(inner.prelude) !== selectors.preference ||
      declared === undefined ||
      declared.media !== undefined ||
      spacedPrelude(declared.prelude) !== selectors.declared
    ) {
      throw new Error(`${label} contains an unsupported public rule for mode ${mode.name}`);
    }
    const important = { important: true };
    const underPreference = declarations(
      inner.body,
      `${label} ${mode.media}`,
      new Set(),
      important,
    );
    const underDeclaration = declarations(
      declared.body,
      `${label} rule ${declared.prelude}`,
      new Set(),
      important,
    );
    if (!sameDeclarations(underPreference, underDeclaration)) {
      throw new Error(
        `${label} mode ${mode.name} declares different tokens under its preference and its declaration`,
      );
    }
    for (const [name, value] of underDeclaration) {
      if (!known.has(name)) {
        throw new Error(
          `${label} mode ${mode.name} declares ${name}, which the token rule does not`,
        );
      }
      const modeValue = `--ki-${mode.name}-${name.slice('--ki-'.length)}`;
      if (value !== `var(${modeValue})` || !known.has(modeValue)) {
        throw new Error(
          `${label} mode ${mode.name} must re-point ${name} to its declared mode value ${modeValue}`,
        );
      }
    }
    modes.set(mode.name, underDeclaration);
    index += 2;
  }
  if (index !== rules.length) throw new Error(`${label} contains an unsupported public rule`);
  return modes;
}

/** Every mode that `mode`'s own declaration switches on, in contract order. */
function activatedBy(mode) {
  const [own] = mode.activations;
  return MODE_CONTRACT.filter((candidate) => candidate.activations.includes(own));
}

/**
 * The default theme stylesheet: the colour-scheme contract, then every token in
 * one rule that matches the root and the root of any themed subtree.
 */
function defaultThemeDeclarations(css, label) {
  const rules = parseRules(stripComments(css, label), label);
  const order = SCHEME_CONTRACT.map(([selector]) => selector).join(', ');
  for (const [index, [selector, value]] of SCHEME_CONTRACT.entries()) {
    const rule = rules[index];
    if (rule?.selector !== selector) {
      throw new Error(`${label} must declare, in order, ${order} before its tokens`);
    }
    const declared = plainDeclarations(rule.body, `${label} rule ${rule.prelude}`);
    if (
      declared.length !== 1 ||
      declared[0][0] !== 'color-scheme' ||
      declared[0][1].replaceAll(/\s+/gu, ' ') !== value
    ) {
      throw new Error(`${label} ${selector} must declare exactly color-scheme: ${value}`);
    }
  }
  const tokens = rules[SCHEME_CONTRACT.length];
  if (tokens?.selector !== DEFAULT_THEME_SELECTOR) {
    throw new Error(`${label} must declare its tokens in one ${DEFAULT_THEME_SELECTOR} rule`);
  }
  const contextual = declarations(
    tokens.body,
    `${label} rule ${tokens.prelude}`,
    BACKDROP_DEFAULTS,
  );
  let index = SCHEME_CONTRACT.length + 1;
  // Document-inherited tokens (spec 045): one `:root` rule, then each density
  // level and `default`, each reassigning only those tokens.
  let inherited = new Map();
  const densities = new Map();
  if (rules[index]?.selector === ':root' && rules[index].media === undefined) {
    inherited = declarations(rules[index].body, `${label} rule ${rules[index].prelude}`);
    for (const name of inherited.keys()) {
      if (contextual.has(name)) {
        throw new Error(
          `${label} declares ${name} both on its theme roots and as inherited from the document`,
        );
      }
    }
    index += 1;
    for (const level of [...DENSITY_CONTRACT, 'default']) {
      const rule = rules[index];
      if (rule?.selector !== `[data-ki-density='${level}']` || rule.media !== undefined) {
        throw new Error(`${label} must declare the density ${level} after its inherited tokens`);
      }
      const levelDeclarations = declarations(rule.body, `${label} rule ${rule.prelude}`);
      for (const name of levelDeclarations.keys()) {
        if (!inherited.has(name)) {
          throw new Error(
            `${label} density ${level} reassigns ${name}, which is not inherited from the document`,
          );
        }
      }
      densities.set(level, levelDeclarations);
      index += 1;
    }
    const reassigned = new Set(
      DENSITY_CONTRACT.flatMap((level) => [...densities.get(level).keys()]),
    );
    const restored = densities.get('default');
    if (
      restored.size !== reassigned.size ||
      [...reassigned].some((name) => restored.get(name) !== inherited.get(name))
    ) {
      throw new Error(`${label} density default must restore every inherited token`);
    }
    densities.delete('default');
  }
  const base = mergeDeclarations(contextual, inherited);
  const modes = modeDeclarations(rules.slice(index), { label, known: base });
  return { base, modes, densities };
}

/**
 * An opt-in theme stylesheet: one rule of overrides, scoped to a themed
 * document and to a themed subtree. It declares only what it changes, so its
 * effective contract is the default stylesheet's with those overrides applied —
 * and it may reassign that contract, never extend it. Its mode values are
 * overrides like any other: the default stylesheet's modes re-point to them.
 */
function themeDeclarations({ css, theme, label, base }) {
  const selector = `:root[data-ki-theme='${theme}'],[data-ki-theme='${theme}']`;
  const rules = parseRules(stripComments(css, label), label);
  if (rules.length !== 1 || rules[0].selector !== selector || rules[0].media !== undefined) {
    throw new Error(`${label} must contain exactly the rule ${selector}`);
  }
  const overrides = declarations(rules[0].body, `${label} rule ${rules[0].prelude}`);
  for (const name of overrides.keys()) {
    if (!base.base.has(name)) {
      throw new Error(
        `${label} declares ${name}, which the ${DEFAULT_THEME_EXPORT} stylesheet does not`,
      );
    }
  }
  return { base: base.base, baseModes: base.modes, densities: base.densities, overrides };
}

/**
 * The declaration map in effect in each published context: the standard
 * appearance, and each mode the default stylesheet declares, layered in the
 * cascade order the stylesheets are built for (default rule, theme overrides,
 * then the modes, whose important declarations outrank both).
 */
function contextDeclarations({ base, baseModes, densities = new Map(), overrides = new Map() }) {
  const layer = (maps) => maps.reduce((merged, map) => mergeDeclarations(merged, map), new Map());
  const result = new Map([['', layer([base, overrides])]]);
  for (const [level, levelDeclarations] of densities) {
    result.set(level, layer([base, overrides, levelDeclarations]));
  }
  for (const mode of MODE_CONTRACT) {
    if (!baseModes.has(mode.name)) continue;
    const active = activatedBy(mode).map((candidate) => candidate.name);
    result.set(
      mode.name,
      layer([
        base,
        overrides,
        ...active.filter((name) => baseModes.has(name)).map((name) => baseModes.get(name)),
      ]),
    );
  }
  return result;
}

// The page contract may declare one literal, in one place (spec 001 S17):
// before its elements register, it lays Kimen tags out as blocks, so the items
// of a group do not run together on one line. That rule is layout, not paint —
// `display: block` on `:where(ki-…):where(:not(:defined))`, at zero
// specificity, and nothing else — and it stops matching the moment a tag
// registers.
const PRE_REGISTRATION =
  /^:where\(ki-[a-z0-9]+(?:-[a-z0-9]+)*(?:,ki-[a-z0-9]+(?:-[a-z0-9]+)*)*\):where\(:not\(:defined\)\)$/u;

function isPreRegistrationLayout(rule, property, value) {
  return PRE_REGISTRATION.test(rule.selector) && property === 'display' && value === 'block';
}

/**
 * The page contract (`./css/base`) is the one exported stylesheet that PUBLISHES
 * no tokens: it only consumes them, so it carries none of the token surface and
 * is exempt from the theme grammar above. It paints the page — background,
 * text colour, typeface — from the tokens a theme stylesheet publishes.
 *
 * The exemption is narrow and fails closed in both directions: declaring any
 * `--ki-*` custom property here would smuggle a token past the surface gate,
 * and declaring a literal value would bypass Art. VI. Both are rejected. That
 * includes `color-scheme`: the default theme stylesheet owns it, and a
 * `:root { color-scheme }` loaded after it would tie with
 * `[data-ki-color-scheme]` on the root and win by order, silently undoing a
 * forced scheme.
 */
function onePageContract({ subpath, target, css }) {
  const label = `${subpath} stylesheet`;
  const source = stripComments(css, label);
  const rules = parseRules(source, label);
  for (const rule of rules) {
    for (const [property, value] of plainDeclarations(rule.body, label)) {
      if (value === '') throw new Error(`${label} contains unsupported declaration ${property}`);
      if (property.startsWith('--')) {
        throw new Error(`${label} must not publish token ${property}`);
      }
      if (isPreRegistrationLayout(rule, property, value)) continue;
      const references = [...value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/gu)].map(
        (match) => match[1],
      );
      if (references.length === 0) {
        throw new Error(`${label} declares the hardcoded value ${property}: ${value}`);
      }
      for (const name of references) {
        if (!CUSTOM_PROPERTY.test(name)) {
          throw new Error(`${label} references non-public custom property ${name}`);
        }
      }
    }
  }
  if (rules.length === 0) throw new Error(`${label} declares no page contract`);
  return { target, pageContract: true };
}

function assertFontStylesheet(css, label) {
  const rules = parseRules(stripComments(css, label), label, { allowFontFace: true });
  if (rules.length === 0 || rules.some(({ prelude }) => prelude !== '@font-face')) {
    throw new Error(`${label} must contain only @font-face rules`);
  }
  for (const { body } of rules) {
    if (plainDeclarations(body, label).some(([name]) => name.startsWith('--'))) {
      throw new Error(`${label} must not declare custom properties`);
    }
  }
}

/** Build the effective public-token contract of each exported combined stylesheet. */
export function buildPublicStylesheetSurface({
  packageExports,
  publicTokenNames,
  stylesheetSources,
}) {
  const exports = assertRecord(packageExports, 'token package exports');
  const sources = assertRecord(stylesheetSources, 'stylesheet sources');
  if (!Array.isArray(publicTokenNames) || publicTokenNames.length === 0) {
    throw new TypeError('publicTokenNames must be a non-empty array');
  }
  const names = [...new Set(publicTokenNames)];
  if (
    names.length !== publicTokenNames.length ||
    names.some((name) => !CUSTOM_PROPERTY.test(name))
  ) {
    throw new TypeError('publicTokenNames must contain unique --ki-* custom property names');
  }
  names.sort((left, right) => left.localeCompare(right));

  const cssExports = Object.entries(exports).filter(([, entry]) => {
    const target = isRecord(entry) ? entry.target : null;
    return typeof target === 'string' && target.endsWith('.css');
  });
  const expectedSubpaths = new Set(cssExports.map(([subpath]) => subpath));
  for (const subpath of Object.keys(sources)) {
    if (!expectedSubpaths.has(subpath))
      throw new Error(`stylesheet source ${subpath} is not exported`);
  }
  const sourceOf = (subpath) => {
    const css = sources[subpath];
    if (typeof css !== 'string' || css.trim() === '') {
      throw new Error(`${subpath} stylesheet source must be a non-empty string`);
    }
    return css;
  };
  let defaultTheme;
  const defaultThemeOf = (label) => {
    if (!expectedSubpaths.has(DEFAULT_THEME_EXPORT)) {
      throw new Error(
        `${label} overrides the ${DEFAULT_THEME_EXPORT} stylesheet, which is not exported`,
      );
    }
    defaultTheme ??= defaultThemeDeclarations(
      sourceOf(DEFAULT_THEME_EXPORT),
      `${DEFAULT_THEME_EXPORT} stylesheet`,
    );
    return defaultTheme;
  };
  const tokenExports = cssExports.filter(([subpath]) => {
    if (!THEME_FONT_EXPORTS.has(subpath)) return true;
    // The package export is sealed with the other entry points. A face-only
    // sheet has no effective token values to add to the stylesheet snapshot.
    assertFontStylesheet(sourceOf(subpath), `${subpath} stylesheet`);
    return false;
  });
  return sortedObject(
    tokenExports.map(([subpath, entry]) => {
      const target = entry.target;
      const css = sourceOf(subpath);
      const label = `${subpath} stylesheet`;
      if (subpath === PAGE_CONTRACT_EXPORT) {
        return [subpath, onePageContract({ subpath, target, css })];
      }
      const match = CSS_EXPORT.exec(subpath);
      if (match === null) throw new Error(`${subpath} is not a supported public CSS export`);
      const theme = match[1];
      const layers =
        theme === undefined
          ? {
              base: defaultThemeOf(label).base,
              baseModes: defaultThemeOf(label).modes,
              densities: defaultThemeOf(label).densities,
            }
          : themeDeclarations({ css, theme, label, base: defaultThemeOf(label) });
      return [subpath, { target, contexts: contexts(contextDeclarations(layers), names, label) }];
    }),
  );
}
