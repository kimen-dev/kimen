// A control its component took out of the Tab order (`tabindex="-1"`: the
// play button of a ki-video that has yielded to the native player, the inner
// button of a disabled ki-button) is not a focus stop, whatever its tag.
const FOCUSABLE = ['a[href]', 'area[href]', 'button', 'input', 'select', 'textarea', '[tabindex]']
  .map((control) => `${control}:not([tabindex="-1"])`)
  .join(',');

/**
 * The control inside `element`'s own shadow root that takes focus on its
 * behalf, or `null` when it hosts none. A custom element that renders a
 * focusable control in its shadow root (`ki-button`, the dismiss button of
 * `ki-alert`, the play button of `ki-video`) is ONE focus stop for whoever
 * walks the light DOM, whether or not it opts into `delegatesFocus`.
 */
export function shadowFocusTarget(element: Element): HTMLElement | null {
  return element.shadowRoot?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
}

/**
 * Moves focus to `element`, through its shadow control when it hosts one.
 * `host.focus()` reaches that control only for `delegatesFocus` hosts and is
 * a silent no-op for every other one, so the control is focused directly.
 */
export function focusThroughShadow(element: HTMLElement): void {
  (shadowFocusTarget(element) ?? element).focus();
}
