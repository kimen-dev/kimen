// Components whose contract also captures Material 3 in the dark scheme.
const MATERIAL3_DARK: ReadonlySet<string> = new Set([
  'ki-checkbox-group',
  'ki-counter',
  'ki-grid',
  'ki-icon',
  'ki-image',
  'ki-link',
  'ki-note',
  'ki-spinner',
  'ki-stack',
]);

/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || MATERIAL3_DARK.has(name) ? ['onmars', 'material3'] : ['onmars'];
}
