function languageOf(host: HTMLElement): string | undefined {
  let element: Element | null = host;
  while (element) {
    const lang = element.getAttribute('lang');
    if (lang !== null) return lang;

    const root = element.getRootNode();
    element =
      element.assignedSlot ??
      element.parentElement ??
      (root instanceof ShadowRoot ? root.host : null);
  }
  return undefined;
}

/** Resolve the closest language declaration, including slotted content and shadow hosts. */
export function formatLocale(host: HTMLElement, locale?: string): string | undefined {
  const language = locale ?? languageOf(host);
  if (!language) return undefined;
  try {
    return Intl.getCanonicalLocales(language)[0];
  } catch {
    return undefined;
  }
}
