let nextDescriptionId = 0;

/** ARIA ID references stay in their own tree, so mirror the bubble's text in light DOM. */
export function createTooltipDescription(host: HTMLElement): HTMLSpanElement {
  const root = host.getRootNode() as Document | ShadowRoot;
  const description = host.ownerDocument.createElement('span');
  do {
    description.id = `ki-tooltip-description-${String(++nextDescriptionId)}`;
  } while (root.getElementById(description.id));
  description.hidden = true;
  description.setAttribute('role', 'tooltip');
  return description;
}

/** Keep the author's accessible description references and clean up just this tooltip. */
export function attachTooltipDescription(element: Element, description: Element): () => void {
  // Stencil's bundled DOM declarations predate reflected ARIA element references.
  const target = element as Element & { ariaDescribedByElements: readonly Element[] | null };
  if (
    target.getRootNode() === description.getRootNode() &&
    (target.hasAttribute('aria-describedby') || !target.ariaDescribedByElements?.length)
  ) {
    const ids = () => target.getAttribute('aria-describedby')?.match(/\S+/gu) ?? [];
    target.setAttribute('aria-describedby', [...ids(), description.id].join(' '));
    return () => {
      const remaining = ids().filter((id) => id !== description.id);
      if (remaining.length > 0) {
        target.setAttribute('aria-describedby', remaining.join(' '));
      } else {
        target.removeAttribute('aria-describedby');
      }
    };
  }

  // The real focus control in a custom trigger's shadow can reference an
  // element in an ancestor tree through ARIA element reflection.
  const attribute = target.getAttribute('aria-describedby');
  const authored = target.ariaDescribedByElements ?? [];
  target.ariaDescribedByElements = [...authored, description];
  return () => {
    const refs = target.ariaDescribedByElements;
    if (!refs?.includes(description)) return;
    const remaining = refs.filter((ref) => ref !== description);
    if (
      attribute !== null &&
      remaining.length === authored.length &&
      remaining.every((ref, index) => ref === authored[index])
    ) {
      target.setAttribute('aria-describedby', attribute);
    } else {
      target.ariaDescribedByElements = remaining.length > 0 ? remaining : null;
    }
  };
}
