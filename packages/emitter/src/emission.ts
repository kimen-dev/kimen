/**
 * Emission ingest helpers (spec 033, FR-005/FR-006): the reliability loop
 * after a model answers. `normalizeEmission` strips the placeholders
 * strict-mode all-required schemas force a model to emit; `repairPrompt`
 * turns a failed validation into ONE corrective message. Both are total
 * functions; their output is untrusted until `validateUiSpec` passes —
 * the loop is normalize → validate → (repair once) → validate → fail
 * closed.
 */
import type { ValidationReport } from '@kimen/catalog';

import { isRecord } from './issues.js';

/**
 * A null-prototype clone record. Assigning an own `__proto__` (or other
 * legacy accessor) key creates a real data property instead of invoking the
 * prototype setter, so a forbidden key survives into the normalized document
 * and `validateUiSpec` still rejects it (review finding: a plain `{}` clone
 * silently swallowed `__proto__`, laundering a forbidden-key emission into an
 * accepted one — the sanitize-instead-of-reject antipattern the wall forbids).
 * `snapshotPlainData` accepts null-prototype records.
 */
function cloneRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

/**
 * Iterative node-tree cleanup (review finding: recursion overflowed on
 * hostile depths the boundary rejects gracefully). Matches the boundary's
 * iterative-wall discipline: unbounded depth degrades into a validation
 * report downstream, never a RangeError here. Cyclic inputs (impossible
 * from JSON.parse, possible from hand-built objects) pass through
 * untouched — the boundary rejects them as non-data.
 */
function normalizeTree(root: unknown): unknown {
  const seen = new WeakSet();
  const holder = [root];
  const stack: [siblings: unknown[], index: number][] = [[holder, 0]];
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    const [siblings, index] = item;
    const source = siblings[index];
    if (!isRecord(source) || seen.has(source)) continue;
    seen.add(source);
    const clean = cloneRecord();
    siblings[index] = clean;
    for (const [key, value] of Object.entries(source)) {
      if ((key === 'action' || key === 'id' || key === 'collect') && value === null) {
        continue;
      }
      if ((key === 'props' || key === 'action') && isRecord(value)) {
        // A binding per event (spec 154): an event bound to null fires
        // nothing, and a map of such placeholders alone binds nothing. A map
        // the model left empty stays, so validation names it.
        const fields = Object.entries(value);
        const present = fields.filter(([, field]) => field !== null);
        if (present.length > 0 || (key === 'action' && fields.length === 0)) {
          clean[key] = Object.assign(cloneRecord(), Object.fromEntries(present));
        }
        continue;
      }
      if (key === 'slots' && isRecord(value)) {
        const slots: Record<string, unknown> = cloneRecord();
        clean['slots'] = slots;
        for (const [name, children] of Object.entries(value)) {
          if (Array.isArray(children)) {
            const cloned: unknown[] = new Array(children.length);
            slots[name] = cloned;
            children.forEach((child, index) => {
              cloned[index] = child;
              stack.push([cloned, index]);
            });
          } else {
            slots[name] = children;
          }
        }
        continue;
      }
      clean[key] = value;
    }
  }
  return holder[0];
}

/**
 * Strips strict-mode placeholders from an emission (S13): null-valued
 * props, null action bindings, null events of a binding per event and null
 * node ids and null collection maps disappear, empty props containers are dropped, and a binding per
 * event left with no event goes, and everything else — including values a model got WRONG — is
 * preserved untouched, so validation still sees the real mistake.
 * Pure data cleanup over a fresh clone; the input is never mutated and
 * the output is untrusted until `validateUiSpec` passes.
 */
export function normalizeEmission(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }
  const clean: Record<string, unknown> = cloneRecord();
  for (const [key, entry] of Object.entries(value)) {
    clean[key] = key === 'root' ? normalizeTree(entry) : entry;
  }
  return clean;
}

/**
 * Formats a failed validation report into ONE corrective message naming
 * every issue's code, path and offender (S14), or null when the report is
 * ok. The single-round policy is fixed (Art. VII): the message itself
 * tells the model this is the only repair opportunity; a host that
 * receives a second invalid emission fails closed.
 */
export function repairPrompt(report: ValidationReport): string | null {
  if (report.ok) {
    return null;
  }
  const lines: string[] = [
    'Your previous UI spec was rejected by the catalog validator.',
    'Fix EVERY issue below and reply with exactly one corrected JSON document — no prose.',
    'This is the only repair round: a second invalid emission will be discarded.',
    '',
    'Issues:',
  ];
  report.issues.forEach((issue, index) => {
    // Some issue classes (invalid-prop-type) carry the offending value only in
    // issue.value, not the message; the repair contract (S14) names the
    // offender, so surface it — skipping the append when the message already
    // embeds it (unknown-component, unknown-prop, …) to avoid duplication.
    const offender =
      issue.value !== undefined && !issue.message.includes(issue.value)
        ? ` (received "${issue.value}")`
        : '';
    lines.push(
      `${String(index + 1)}. [${issue.code}] at ${issue.path}: ${issue.message}${offender}`,
    );
  });
  return lines.join('\n');
}
