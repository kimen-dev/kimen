interface KeyboardViewport {
  editing: boolean;
  keyboardHeight: number;
  layoutHeight: number;
  baselineHeight: number;
  visualHeight: number;
  scale: number;
}

// Small browser-toolbar changes should leave the bar available while typing.
const MIN_KEYBOARD_OCCLUSION = 120;

export function keyboardOccludesNavigation(viewport: KeyboardViewport): boolean {
  if (viewport.keyboardHeight > 0) return true;

  const availableHeight = viewport.visualHeight * viewport.scale;
  const unobstructedHeight = Math.max(viewport.layoutHeight, viewport.baselineHeight);
  return viewport.editing && unobstructedHeight - availableHeight >= MIN_KEYBOARD_OCCLUSION;
}
