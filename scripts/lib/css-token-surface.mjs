const CSS_EXPORT = /^\.\/css(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/u;
const CUSTOM_PROPERTY = /^--ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
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

function stripComments(source, label) {
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

function splitTopLevel(source, delimiter, label) {
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

function declarations(body, label) {
  if (body.includes('{') || body.includes('}')) {
    throw new Error(`${label} contains an unexpected nested rule`);
  }
  const result = new Map();
  for (const raw of splitTopLevel(body, ';', label)) {
    const declaration = raw.trim();
    if (declaration === '') continue;
    const colon = declaration.indexOf(':');
    if (colon <= 0) throw new Error(`${label} contains an invalid declaration`);
    const name = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!CUSTOM_PROPERTY.test(name) || value === '') {
      throw new Error(`${label} contains unsupported declaration ${name || '<empty>'}`);
    }
    if (result.has(name)) throw new Error(`${label} declares ${name} more than once`);
    result.set(name, value);
  }
  if (result.size === 0) throw new Error(`${label} contains no Kimen custom properties`);
  return result;
}

function canonicalPrelude(prelude) {
  return prelude
    .trim()
    .replaceAll(/"([^"\\]*)"/gu, "'$1'")
    .replaceAll(/\s+/gu, '');
}

function parseRules(source, label, media = null, output = []) {
  let cursor = 0;
  while (cursor < source.length) {
    while (cursor < source.length && /[\s;]/u.test(source[cursor])) cursor += 1;
    if (cursor >= source.length) break;
    const opening = findStructuralCharacter(source, cursor, '{', label);
    if (opening === -1) throw new Error(`${label} contains trailing CSS outside a block`);
    const prelude = source.slice(cursor, opening).trim();
    if (prelude === '') throw new Error(`${label} contains a block without a prelude`);
    const closing = matchingBrace(source, opening, label);
    const body = source.slice(opening + 1, closing);
    const canonical = canonicalPrelude(prelude);
    if (canonical.startsWith('@')) {
      if (canonical !== '@media(prefers-color-scheme:dark)' || media !== null) {
        throw new Error(`${label} contains unsupported conditional rule ${prelude}`);
      }
      parseRules(body, label, canonical, output);
    } else {
      output.push({
        selector: canonical,
        media,
        declarations: declarations(body, `${label} rule ${prelude}`),
      });
    }
    cursor = closing + 1;
  }
  return output;
}

function findOneRule(rules, selector, media, label) {
  const matches = rules.filter((rule) => rule.selector === selector && rule.media === media);
  if (matches.length !== 1) {
    throw new Error(
      `${label} must contain exactly one ${selector} rule in ${media ?? 'light'} context`,
    );
  }
  return matches[0].declarations;
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

function normalizeCssValue(value, propertyName) {
  let normalized = value
    .trim()
    .replaceAll(ZERO_DIMENSION, '$10')
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\(\s+/gu, '(')
    .replaceAll(/\s+\)/gu, ')')
    .replaceAll(/\s*,\s*/gu, ',')
    .replaceAll(/\s*\/\s*/gu, '/');
  if (normalized.toLowerCase() === 'linear') normalized = 'cubic-bezier(0,0,1,1)';
  if (propertyName.endsWith('-shadow') && normalized.toLowerCase() !== 'none') {
    normalized = normalizeShadow(normalized);
  }
  return normalized;
}

function resolvedPublicValues(declarationMap, publicTokenNames, label) {
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
      replaceVariables(raw, resolveProperty, `${label} ${name}`),
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

function stylesheetSelectors(subpath, theme) {
  const base = theme === undefined ? ':root' : `:root[data-ki-theme='${theme}']`;
  return {
    light: base,
    automaticDark: `${base}:not([data-ki-color-scheme='light'])`,
    forcedDark: `${base}[data-ki-color-scheme='dark']`,
    label: `${subpath} stylesheet`,
  };
}

function oneStylesheet({ subpath, target, css, publicTokenNames }) {
  const match = CSS_EXPORT.exec(subpath);
  if (match === null) throw new Error(`${subpath} is not a supported public CSS export`);
  const selectors = stylesheetSelectors(subpath, match[1]);
  const rules = parseRules(stripComments(css, selectors.label), selectors.label);
  const light = findOneRule(rules, selectors.light, null, selectors.label);
  const automaticOverride = findOneRule(
    rules,
    selectors.automaticDark,
    '@media(prefers-color-scheme:dark)',
    selectors.label,
  );
  const forcedOverride = findOneRule(rules, selectors.forcedDark, null, selectors.label);
  if (rules.length !== 3) {
    throw new Error(`${selectors.label} contains an unsupported public rule`);
  }
  const lightValues = resolvedPublicValues(light, publicTokenNames, `${selectors.label} light`);
  const automaticValues = resolvedPublicValues(
    mergeDeclarations(light, automaticOverride),
    publicTokenNames,
    `${selectors.label} automatic dark`,
  );
  const forcedValues = resolvedPublicValues(
    mergeDeclarations(light, forcedOverride),
    publicTokenNames,
    `${selectors.label} forced dark`,
  );
  if (JSON.stringify(automaticValues) !== JSON.stringify(forcedValues)) {
    throw new Error(`${selectors.label} automatic and forced dark contexts diverge`);
  }
  return { target, contexts: { light: lightValues, dark: automaticValues } };
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
  return sortedObject(
    cssExports.map(([subpath, entry]) => {
      const target = entry.target;
      const css = sources[subpath];
      if (typeof css !== 'string' || css.trim() === '') {
        throw new Error(`${subpath} stylesheet source must be a non-empty string`);
      }
      return [subpath, oneStylesheet({ subpath, target, css, publicTokenNames: names })];
    }),
  );
}
