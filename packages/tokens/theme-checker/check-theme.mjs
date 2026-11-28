import { Buffer } from 'node:buffer';
import { brotliDecompressSync } from 'node:zlib';
import { TokenType as T } from '@csstools/css-tokenizer';

import packedData from '../dist/theme-checker-data.mjs';
import { tokenValue, visitDeclarations } from './css-declarations.mjs';

const LENGTH_UNIT =
  /^(?:cap|ch|cm|em|ex|ic|in|lh|mm|pc|pt|px|q|r(?:cap|ch|em|ex|ic|lh)|(?:[sld]?v|cq)(?:b|h|i|max|min|w))$/iu;
const SIZE_KEYWORD =
  /^(?:auto|contain|fit-content|max-content|min-content|none|normal|stretch|(?:-webkit-|-moz-)?fill-available|available|thin|medium|thick|xx?-small|small|large|xx?x?-large|larger|smaller|math)$/iu;
const GLOBAL_KEYWORD = /^(?:inherit|initial|revert(?:-layer|-rule)?|unset)$/iu;
const COLOR_FUNCTION =
  /^(?:color(?:-mix)?|contrast-color|device-cmyk|hsla?|hwb|lab|lch|light-dark|oklab|oklch|rgba?)$/iu;
const TOKEN_TYPES = ['', 'color', 'dimension', 'duration'];

let inventory;

function tokenEntries(branches, flags, prefix) {
  return branches.flatMap((branch) => {
    if (typeof branch === 'string') return [[`${prefix}${branch ? `-${branch}` : ''}`, flags]];
    const [part, children] = branch;
    return tokenEntries(children, flags, `${prefix}-${part}`);
  });
}

function getInventory() {
  if (inventory !== undefined) return inventory;
  const [modeData, groups] = JSON.parse(
    brotliDecompressSync(Buffer.from(packedData, 'base64')).toString(),
  );
  // Suggestions with the same edit distance keep their alphabetical order.
  const entries = groups.flatMap(([flags, branches]) => tokenEntries(branches, flags, '--ki'));
  entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const tokens = new Map(entries);
  const modes = { media: new Map(), attributes: new Map() };
  const add = (map, key, flag) => map.set(key, (map.get(key) ?? 0) | flag);
  for (const [index, { activations, media }] of modeData.entries()) {
    const flag = 1 << index;
    for (const [, name, value] of media.matchAll(/\(([\w-]+):\s*([\w-]+)\)/gu)) {
      add(modes.media, `${name}:${value}`, flag);
    }
    for (const activation of activations) {
      const [, name, value] = /^\[([\w-]+)='([\w-]+)'\]$/u.exec(activation);
      add(modes.attributes, `${name}=${value}`, flag);
    }
  }
  inventory = { tokens, modes, modeNames: modeData.map(({ name }) => name) };
  return inventory;
}

function distance(left, right, limit, row) {
  // Strip the shared prefix and suffix before doing the edit-distance work.
  let prefix = 0;
  while (prefix < left.length && left[prefix] === right[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < Math.min(left.length, right.length) - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  left = left.slice(prefix, left.length - suffix);
  right = right.slice(prefix, right.length - suffix);
  for (let j = 0; j <= right.length; j += 1) row[j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    let best = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = row[j];
      row[j] = Math.min(
        row[j - 1] + 1,
        cost + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      previous = cost;
      best = Math.min(best, row[j]);
    }
    if (best > limit) return best;
  }
  return row[right.length];
}

function suggest(name, tokens) {
  const defaultSize = name.replace('-md-', '-');
  if (tokens.has(defaultSize)) return `Did you mean ${defaultSize}?`;

  if (name.length <= 128) {
    let limit = 3;
    let nearest = [];
    const row = new Uint8Array(name.length + limit + 1);
    for (const candidate of tokens.keys()) {
      if (Math.abs(candidate.length - name.length) > limit) continue;
      const edits = distance(name, candidate, limit, row);
      if (edits < limit) {
        nearest = [];
        limit = edits;
      }
      if (edits === limit && nearest.length < 3) nearest.push(candidate);
    }
    if (nearest.length > 0) return `Did you mean ${nearest.join(', ')}?`;
  }
  return 'Use a public Kimen token from the token reference.';
}

function checkValue(type, value, report) {
  const [first] = value;
  const kind = first?.[0];
  const single = value.length === 1;
  const unit = first?.[4]?.unit ?? '';
  const identifier = tokenValue(first);
  if (single && kind === T.Ident && GLOBAL_KEYWORD.test(identifier)) return;
  if (type === 'dimension') {
    if (single && kind === T.Number) {
      report('unitless-dimension', `Add a length unit, for example ${first[1]}px.`);
    } else {
      // Some length tokens feed padding or radius shorthands. A list can be
      // valid at that use site, so only check simple values and clear mismatches.
      const mismatch =
        kind === undefined ||
        kind === T.Hash ||
        (kind === T.Dimension && !LENGTH_UNIT.test(unit)) ||
        (kind === T.Function && COLOR_FUNCTION.test(identifier)) ||
        (single && kind === T.Ident && !SIZE_KEYWORD.test(identifier)) ||
        (single && (kind === T.String || kind === T.URL));
      if (mismatch) report('type-mismatch', 'Use a CSS length, percentage or sizing keyword.');
    }
  }
  // Color keywords and functions can grow with CSS. Reject incompatible
  // token shapes, including the function form of a quoted URL.
  if (
    type === 'color' &&
    kind !== T.Ident &&
    kind !== T.Hash &&
    (kind !== T.Function || /^(?:url|src)$/iu.test(identifier))
  ) {
    report('type-mismatch', 'Use a CSS color.');
  }
  if (type === 'duration') {
    const timeValue = kind === T.Dimension && /^(?:ms|s)$/iu.test(unit);
    const calculated = kind === T.Function && !COLOR_FUNCTION.test(identifier);
    const auto = kind === T.Ident && /^auto$/iu.test(identifier);
    if (!timeValue && !calculated && !auto) {
      report('type-mismatch', 'Use a duration with ms or s, for example 0ms.');
    }
  }
}

function sourceLocations(css) {
  const endpoints = [
    0,
    ...Array.from(css.matchAll(/\r\n|[\n\r\f]/gu), (m) => m.index + m[0].length),
  ];
  return (offset) => {
    let low = 0;
    let high = endpoints.length;
    while (low + 1 < high) {
      const mid = (low + high) >>> 1;
      if (endpoints[mid] <= offset) low = mid;
      else high = mid;
    }
    return { line: low + 1, column: offset - endpoints[low] + 1 };
  };
}

/** Check Kimen custom property declarations in CSS from this package version. */
export function checkTheme(css, { file = '<css>' } = {}) {
  const { tokens, modes, modeNames } = getInventory();
  const suggestions = new Map();
  const findings = [];
  const position = sourceLocations(css);
  let firstError;
  visitDeclarations(
    css,
    modes,
    (token, value, offset, activeModes) => {
      const report = (code, fix, severity = 'error') => {
        findings.push({ code, severity, file, ...position(offset), token, fix });
      };
      if (token.startsWith('--_ki-')) {
        report('private-token', 'Private, not part of the contract. Use a public Kimen token.');
        return;
      }
      const traits = tokens.get(token);
      if (traits === undefined) {
        if (!suggestions.has(token)) suggestions.set(token, suggest(token, tokens));
        report('unknown-token', suggestions.get(token));
        return;
      }
      checkValue(TOKEN_TYPES[traits & 3], value, report);
      const overridden = activeModes & (traits >>> 3);
      if (overridden !== 0) {
        const mode = modeNames.findLast((_, index) => overridden & (1 << index));
        report('mode-token', `Set --ki-${mode}-${token.slice(5)} instead.`);
      }
      if (traits & 4) {
        report(
          'unread-token',
          'Remove this override if your application does not read it.',
          'warning',
        );
      }
    },
    (offset) => {
      firstError = Math.min(firstError ?? offset, offset);
    },
  );
  if (firstError !== undefined) {
    findings.push({
      code: 'invalid-css',
      severity: 'error',
      file,
      ...position(firstError),
      fix: 'Correct the CSS syntax at this location.',
    });
    findings.sort((left, right) => left.line - right.line || left.column - right.column);
  }
  return findings;
}
