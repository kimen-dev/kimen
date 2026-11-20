// Measurement helpers for the cross-cutting contracts suite.
//
// Everything here reads what a user's browser actually computed — colours,
// boxes, clipping — across the FLAT tree (light DOM, shadow roots and slots),
// so the same assertion holds for all 29 components without knowing their
// internals or their token names.

interface Rgba {
  a: number;
  b: number;
  g: number;
  r: number;
}

const WHITE: Rgba = { a: 1, b: 255, g: 255, r: 255 };
const COLOR_PATTERN = /rgba?\([^)]*\)/gu;
const OPAQUE = 0.995;

/** Every element under `root`, descending into open shadow roots. */
function deepElements(root: Element): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walk = (node: Element): void => {
    found.push(node as HTMLElement);
    for (const child of node.shadowRoot?.children ?? []) {
      walk(child);
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return found;
}

/** The element that paints behind `node`: its slot, its parent or its host. */
function flatParent(node: Element): Element | null {
  const slot = (node as HTMLElement).assignedSlot;
  if (slot !== null) {
    return slot;
  }
  if (node.parentElement !== null) {
    return node.parentElement;
  }
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function parseColor(value: string): Rgba {
  const parts = value.match(/[\d.]+/gu);
  if (parts === null || parts.length < 3) {
    return { a: 0, b: 0, g: 0, r: 0 };
  }
  return {
    a: parts[3] === undefined ? 1 : Number(parts[3]),
    b: Number(parts[2]),
    g: Number(parts[1]),
    r: Number(parts[0]),
  };
}

function over(top: Rgba, base: Rgba, opacity = 1): Rgba {
  const alpha = top.a * opacity;
  const mix = (t: number, b: number): number => t * alpha + b * (1 - alpha);
  return { a: 1, b: mix(top.b, base.b), g: mix(top.g, base.g), r: mix(top.r, base.r) };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const n = value / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

/** The alpha channel of a computed colour: 0 is fully transparent. */
export function alphaOf(color: string): number {
  return parseColor(color).a;
}

export function hasVisibleShadow(shadows: string): boolean {
  return [...shadows.matchAll(COLOR_PATTERN)].some(([color]) => alphaOf(color) > 0);
}

/**
 * The WCAG contrast ratio between two computed paints: `background` is laid
 * over white when it is translucent, and `foreground` over that.
 */
export function paintContrast(foreground: string, background: string): number {
  const ground = over(parseColor(background), WHITE);
  return contrast(over(parseColor(foreground), ground), ground);
}

/**
 * Every opaque colour that can sit behind `element`. A gradient fans out into
 * one candidate per colour stop, so text over a gradient is measured against
 * its worst stop instead of being skipped (the case axe reports as
 * `bgGradient` and cannot decide).
 */
function backdrops(element: Element): Rgba[] {
  const layers: { color: Rgba; stops: Rgba[] }[] = [];
  let node: Element | null = element;
  while (node !== null) {
    const style = getComputedStyle(node);
    const stops =
      style.backgroundImage === 'none'
        ? []
        : (style.backgroundImage.match(COLOR_PATTERN) ?? []).map(parseColor);
    const color = parseColor(style.backgroundColor);
    layers.push({ color, stops });
    if (color.a > OPAQUE || (stops.length > 0 && stops.every((stop) => stop.a > OPAQUE))) {
      break;
    }
    node = flatParent(node);
  }
  let candidates: Rgba[] = [WHITE];
  for (const layer of layers.reverse()) {
    const next: Rgba[] = [];
    for (const base of candidates) {
      const tinted = layer.color.a > 0 ? over(layer.color, base) : base;
      if (layer.stops.length === 0) {
        next.push(tinted);
      } else {
        next.push(...layer.stops.map((stop) => over(stop, tinted)));
      }
    }
    candidates = next.slice(0, 24);
  }
  return candidates;
}

function isInactive(element: Element): boolean {
  let node: Element | null = element;
  while (node !== null) {
    if (
      node.matches(':disabled') ||
      node.hasAttribute('disabled') ||
      node.getAttribute('aria-disabled') === 'true'
    ) {
      return true;
    }
    node = flatParent(node);
  }
  return false;
}

function isPainted(element: HTMLElement): boolean {
  return element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true,
  });
}

function opacityOf(element: Element): number {
  let opacity = 1;
  let node: Element | null = element;
  while (node !== null) {
    opacity *= Number(getComputedStyle(node).opacity);
    node = flatParent(node);
  }
  return opacity;
}

export interface TextMeasurement {
  kind: 'placeholder' | 'text';
  ratio: number;
  required: number;
  text: string;
  where: string;
}

function describe(element: Element): string {
  const part = element.getAttribute('part');
  const root = element.getRootNode();
  const host = root instanceof ShadowRoot ? `${root.host.localName} » ` : '';
  return `${host}${element.localName}${part === null ? '' : `[part=${part}]`}`;
}

function measure(
  styled: HTMLElement,
  color: string,
  text: string,
  kind: TextMeasurement['kind'],
): TextMeasurement {
  const style = getComputedStyle(styled);
  const foreground = parseColor(color);
  const opacity = opacityOf(styled);
  const ratios = backdrops(styled).map((backdrop) =>
    contrast(over(foreground, backdrop, opacity), backdrop),
  );
  const size = Number.parseFloat(style.fontSize);
  const weight = Number(style.fontWeight);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  return {
    kind,
    ratio: Math.min(...ratios),
    required: large ? 3 : 4.5,
    text: text.trim().slice(0, 32),
    where: describe(styled),
  };
}

/**
 * Contrast of every painted, active text run under `root` — slotted text is
 * styled by its slot, placeholders by `::placeholder` — WCAG 1.4.3. Text
 * inside `exclude` (controls the user agent paints) is not measured.
 */
export function textMeasurements(
  root: Element,
  { exclude = [] }: { exclude?: readonly Element[] } = {},
): TextMeasurement[] {
  const measurements: TextMeasurement[] = [];
  const seen = new Set<Element>();
  const excluded = (styled: Element): boolean => exclude.some((skip) => skip.contains(styled));
  for (const element of deepElements(root)) {
    for (const node of element.childNodes) {
      if (!(node instanceof Text) || node.data.trim() === '') {
        continue;
      }
      const styled = node.assignedSlot ?? element;
      if (seen.has(styled) || excluded(styled) || isInactive(styled) || !isPainted(styled)) {
        continue;
      }
      seen.add(styled);
      measurements.push(measure(styled, getComputedStyle(styled).color, node.data, 'text'));
    }
    if (
      (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
      element.placeholder !== '' &&
      element.value === '' &&
      !isInactive(element) &&
      isPainted(element)
    ) {
      const color = getComputedStyle(element, '::placeholder').color;
      measurements.push(measure(element, color, element.placeholder, 'placeholder'));
    }
  }
  return measurements;
}

/**
 * What a theme or scheme change can alter: every node's box and paint.
 *
 * A node that generates no box paints nothing. It is recorded as unrendered,
 * and its computed style is not read. This covers the fallback content of a
 * slot that has assigned nodes, a light-DOM child that no slot takes, a slot
 * (display: contents), and anything inside a closed popover. WebKit does not
 * restyle those nodes when an inherited value changes: getComputedStyle()
 * keeps returning the style they had before the change. Nothing on screen is
 * stale: once such a node renders after a live switch, it paints exactly as
 * in a fresh mount. Whether a node renders must still match.
 */
export function fingerprint(root: Element): string[] {
  return deepElements(root).map((element) => {
    if (!element.checkVisibility()) {
      return `${element.localName} | unrendered`;
    }
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const half = (value: number): number => Math.round(value * 2) / 2;
    return [
      element.localName,
      half(box.x),
      half(box.y),
      half(box.width),
      half(box.height),
      style.color,
      style.backgroundColor,
      style.backgroundImage,
      style.borderTopColor,
      style.borderBottomColor,
      style.borderTopWidth,
      style.boxShadow,
      style.outlineColor,
      style.fill,
      style.stroke,
      style.opacity,
      style.borderTopLeftRadius,
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.lineHeight,
    ].join(' | ');
  });
}

/** The first few nodes whose fingerprint differs, for a readable failure. */
export function fingerprintDifferences(expected: string[], actual: string[]): string[] {
  const differences: string[] = [];
  if (expected.length !== actual.length) {
    differences.push(`node count ${String(expected.length)} → ${String(actual.length)}`);
  }
  for (let index = 0; index < Math.min(expected.length, actual.length); index += 1) {
    if (expected[index] !== actual[index] && differences.length < 3) {
      differences.push(`${expected[index] ?? ''}  ≠  ${actual[index] ?? ''}`);
    }
  }
  return differences;
}

/** Text-bearing boxes that hide part of their own content (WCAG 1.4.12). */
export function clippedText(root: Element): string[] {
  const clipped = new Set<string>();
  for (const element of deepElements(root)) {
    const hasText = [...element.childNodes].some(
      (node) => node instanceof Text && node.data.trim() !== '',
    );
    if (!hasText || !isPainted(element)) {
      continue;
    }
    let node: Element | null = element;
    for (let hop = 0; node !== null && hop < 5; hop += 1) {
      const style = getComputedStyle(node);
      const clipsInline = style.overflowX === 'hidden' || style.overflowX === 'clip';
      const clipsBlock = style.overflowY === 'hidden' || style.overflowY === 'clip';
      if (
        (clipsInline && node.scrollWidth > node.clientWidth + 1) ||
        (clipsBlock && node.scrollHeight > node.clientHeight + 1)
      ) {
        clipped.add(describe(node));
        break;
      }
      node = flatParent(node);
    }
  }
  return [...clipped];
}

/**
 * Applies the WCAG 1.4.12 text-spacing overrides to the document and to every
 * shadow root under `root`; returns the undo.
 */
export function applyTextSpacing(root: Element): () => void {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    '*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important}' +
      'p{margin-block-end:2em !important}',
  );
  const roots: (Document | ShadowRoot)[] = [document];
  for (const element of deepElements(root)) {
    if (element.shadowRoot !== null) {
      roots.push(element.shadowRoot);
    }
  }
  for (const scope of roots) {
    scope.adoptedStyleSheets = [...scope.adoptedStyleSheets, sheet];
  }
  return () => {
    for (const scope of roots) {
      scope.adoptedStyleSheets = scope.adoptedStyleSheets.filter((adopted) => adopted !== sheet);
    }
  };
}
