import { shadowFocusTarget } from '../../utils/shadow-focus';

const controls = [
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary',
  'audio[controls], video[controls], [tabindex], [contenteditable]:not([contenteditable="false"])',
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"]',
  ...['button', 'checkbox', 'icon-button', 'link', 'radio', 'select', 'switch'].map(
    (name) => `ki-${name}`,
  ),
].join(',');

export function rowControls(root: Element): Element[] {
  if (root.matches(controls) || shadowFocusTarget(root)) return [root];
  return Array.from(root.querySelectorAll(controls));
}

export function hasControlName(control: Element, suppliedName?: string): boolean {
  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel !== null && ariaLabel !== suppliedName) return true;
  if (control.localName === ['ki', 'icon-button'].join('-')) return control.hasAttribute('label');
  const shadowLabel = ['switch', 'checkbox'].some((name) => control.localName === `ki-${name}`);
  if (!shadowLabel && control.matches('[aria-labelledby], [label], [title]')) return true;
  if (control instanceof HTMLInputElement && control.labels?.length) return true;
  if (control instanceof HTMLButtonElement && control.labels.length) return true;
  // Native text buttons and Kimen controls with their own label slot.
  return Array.from(control.childNodes).some((node) => {
    if (node instanceof Element && node.matches('[slot], [aria-hidden="true"]')) return false;
    return Boolean(node.textContent?.trim());
  });
}

export function slotText(nodes: readonly Node[]): string {
  return nodes
    .map((node) => node.textContent ?? '')
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
}
