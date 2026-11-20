// Viewport, not container: the native modal occupies the window's top layer.
export const COMPACT_VIEWPORT = '(width < 600px)';

export function usesFullscreen(mode: string | undefined, compactViewport: boolean): boolean {
  return mode === 'always' || (mode === 'compact' && compactViewport);
}
