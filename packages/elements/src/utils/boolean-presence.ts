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
 * attribute when it reflects that `false`. The observer reports each listed
 * attribute that was just written and is still present, so the component can
 * set its prop back to `true` (Stencil then reflects `""`).
 *
 * Only the attributes that actually mutated are reported. Stencil reflects a
 * prop on its next render, so after `el.checked = false` the `checked`
 * attribute outlives the prop for a moment: reporting every listed attribute
 * on any mutation read that stale attribute as "present" and switched the
 * prop back on whenever another observed attribute was written in the same
 * tick.
 *
 * Callbacks must be idempotent. Absence and Stencil's own reflect writes
 * already agree with the prop: callers correct only present-but-false props,
 * which never fights the reflection of a normal toggle.
 */
export function observeAttributePresence<Attribute extends string>(
  host: HTMLElement,
  attributes: readonly Attribute[],
  onPresent: (attribute: Attribute) => void,
): MutationObserver {
  const observer = new MutationObserver((records) => {
    const written = new Set(records.map(({ attributeName }) => attributeName));
    for (const attribute of attributes) {
      if (written.has(attribute) && host.hasAttribute(attribute)) {
        onPresent(attribute);
      }
    }
  });
  observer.observe(host, { attributeFilter: [...attributes] });
  return observer;
}
