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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
  const holder: { value?: unknown } = {};
  const stack: { source: unknown; assign: (clone: unknown) => void }[] = [
    {
      assign: (clone) => {
        holder.value = clone;
      },
      source: root,
    },
  ];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) {
      break;
    }
    const { source, assign } = item;
    if (!isRecord(source)) {
      assign(source);
      continue;
    }
    if (seen.has(source)) {
      assign(source);
      continue;
    }
    seen.add(source);
    const clean: Record<string, unknown> = cloneRecord();
    assign(clean);
    for (const [key, value] of Object.entries(source)) {
      if (key === 'props' && isRecord(value)) {
        const props: Record<string, unknown> = cloneRecord();
        for (const [name, propValue] of Object.entries(value)) {
          if (propValue !== null) {
            props[name] = propValue;
          }
        }
        if (Object.keys(props).length > 0) {
          clean['props'] = props;
        }
        continue;
      }
      if (key === 'action' && value === null) {
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
              stack.push({
                assign: (childClone) => {
                  cloned[index] = childClone;
                },
                source: child,
              });
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
  return holder.value;
}

/**
 * Strips strict-mode placeholders from an emission (S13): null-valued
 * props and null action bindings disappear, empty props containers are
 * dropped, and everything else — including values a model got WRONG — is
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
