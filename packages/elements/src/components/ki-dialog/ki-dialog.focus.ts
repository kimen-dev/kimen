const NATIVE_FOCUSABLE = 'button, input, select, textarea, a[href], area[href], [tabindex]';

export function resolveEntryFocusTarget(host: HTMLElement): HTMLElement | null {
  const focusable = resolveFocusableTargets(host);
  const chosen = focusable.find(hasAutofocus) ?? focusable[0] ?? null;
  if (!chosen) {
    return null;
  }
  // If the chosen action delegates focus to an internal native control, focus
  // that control directly — focusing the delegating host alone is not a
  // reliable focus move across engines. The host stays the target for the
  // Tab-wrap set; entry focus lands on the real control.
  return chosen.shadowRoot?.querySelector<HTMLElement>(NATIVE_FOCUSABLE) ?? chosen;
}

/**
 * Every focusable action inside the dialog, in document order — walking the
 * whole light-DOM subtree (not just direct children) so container-wrapped
 * actions are found, and treating a custom element that delegates focus (its
 * shadow root holds a native focusable, e.g. `ki-button`) as a single focus
 * target. Native `<dialog>` traps Tab across these; this set is what the
 * boundary-wrap and the entry assist operate on.
 */
export function resolveFocusableTargets(host: HTMLElement): HTMLElement[] {
  const targets: HTMLElement[] = [];
  for (const el of host.querySelectorAll<HTMLElement>('*')) {
    if (isDisabledOrHidden(el)) {
      continue;
    }
    if (isNativeFocusable(el) || delegatesFocusToShadow(el)) {
      targets.push(el);
    }
  }
  return targets;
}

function hasAutofocus(element: HTMLElement): boolean {
  const autofocus = (element as { autofocus?: unknown }).autofocus;
  return element.hasAttribute('autofocus') || autofocus === true;
}

function isDisabledOrHidden(element: HTMLElement): boolean {
  return [
    element.hidden,
    element.getAttribute('aria-hidden') === 'true',
    element.getAttribute('tabindex') === '-1',
    element.hasAttribute('disabled'),
    (element as { disabled?: unknown }).disabled === true,
  ].some((flag) => flag === true);
}

function isNativeFocusable(element: HTMLElement): boolean {
  const name = element.localName;
  if (name === 'input') {
    // A hidden input matches the native-focusable selector but cannot receive
    // focus; treating it as a target would send entry focus to a no-op and
    // strand the dialog (codex review).
    return element.getAttribute('type') !== 'hidden';
  }
  if (name === 'button' || name === 'select' || name === 'textarea') {
    return true;
  }
  if (name === 'a' || name === 'area') {
    return element.hasAttribute('href');
  }
  return element.hasAttribute('tabindex');
}

// A custom element whose shadow root delegates focus to an internal native
// focusable (e.g. ki-button uses shadow delegatesFocus with an inner button).
// Focusing the HOST moves focus into that control, so the host is the target.
function delegatesFocusToShadow(element: HTMLElement): boolean {
  const shadow = element.shadowRoot;
  return shadow !== null && shadow.querySelector(NATIVE_FOCUSABLE) !== null;
}
