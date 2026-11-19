const bothSchemes = new Set(['ki-icon', 'ki-skeleton']);

/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || bothSchemes.has(name) ? ['onmars', 'material3'] : ['onmars'];
}
