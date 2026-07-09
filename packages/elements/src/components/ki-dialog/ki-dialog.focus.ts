export function resolveEntryFocusTarget(_host: HTMLElement): HTMLElement | null {
  const focusable = resolveFocusableTargets(_host);
  const autofocus = focusable.find(hasAutofocus);

  if (autofocus) {
    return autofocus;
  }

  return focusable[0] ?? null;
}

export function resolveFocusableTargets(_host: HTMLElement): HTMLElement[] {
  return [..._host.children]
    .filter((child): child is HTMLElement => child.nodeType === 1)
    .filter(isFocusable);
}

function hasAutofocus(element: HTMLElement): boolean {
  return element.hasAttribute('autofocus') || ('autofocus' in element && element.autofocus);
}

function isFocusable(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if ('disabled' in element && element.disabled === true) {
    return false;
  }

  if (element.getAttribute('tabindex') === '-1') {
    return false;
  }

  const name = element.localName;
  if (name === 'button' || name === 'input' || name === 'select' || name === 'textarea') {
    return true;
  }

  if (name === 'a' || name === 'area') {
    return element.hasAttribute('href');
  }

  return element.hasAttribute('tabindex');
}
