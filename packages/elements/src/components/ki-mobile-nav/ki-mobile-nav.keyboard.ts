interface KeyboardViewport {
  editing: boolean;
  keyboardHeight: number;
  layoutHeight: number;
  baselineHeight: number;
  visualHeight: number;
  scale: number;
}

export function keyboardOccludesNavigation(viewport: KeyboardViewport): boolean {
  throw new Error(`Keyboard detection is pending at ${String(viewport.visualHeight)}px`);
}
