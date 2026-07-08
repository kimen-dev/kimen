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

  const siblings = [...document.body.children] as HTMLElement[];
  const hostIndex = siblings.indexOf(host);

  for (let index = hostIndex + 1; index < siblings.length; index += 1) {
    const target = firstFocusable(siblings[index]);
    if (target) {
      return target;
    }
  }

  for (let index = hostIndex - 1; index >= 0; index -= 1) {
    const target = firstFocusable(siblings[index]);
    if (target) {
      return target;
    }
  }

  return document.body;
}

function firstFocusable(root: HTMLElement | undefined): HTMLElement | null {
  if (!root) {
    return null;
  }

  if (isFocusable(root)) {
    return root;
  }

  return root.querySelector<HTMLElement>(
    'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
  );
}

function isFocusable(element: HTMLElement): boolean {
  return (
    element.matches('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])') &&
    !element.hasAttribute('disabled')
  );
}
