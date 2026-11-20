import { shadowFocusTarget } from '../../utils/shadow-focus';

const nativeControl =
  'button, input, select, textarea, a[href], area[href], summary, [contenteditable]:not([contenteditable="false"]), [tabindex], audio[controls], video[controls]';

function usableControl(element: HTMLElement): boolean {
  return (
    !element.matches(':disabled, [aria-disabled="true"], input[type="hidden"]') &&
    !(element.hasAttribute('tabindex') && element.tabIndex < 0) &&
    element.checkVisibility({ visibilityProperty: true }) &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]')
  );
}

/** Prefer requested autofocus, then the first available control in slotted order. */
export function resolvePopoverFocus(host: HTMLElement): HTMLElement | undefined {
  let first: HTMLElement | undefined;
  for (const element of host.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement) || !usableControl(element)) {
      continue;
    }
    const target = shadowFocusTarget(element) ?? (element.matches(nativeControl) ? element : null);
    if (!target || !usableControl(target)) {
      continue;
    }
    if (element.hasAttribute('autofocus') || target.hasAttribute('autofocus')) {
      return target;
    }
    first ??= target;
  }
  return first;
}
