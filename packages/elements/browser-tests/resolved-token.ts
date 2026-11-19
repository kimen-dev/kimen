/** Serialize a public shadow token with the browser's normal CSSOM rules. */
export function resolvedShadowToken(element: HTMLElement, token: `--ki-${string}`): string {
  const style = getComputedStyle(element);
  const value = style.getPropertyValue(token).trim();
  const probe = document.createElement('span');
  probe.style.boxShadow = value;
  if (!probe.style.boxShadow || probe.style.boxShadow === 'none') {
    throw new Error(`Expected ${token} to provide a box shadow, got "${value}"`);
  }
  probe.style.color = style.color;
  probe.style.fontSize = style.fontSize;
  probe.hidden = true;
  document.body.append(probe);
  try {
    return getComputedStyle(probe).boxShadow;
  } finally {
    probe.remove();
  }
}
