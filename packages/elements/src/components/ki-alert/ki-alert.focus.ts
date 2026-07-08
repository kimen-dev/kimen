const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * The element to focus after a dismissible alert removes itself: the next
 * focusable element in document order, else the previous one, else the body
 * (FR-013). A pre-order depth-first walk of the whole document — NOT just
 * body children — so a nested alert (inside a card, section or main) still
 * hands focus to the element that genuinely follows it, never one that
 * precedes it. The manual walk avoids compareDocumentPosition/TreeWalker so
 * the same code runs under mock-doc and real browsers alike.
 */
export function resolveDismissFocusTarget(host: HTMLElement): HTMLElement | null {
  const root = host.shadowRoot;
  const shadowActive = root?.activeElement;
  const active = shadowActive ?? document.activeElement;

  if (!shadowActive && active !== host && !host.contains(active)) {
    return null;
  }

  if (active === host && !shadowActive) {
    return null;
  }

  const before: HTMLElement[] = [];
  const after: HTMLElement[] = [];
  let seenHost = false;

  const visit = (element: HTMLElement): void => {
    if (element === host) {
      seenHost = true;
      return; // do not descend into the alert being removed
    }
    if (isFocusable(element)) {
      (seenHost ? after : before).push(element);
    }
    for (const child of element.children) {
      visit(child as HTMLElement);
    }
  };
  visit(document.body);

  return after[0] ?? before.at(-1) ?? document.body;
}

function isFocusable(element: HTMLElement): boolean {
  return element.matches(FOCUSABLE) && !element.hasAttribute('disabled');
}
