// Global ARIA on the shadow host also applies to its native focus target.
export function syncButtonAria(host: HTMLElement, button: HTMLElement | null | undefined): void {
  if (!button) return;
  button.ariaDescription = host.ariaDescription;
  button.ariaHasPopup = host.ariaHasPopup;
}
