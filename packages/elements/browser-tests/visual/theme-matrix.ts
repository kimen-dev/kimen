/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  const bothThemes = ['ki-icon', 'ki-menu', 'ki-menu-item', 'ki-menu-group'].includes(name);
  return scheme === 'light' || bothThemes ? ['onmars', 'material3'] : ['onmars'];
}
