/**
 * Boolean attribute presence semantics (native HTML parity): a present
 * attribute means `true` whatever its value, so `disabled="false"` still
 * disables. Stencil parses the string `"false"` to `false`, so components
 * apply presence before the first render, while the authored attribute is
 * still on the host.
 */
export function booleanFromAttributePresence(current: boolean, hasAttribute: boolean): boolean {
  return current || hasAttribute;
}

/**
 * Keeps presence semantics for attributes written after hydration. Stencil
 * parses a present `"false"` to `false` and, since 4.45, removes the host
 * attribute when it reflects that `false`. On every observed mutation the
 * observer reports each listed attribute that is still present, so the
 * component can set its prop back to `true` (Stencil then reflects `""`).
 * Callbacks must be idempotent. Absence and Stencil's own reflect writes
 * already agree with the prop: callers correct only present-but-false props,
 * which never fights the reflection of a normal toggle.
 */
export function observeAttributePresence(
  host: HTMLElement,
  attributes: readonly string[],
  onPresent: (attribute: string) => void,
): MutationObserver | undefined {
  if (typeof MutationObserver === 'undefined') {
    return undefined;
  }

  const observer = new MutationObserver(() => {
    for (const attribute of attributes) {
      if (host.hasAttribute(attribute)) {
        onPresent(attribute);
      }
    }
  });
  observer.observe(host, { attributeFilter: [...attributes] });
  return observer;
}
