const MATERIAL3_DARK = new Set(['ki-icon', 'ki-copy-button']);

/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || MATERIAL3_DARK.has(name) ? ['onmars', 'material3'] : ['onmars'];
}
