import { shadowFocusTarget } from '../../utils/shadow-focus.js';

// Where focus was before it entered a toaster (spec 049 D-8, FR-021). The
// toaster writes it; a toast that goes away with focus inside reads it when no
// other toast of the toaster can take focus. Module state shared by the two
// elements, never public API: one entry per toaster, released with it.
const origins = new WeakMap<Element, HTMLElement>();

/** Record where focus came from, when it came from outside the toaster. */
export function rememberFocusOrigin(toaster: Element, origin: EventTarget | null): void {
  if (origin instanceof HTMLElement && !toaster.contains(origin)) {
    origins.set(toaster, origin);
  }
}

/** The element focus came from, while it can still take focus. */
export function focusOriginOf(toaster: Element): HTMLElement | null {
  const origin = origins.get(toaster);
  if (!origin?.isConnected || origin.closest('[inert]') || !origin.checkVisibility()) {
    return null;
  }
  return origin;
}

/**
 * Whether the pointer rests on `scope` or focus is inside it: a toaster, or a
 * toast standing alone. Asking `scope.matches(state)` is not enough: the
 * toaster's stack is a popover in the top layer, and Blink and WebKit stop
 * `:hover` and `:focus-within` at a top-layer element, so the toaster host
 * never matches while the pointer or focus is on one of its toasts (Gecko
 * carries both up to the host). The stack itself matches in every engine, so
 * the top elements of the shadow tree are asked too.
 */
export function interactionWithin(scope: Element, state: ':focus-within' | ':hover'): boolean {
  return (
    scope.matches(state) ||
    [...(scope.shadowRoot?.children ?? [])].some((child) => child.matches(state))
  );
}

/** The first control of a toast: its first focusable action, else its dismiss button. */
export function firstControlOf(toast: HTMLElement): HTMLElement | null {
  for (const action of toast.querySelectorAll<HTMLElement>(':scope > [slot="action"]')) {
    if (
      action.matches('a[href],button,input,select,textarea,[tabindex]') ||
      shadowFocusTarget(action)
    ) {
      return action;
    }
  }
  return toast.shadowRoot?.querySelector<HTMLElement>('[part~="dismiss"]') ?? null;
}
