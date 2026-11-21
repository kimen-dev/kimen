/**
 * Model-facing prompt derivation (spec 033, FR-001): judgment lives here —
 * usage guidance verbatim, composition rules, one example that validates
 * against the same catalog (S8) — while the JSON Schema carries shape
 * (research D3). Deterministic text (S11), version-stamped (S10).
 */
import type { Catalog, CatalogEntry, CatalogPropConstraint, UiSpecNode } from '@kimen/catalog';
import { COLLECT_MAX_ENTRIES, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import type { Derivation, ResolvedEntry } from './issues.js';
import { resolveEntries, versionStamp } from './issues.js';
import type { DerivationOptions } from './schema.js';

/** The declared range of a bounded number as the prompt states it (S17). */
function rangeText(constraint: CatalogPropConstraint): string {
  const { minimum, maximum } = constraint;
  if (minimum !== undefined && maximum !== undefined) {
    return `, ${String(minimum)} to ${String(maximum)}`;
  }
  if (minimum !== undefined) {
    return `, at least ${String(minimum)}`;
  }
  return maximum === undefined ? '' : `, at most ${String(maximum)}`;
}

function propLine(name: string, constraint: CatalogPropConstraint): string {
  const kind =
    constraint.type === 'enum'
      ? `enum: ${(constraint.values ?? []).map((value) => `"${value}"`).join(' | ')}`
      : `${constraint.type}${rangeText(constraint)}`;
  const url =
    constraint.format === 'url' ? ', URL' : constraint.format === 'idref' ? ', node id' : '';
  const emptiable = constraint.allowEmpty === true ? ', may be empty' : '';
  const required = constraint.required === true ? `, required${emptiable}` : '';
  const description = constraint.description === '' ? '' : ` — ${constraint.description}`;
  const fallback =
    constraint.default === undefined ? '' : ` (default: ${JSON.stringify(constraint.default)})`;
  return `  - \`${name}\` (${kind}${url}${required})${description}${fallback}`;
}

/** A value that satisfies a prop constraint, for the embedded example. */
function exampleValue(constraint: CatalogPropConstraint): boolean | number | string {
  switch (constraint.type) {
    case 'boolean':
      return true;
    case 'number':
    case 'number-or-string':
      return Math.min(
        constraint.maximum ?? Number.POSITIVE_INFINITY,
        Math.max(constraint.minimum ?? Number.NEGATIVE_INFINITY, 1),
      );
    case 'enum':
      return constraint.values?.[0] ?? '';
    default:
      return constraint.format === 'url' ? 'https://example.com/example' : 'Example';
  }
}

function componentBlock(tag: string, entry: CatalogEntry): readonly string[] {
  const lines: string[] = [`### <${tag}>`, entry.description];
  lines.push(`- Use when: ${entry.whenToUse}`, `- Avoid when: ${entry.whenNotToUse}`);
  if (NATIVE_PRIMITIVE_TAGS.includes(tag)) {
    lines.push('- Native HTML element: it never binds an action.');
  }
  const propEntries = Object.entries(entry.props);
  if (propEntries.length > 0) {
    lines.push('- Props:');
    for (const [name, constraint] of propEntries) {
      lines.push(propLine(name, constraint));
    }
  }
  const slotNames = Object.keys(entry.slots);
  if (slotNames.length > 0) {
    lines.push('- Slots:');
    for (const name of slotNames) {
      lines.push(`  - \`${name === '' ? '"" (default)' : name}\` — ${entry.slots[name] ?? ''}`);
    }
  }
  const eventNames = Object.keys(entry.events);
  // Where an action name alone fires (spec 154): three components pick the
  // event from their own state, others declare it or have just one.
  const modeEvents: Readonly<Record<string, string>> = {
    'ki-chip':
      'an action name fires on ki-change for filter, ki-remove for removable input, and ki-activate for assist, based on the chip or parent group type',
    'ki-dialog':
      'an action name fires on ki-confirm when "confirm-label" is set and on ki-close otherwise',
    'ki-prompt-input':
      'an action name fires on ki-submit while idle and on ki-stop while streaming, and its data includes status and draft value; local files stay on the DOM event',
  };
  if (eventNames.length > 0) {
    const named =
      modeEvents[tag] ??
      (entry.activationEvent !== undefined
        ? `an action name fires on \`${entry.activationEvent}\``
        : eventNames.length === 1
          ? `an action name fires on \`${eventNames[0] ?? ''}\``
          : 'an action name alone is rejected, so map each event that should act');
    lines.push(
      `- Events (${named}; {"<event>": "<action>"} fires each listed event's own action):`,
    );
    for (const name of eventNames) {
      lines.push(`  - \`${name}\` — ${entry.events[name] ?? ''}`);
    }
  }
  return lines;
}

/**
 * The deterministic example spec: the first entry (sorted order) rendered
 * with every required prop, its first enum prop at its first value and,
 * when it declares a default slot, one text child. Tests assert it validates
 * against the same catalog (S8) — the example can never drift from the
 * boundary.
 */
function exampleSpec(entries: readonly ResolvedEntry[]): {
  readonly root: UiSpecNode;
  readonly version: 1;
} {
  const first = entries[0];
  if (first === undefined) {
    // Unreachable through the public API: resolveEntries never yields an
    // ok result with zero entries. Kept total for safety.
    return { root: { component: 'ki-badge' }, version: 1 };
  }
  const [tag, entry] = first;
  const node: {
    component: string;
    props?: Record<string, boolean | number | string>;
    slots?: Record<string, readonly (UiSpecNode | string)[]>;
  } = { component: tag };
  const props: Record<string, boolean | number | string> = {};
  let enumShown = false;
  for (const [name, constraint] of Object.entries(entry.props)) {
    const showEnum =
      !enumShown && constraint.type === 'enum' && constraint.values?.[0] !== undefined;
    if (constraint.required === true || showEnum) {
      props[name] = exampleValue(constraint);
      enumShown ||= constraint.type === 'enum';
    }
  }
  if (Object.keys(props).length > 0) {
    node.props = props;
  }
  if (Object.hasOwn(entry.slots, '')) {
    node.slots = { '': ['Example content'] };
  }
  return { root: node, version: 1 };
}

/**
 * Derives the model-facing prompt for a catalog (S7, S8, S10, S11):
 * format rules, per-component guidance verbatim, and a validated example.
 * Fail-closed on version skew and bad subsets, like every derivation.
 */
export function catalogPrompt(
  catalog: Catalog,
  options: DerivationOptions = {},
): Derivation<string> {
  const resolved = resolveEntries(catalog, options.components);
  if (resolved.issues.length > 0) {
    return { issues: resolved.issues, ok: false };
  }
  const lines: string[] = [
    '# Kimen UI-spec emission guide',
    `Catalog: ${versionStamp(catalog)}.`,
    '',
    '## Format rules',
    '- Emit exactly ONE JSON document: {"version": 1, "actions": [...], "root": <node>} — no prose, no markdown fences around your final answer.',
    '- A <node> is {"id": "<id>", "component": "<tag>", "props": {...}, "action": "<name>" or {"<event>": "<name>"}, "collect": {"<name>": "<id>"}, "slots": {"<slot>": [<node or "text">, ...]}}; "id", "props", "action", "collect" and "slots" are optional.',
    '- "id" is a stable identity for a node the host may update later (a live surface addresses its operations by id): lowercase letters, digits, "-" and "_", starting with a letter or digit, at most 64 characters, unique within the document.',
    '- Only the components listed below exist. Only their listed props. Enum props allow only their listed values.',
    '- Props marked "required" MUST be present with a non-blank value unless marked "may be empty": a spec that omits one is rejected.',
    '- Props marked "URL" accept only http(s) URLs or relative references; every other scheme is rejected, and the host may accept only absolute URLs of the origins it allows.',
    '- Props marked "node id" name another node of the same spec: give that node an "id" and use the same value; any other value is rejected.',
    '- Every "action" you bind MUST appear in the top-level "actions" list; actions are named intents delivered to the host as data.',
    '- "action" is one action name, which fires on the event its component\'s "Events" line names (on click when the component lists no events), or an object mapping events listed under that component to action names, so each event reports its own action: {"ki-approve": "tool.approved", "ki-deny": "tool.denied"} on a confirmation. Only listed events may be keys, and the object names at least one.',
    `- "collect" lets a node with an "action" carry the values of other fields, so a form needs one action on its button and none on its fields: each key names an entry of the action data, each value is the "id" of a node of the same spec whose component has a "checked", "selected" or "value" prop. Each bound event fires only when every collected field is valid. At most ${String(COLLECT_MAX_ENTRIES)} entries, and a key may not be one of the node's own props.`,
    '- Slot children are nodes or plain text strings — never HTML, never code, never URLs with schemes other than http(s).',
    '- Styling is not expressible in a spec; appearance belongs to the host theme.',
    '',
    '## Components',
  ];
  for (const [tag, entry] of resolved.entries) {
    lines.push(...componentBlock(tag, entry), '');
  }
  lines.push('## Example (valid)');
  lines.push('```json');
  lines.push(JSON.stringify(exampleSpec(resolved.entries), null, 2));
  lines.push('```');
  lines.push('The example validates against this catalog; imitate its structure.');
  return { artifact: lines.join('\n'), issues: [], ok: true };
}
