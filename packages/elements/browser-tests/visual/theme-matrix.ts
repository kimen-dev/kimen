/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || ['ki-icon', 'ki-details', 'ki-accordion'].includes(name)
    ? ['onmars', 'material3']
    : ['onmars'];
}
