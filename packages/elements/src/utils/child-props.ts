/**
 * How a parent component reads what its slotted children declare (`ki-select`
 * its options, `ki-tabs` its tabs and panels).
 *
 * The property comes first. A framework wrapper assigns `value` and `disabled`
 * as properties, and a child reflects a property to its attribute only when it
 * renders — after the parent has taken its first look at it. A parent that
 * reads the attribute alone sees children with no value at that point, and
 * resolves its own `value` against nothing.
 *
 * The attribute is the fallback, for a child that is not upgraded yet and so
 * has no property to read.
 */
interface ChildElement {
  getAttribute(name: string): string | null;
}

/** The child's `value`, or `null` when it declares none. */
export function childValue(child: ChildElement): string | null {
  const value = (child as { value?: unknown }).value;
  return typeof value === 'string' ? value : child.getAttribute('value');
}

/** Whether the child is disabled, including before its definition is registered. */
export function childDisabled(child: ChildElement): boolean {
  const disabled = (child as { disabled?: unknown }).disabled;
  if (typeof disabled === 'boolean') return disabled;
  const attribute = child.getAttribute('disabled');
  return attribute !== null && attribute !== 'false';
}
