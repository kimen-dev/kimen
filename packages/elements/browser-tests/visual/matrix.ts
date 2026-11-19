export type VisualScheme = 'dark' | 'light';
export type VisualTheme = 'material3' | 'onmars';

/** The capture matrix shared by the browser harness and Linux baseline audit. */
export function visualThemes(name: string, scheme: VisualScheme): readonly VisualTheme[] {
  return scheme === 'light' || name === 'ki-image' ? ['onmars', 'material3'] : ['onmars'];
}
