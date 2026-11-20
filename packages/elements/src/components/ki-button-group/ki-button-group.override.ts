interface ButtonOverride {
  owner: object;
  authored: string | null;
  applied: string;
}

function authoredButtonValue(
  current: string | null,
  override: ButtonOverride | undefined,
): string | null {
  return override?.applied === current ? override.authored : current;
}

export function resolveButtonOverride(
  current: string | null,
  override: ButtonOverride | undefined,
  owner: object,
  value?: string,
): { value: string | null; override: ButtonOverride | undefined } {
  const authored = authoredButtonValue(current, override);
  if (value !== undefined) {
    return { value, override: { owner, authored, applied: value } };
  }
  if (override?.owner === owner) {
    return { value: authored, override: undefined };
  }
  return { value: current, override };
}

const buttonOverrides = new WeakMap<HTMLElement, Map<string, ButtonOverride>>();

export function readAuthoredButtonAttribute(
  element: HTMLElement,
  attribute: string,
): string | null {
  return authoredButtonValue(
    element.getAttribute(attribute),
    buttonOverrides.get(element)?.get(attribute),
  );
}

// An element can move between groups before the old group hears its slotchange.
export function overrideButtonAttribute(
  element: HTMLElement,
  attribute: string,
  owner: object,
  value?: string,
): void {
  const current = element.getAttribute(attribute);
  const overrides = buttonOverrides.get(element) ?? new Map<string, ButtonOverride>();
  const next = resolveButtonOverride(current, overrides.get(attribute), owner, value);
  if (next.override) {
    overrides.set(attribute, next.override);
    buttonOverrides.set(element, overrides);
  } else {
    overrides.delete(attribute);
  }
  if (next.value === current) return;
  if (next.value === null) {
    element.removeAttribute(attribute);
  } else {
    element.setAttribute(attribute, next.value);
  }
}
