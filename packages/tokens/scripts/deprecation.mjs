// Token deprecation (spec 041): read, check and announce the deprecation of a
// published token.
//
// A deprecation is declared once, on the token's base definition, next to its
// $description:
//
//   "$deprecated": "<why nothing should use it any more>",
//   "$extensions": {
//     "dev.kimen.deprecation": {
//       "since": "0.1.0", "removal": "1.0.0", "replacement": "--ki-x"
//     }
//   }
//
// `$deprecated` is the DTCG 2025.10 property (a string explains it); the
// schedule lives in a Kimen extension under the reverse domain of kimen.dev,
// because DTCG has no field for it. Style Dictionary implements neither and
// passes both through untouched: only Kimen code reads them — this module,
// for the stylesheets (../build.mjs) and the token reference, and
// scripts/lib/token-inventory.mjs, for the public API snapshot and the token
// contract gate.
//
// The public API gate allows removing a token only when the previous
// release's baseline carries its deprecation and is at least one minor newer
// than `since`; `removal` is therefore at least two minors after `since`, or a
// later major.

export const DEPRECATION_EXTENSION = 'dev.kimen.deprecation';

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const TOKEN_NAME = /^--ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PUBLIC_SOURCE = /^tokens\/(?:semantic\.tokens\.json|component\/[a-z0-9-]+\.tokens\.json)$/u;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const parseVersion = (value) => {
  const match = typeof value === 'string' ? VERSION.exec(value) : null;
  return match === null ? null : match.slice(1).map(Number);
};

/** Negative, zero or positive as `left` is older than, equal to or newer than `right`. */
function compareVersions(left, right) {
  const [a, b] = [parseVersion(left), parseVersion(right)];
  if (a === null || b === null) {
    throw new TypeError(`cannot compare ${String(left)} with ${String(right)}`);
  }
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

/** Whether a DTCG node (a token or a group) declares any part of a deprecation. */
export function declaresDeprecation(node) {
  return (
    isRecord(node) &&
    (Object.hasOwn(node, '$deprecated') ||
      (isRecord(node.$extensions) && Object.hasOwn(node.$extensions, DEPRECATION_EXTENSION)))
  );
}

/**
 * Read the deprecation of one DTCG token node. Returns `{ deprecation: null,
 * problems: [] }` for a live token, the deprecation for a complete one, and
 * the list of what is wrong otherwise.
 */
export function readDeprecation(node) {
  if (!declaresDeprecation(node)) return { deprecation: null, problems: [] };

  const problems = [];
  const reason = node.$deprecated;
  if (typeof reason !== 'string' || reason.trim() === '') {
    problems.push('missing $deprecated reason');
  }
  const schedule = isRecord(node.$extensions) ? node.$extensions[DEPRECATION_EXTENSION] : undefined;
  if (!isRecord(schedule)) {
    problems.push('missing deprecation schedule');
    return { deprecation: null, problems };
  }

  const { since, removal, replacement } = schedule;
  if (since === undefined) problems.push('missing deprecation date');
  else if (parseVersion(since) === null)
    problems.push(`deprecation date ${since} is not a version`);
  if (removal === undefined) problems.push('missing removal version');
  else if (parseVersion(removal) === null)
    problems.push(`removal version ${removal} is not a version`);
  if (replacement === undefined) problems.push('missing replacement');
  else if (typeof replacement !== 'string' || !TOKEN_NAME.test(replacement)) {
    problems.push(`replacement ${String(replacement)} is not a --ki-* token name`);
  }

  const [from, to] = [parseVersion(since), parseVersion(removal)];
  if (from !== null && to !== null) {
    const laterMajor = to[0] > from[0];
    const sameMajorTwoMinorsLater = to[0] === from[0] && to[1] >= from[1] + 2;
    if (!laterMajor && !sameMajorTwoMinorsLater) {
      problems.push(`removal version ${removal} leaves no minor release between it and ${since}`);
    }
  }

  if (problems.length > 0) return { deprecation: null, problems };
  return { deprecation: { reason, since, removal, replacement }, problems };
}

/**
 * Check every deprecation's replacement against the published names: it must
 * be a published token and not itself deprecated. Returns one message per
 * problem, `<deprecated name>: <problem>`.
 */
export function replacementProblems(deprecations, publishedNames) {
  const problems = [];
  for (const [name, { replacement }] of deprecations) {
    if (!publishedNames.has(replacement)) {
      problems.push(`${name}: replacement ${replacement} is not a published token`);
    } else if (deprecations.has(replacement)) {
      problems.push(`${name}: replacement ${replacement} is itself deprecated`);
    }
  }
  return problems.sort();
}

/**
 * Every deprecation among Style Dictionary platform tokens, keyed by custom
 * property name. Throws one error listing every incomplete deprecation and
 * every replacement that is not a live published token.
 */
export function collectDeprecations(tokens) {
  const deprecations = new Map();
  const published = new Set();
  const problems = [];
  for (const token of tokens) {
    const name = `--${token.name}`;
    if (PUBLIC_SOURCE.test(token.filePath)) published.add(name);
    const { deprecation, problems: tokenProblems } = readDeprecation(token);
    problems.push(...tokenProblems.map((problem) => `${name}: ${problem}`));
    if (deprecation !== null) deprecations.set(name, deprecation);
  }
  problems.push(...replacementProblems(deprecations, published));
  if (problems.length > 0) {
    throw new Error(`invalid token deprecation:\n  ${problems.sort().join('\n  ')}`);
  }
  return new Map([...deprecations].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Fail once the package has reached the removal version of a token it still ships. */
export function assertNoDeprecationDue(deprecations, version) {
  const due = [...deprecations]
    .filter(([, { removal }]) => compareVersions(version, removal) >= 0)
    .map(([name, { removal }]) => `${name} is due for removal in ${removal}`);
  if (due.length > 0) {
    throw new Error(
      `@kimen/tokens ${version} still ships deprecated tokens:\n  ${due.join('\n  ')}`,
    );
  }
}

/** The stylesheet annotation that follows a deprecated declaration. */
export function deprecationComment({ since, removal, replacement }) {
  return `deprecated since ${since}, removed in ${removal}: use ${replacement}`;
}

/** The sentence that opens a deprecated token's entry in the token reference. */
export function deprecationNote({ since, removal, replacement }) {
  return `Deprecated since ${since}, removed in ${removal}. Use ${replacement}.`;
}
