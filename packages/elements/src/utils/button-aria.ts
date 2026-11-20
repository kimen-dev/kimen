// Global ARIA on the shadow host also applies to its native focus target.
const forwardedButtonAria = ['aria-description', 'aria-haspopup'];

export function syncButtonAria(host: HTMLElement, button: HTMLButtonElement | undefined): void {
  if (!button) return;
  for (const attribute of forwardedButtonAria) {
    const value = host.getAttribute(attribute);
    if (value === null) {
      button.removeAttribute(attribute);
    } else {
      button.setAttribute(attribute, value);
    }
  }
}
