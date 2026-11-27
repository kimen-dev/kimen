const STATES = [
  'rest',
  'hover',
  'active',
  'pressed',
  'selected',
  'unselected',
  'checked',
  'unchecked',
  'indeterminate',
  'disabled',
  'focus',
  'focus-visible',
  'loading',
  'invalid',
  'readonly',
  'read-only',
  'error',
  'open',
  'closed',
  'expanded',
  'collapsed',
  'dragging',
];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function takeQualifier(suffix, values) {
  // A longer literal such as primary-light takes precedence over primary.
  return values.reduce(
    (best, value) =>
      suffix.startsWith(`${value}-`) && value.length > (best?.length ?? 0) ? value : best,
    null,
  );
}

export function parseStateToken(name, { family, variants, tones }) {
  const prefix = `--ki-${family}-`;
  if (!name.startsWith(prefix)) return null;
  let suffix = name.slice(prefix.length);
  if (!SLUG.test(suffix)) return null;

  const variant = takeQualifier(suffix, variants);
  if (variant !== null) suffix = suffix.slice(variant.length + 1);
  const tone = takeQualifier(suffix, tones);
  if (tone !== null) suffix = suffix.slice(tone.length + 1);

  const states = [];
  let state = takeQualifier(suffix, STATES);
  while (state !== null) {
    states.push(state);
    suffix = suffix.slice(state.length + 1);
    state = takeQualifier(suffix, STATES);
  }
  return states.length === 0 ? null : { variant, tone, state: states.join('-') };
}

function propLiterals(members, name) {
  const type = members.find((member) => member.kind === 'field' && member.name === name)?.type
    ?.text;
  return [
    ...(type ?? '').matchAll(/(?:^|\|)\s*(['"])([a-z0-9]+(?:-[a-z0-9]+)*)\1\s*(?=\||$)/gu),
  ].map((match) => match[2]);
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function buildStateTokenTable({ tagName, members, cssProperties }, sources) {
  const variants = propLiterals(members, 'variant');
  const tones = propLiterals(members, 'tone');
  const rows = new Map();
  for (const { name } of cssProperties) {
    const source = sources.get(name);
    if (!source) continue;
    const parsed = parseStateToken(name, { family: source.family, variants, tones });
    // Shared sheets can use another element's tokens (e.g. ki-icon-button).
    // A foreign family belongs in the table only if the component exposes its variant.
    if (!parsed || (source.component !== tagName && parsed.variant === null)) continue;
    const key = JSON.stringify(parsed);
    if (!rows.has(key)) rows.set(key, { ...parsed, tokens: [] });
    rows.get(key).tokens.push(name);
  }

  const table = [...rows.values()];
  const variantCount = new Set(table.map(({ variant }) => variant).filter(Boolean)).size;
  const stateCount = new Set(table.map(({ state }) => state)).size;
  if (variantCount < 2 && stateCount < 2) return [];
  return table.sort(
    (a, b) =>
      compare(a.variant ?? '', b.variant ?? '') ||
      compare(a.tone ?? '', b.tone ?? '') ||
      compare(a.state === 'rest' ? '' : a.state, b.state === 'rest' ? '' : b.state),
  );
}
