/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  const bothThemes =
    scheme === 'light' || ['ki-icon', 'ki-segment', 'ki-segmented-control'].includes(name);
  return bothThemes ? ['onmars', 'material3'] : ['onmars'];
}
