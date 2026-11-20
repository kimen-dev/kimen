// Components whose contract also captures Material 3 in the dark scheme.
const MATERIAL3_DARK: ReadonlySet<string> = new Set([
  'ki-card',
  'ki-checkbox-group',
  'ki-chip',
  'ki-chip-group',
  'ki-counter',
  'ki-empty-state',
  'ki-grid',
  'ki-icon',
  'ki-image',
  'ki-link',
  'ki-menu',
  'ki-menu-group',
  'ki-menu-item',
  'ki-note',
  'ki-popover',
  'ki-segment',
  'ki-segmented-control',
  'ki-skeleton',
  'ki-spinner',
  'ki-stack',
  'ki-stat',
]);

/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || MATERIAL3_DARK.has(name) ? ['onmars', 'material3'] : ['onmars'];
}
