/**
 * The render result's text content (spec 038 D1, FR-008): a deterministic
 * plain-text outline of an already-validated spec, for the model and for
 * hosts that do not display MCP Apps surfaces. One line per component —
 * slot, tag, props, bound action and the fields it collects — and one per
 * text child; every piece of
 * spec data is JSON-quoted, so it stays on its line.
 *
 * Plain text even where a host renders tool text as Markdown: the outline
 * sits in a code fence longer than any backtick run inside it, so no spec
 * string can close the fence and become markup (an image, a link). The
 * outline is data; it is never an alternate render path.
 */
import type { UiSpec, UiSpecNode } from '@kimen/catalog';

import { MAX_OUTLINE_LINES } from './limits.js';

const INDENT = '  ';

function propsText(props: UiSpecNode['props']): string {
  const entries = Object.entries(props ?? {});
  if (entries.length === 0) {
    return '';
  }
  return ` (${entries.map(([name, value]) => `${name}: ${JSON.stringify(value)}`).join(', ')})`;
}

/** Outline lines of one node, depth-first, without recursion limits beyond the spec's own budgets. */
function nodeLines(root: UiSpecNode): string[] {
  const lines: string[] = [];
  const stack: {
    readonly node: UiSpecNode | string;
    readonly depth: number;
    readonly slot: string;
  }[] = [{ depth: 0, node: root, slot: '' }];
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    const { node, depth, slot } = item;
    const prefix = INDENT.repeat(depth) + (slot === '' ? '' : `[${JSON.stringify(slot)}] `);
    if (typeof node === 'string') {
      lines.push(`${prefix}${JSON.stringify(node)}`);
      continue;
    }
    const action = node.action === undefined ? '' : ` → action ${JSON.stringify(node.action)}`;
    const collect = node.collect === undefined ? '' : ` collecting ${JSON.stringify(node.collect)}`;
    lines.push(`${prefix}${node.component}${propsText(node.props)}${action}${collect}`);
    const children: (typeof stack)[number][] = [];
    for (const [slotName, slotChildren] of Object.entries(node.slots ?? {})) {
      for (const child of slotChildren) {
        children.push({ depth: depth + 1, node: child, slot: slotName });
      }
    }
    stack.push(...children.reverse());
  }
  return lines;
}

/** A fence longer than the longest backtick run in `text` (CommonMark: at least three). */
function fenceFor(text: string): string {
  let longest = 0;
  for (const run of text.match(/`+/gu) ?? []) {
    longest = Math.max(longest, run.length);
  }
  return '`'.repeat(Math.max(3, longest + 1));
}

/** `lines` wrapped in a code fence no line inside can close. */
export function fenced(lines: readonly string[]): string {
  const body = lines.join('\n');
  const fence = fenceFor(body);
  return `${fence}\n${body}\n${fence}`;
}

function countComponents(root: UiSpecNode): number {
  let count = 0;
  const stack: (UiSpecNode | string)[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined || typeof node === 'string') {
      continue;
    }
    count += 1;
    for (const children of Object.values(node.slots ?? {})) {
      stack.push(...children);
    }
  }
  return count;
}

export function outlineSpec(spec: UiSpec): string {
  const components = countComponents(spec.root);
  const lines = nodeLines(spec.root);
  const actions = spec.actions ?? [];
  if (actions.length > 0) {
    lines.unshift(
      `declared actions: ${actions.map((action) => JSON.stringify(action)).join(', ')}`,
    );
  }
  const shown =
    lines.length > MAX_OUTLINE_LINES
      ? [
          ...lines.slice(0, MAX_OUTLINE_LINES),
          `… ${String(lines.length - MAX_OUTLINE_LINES)} more lines omitted`,
        ]
      : lines;
  const summary = `Rendered a Kimen surface of ${String(components)} component${components === 1 ? '' : 's'}. An MCP Apps host displays it as interactive components; its outline:`;
  return `${summary}\n${fenced(shown)}`;
}
