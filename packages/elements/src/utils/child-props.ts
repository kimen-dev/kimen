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
  hasAttribute(name: string): boolean;
}

/** The child's `value`, or `null` when it declares none. */
export function childValue(child: ChildElement): string | null {
  const value = (child as { value?: unknown }).value;
  return typeof value === 'string' ? value : child.getAttribute('value');
}

/**
 * Whether the child is disabled. A present attribute disables whatever the
 * property says (boolean presence, see `boolean-presence.ts`): before the
 * child loads, an authored `disabled="false"` has been parsed to `false`.
 */
export function childDisabled(child: ChildElement): boolean {
  return (child as { disabled?: unknown }).disabled === true || child.hasAttribute('disabled');
}
