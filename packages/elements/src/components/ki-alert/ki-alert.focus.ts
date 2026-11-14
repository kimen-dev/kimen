import { shadowFocusTarget } from '../../utils/shadow-focus.js';

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * The element to focus after a dismissible alert removes itself: the next
 * focusable element in document order, else the previous one, else the body
 * (FR-013). A pre-order depth-first walk of the whole document — NOT just
 * body children — so a nested alert (inside a card, section or main) still
 * hands focus to the element that genuinely follows it, never one that
 * precedes it.
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
    // A custom element that hosts a focusable control in its own shadow
    // (e.g. ki-button, another ki-alert) is ONE handoff target — the host —
    // and is not descended into, so a following ki-button is reachable even
    // though the host itself matches no native focusable selector (codex
    // review). The caller focuses it through that control.
    if (shadowFocusTarget(element) !== null) {
      if (!isHidden(element)) {
        (seenHost ? after : before).push(element);
      }
      return;
    }
    if (isFocusable(element)) {
      (seenHost ? after : before).push(element);
    }
    for (const child of element.children) {
      visit(child as HTMLElement);
    }
    // Descend into ordinary shadow trees too, so an alert (or focusable) nested
    // inside another component's shadow root is still found (codex review).
    if (element.shadowRoot) {
      for (const child of element.shadowRoot.children) {
        visit(child as HTMLElement);
      }
    }
  };
  visit(document.body);

  return after[0] ?? before.at(-1) ?? document.body;
}

function isFocusable(element: HTMLElement): boolean {
  return element.matches(FOCUSABLE) && !element.hasAttribute('disabled') && !isHidden(element);
}

// A candidate that cannot actually receive focus — focus() on it is a no-op, so
// it must not win the handoff (codex review).
function isHidden(element: HTMLElement): boolean {
  if (element.hasAttribute('hidden') || element.closest('[inert]')) {
    return true;
  }
  return !element.checkVisibility();
}
