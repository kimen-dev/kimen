/**
 * Model-facing prompt derivation (spec 033, FR-001): judgment lives here —
 * usage guidance verbatim, composition rules, one example that validates
 * against the same catalog (S8) — while the JSON Schema carries shape
 * (research D3). Deterministic text (S11), version-stamped (S10).
 */
import type { Catalog, CatalogEntry, CatalogPropConstraint, UiSpecNode } from '@kimen/catalog';

import type { DerivationOptions } from './schema.js';
import type { Derivation, ResolvedEntry } from './issues.js';
import { resolveEntries, versionStamp } from './issues.js';

function propLine(name: string, constraint: CatalogPropConstraint): string {
  const kind =
    constraint.type === 'enum'
      ? `enum: ${(constraint.values ?? []).map((value) => `"${value}"`).join(' | ')}`
      : constraint.type;
  const description = constraint.description === '' ? '' : ` — ${constraint.description}`;
  const fallback =
    constraint.default === undefined ? '' : ` (default: ${JSON.stringify(constraint.default)})`;
  return `  - \`${name}\` (${kind})${description}${fallback}`;
}

function componentBlock(tag: string, entry: CatalogEntry): readonly string[] {
  const lines: string[] = [`### <${tag}>`, entry.description];
  lines.push(`- Use when: ${entry.whenToUse}`, `- Avoid when: ${entry.whenNotToUse}`);
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
  if (eventNames.length > 0) {
    lines.push('- Events (bind via "action"; dispatched as data, never code):');
    for (const name of eventNames) {
      lines.push(`  - \`${name}\` — ${entry.events[name] ?? ''}`);
    }
  }
  return lines;
}

/**
 * The deterministic example spec: the first entry (sorted order) rendered
 * with its first enum prop at its first value and, when it declares a
 * default slot, one text child. Tests assert it validates against the same
 * catalog (S8) — the example can never drift from the boundary.
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
  for (const [name, constraint] of Object.entries(entry.props)) {
    const value = constraint.type === 'enum' ? constraint.values?.[0] : undefined;
    if (value !== undefined) {
      node.props = { [name]: value };
      break;
    }
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
    '- A <node> is {"component": "<tag>", "props": {...}, "action": "<name>", "slots": {"<slot>": [<node or "text">, ...]}}; "props", "action" and "slots" are optional.',
    '- Only the components listed below exist. Only their listed props. Enum props allow only their listed values.',
    '- Every "action" you bind MUST appear in the top-level "actions" list; actions are named intents delivered to the host as data.',
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
