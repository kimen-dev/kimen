// Components whose contract also captures Material 3 in the dark scheme.
const MATERIAL3_DARK: ReadonlySet<string> = new Set([
  'ki-card',
  'ki-checkbox-group',
  'ki-chip',
  'ki-chip-group',
  'ki-code-block',
  'ki-copy-button',
  'ki-counter',
  'ki-empty-state',
  'ki-format-date',
  'ki-format-number',
  'ki-grid',
  'ki-icon',
  'ki-image',
  'ki-link',
  'ki-menu',
  'ki-menu-group',
  'ki-menu-item',
  'ki-note',
  'ki-relative-time',
  'ki-segment',
  'ki-segmented-control',
  'ki-skeleton',
  'ki-spinner',
  'ki-stack',
  'ki-stat',
  'ki-tool-call',
]);

/** Both schemes are alternately themed when the component contract requires it. */
export function visualGalleryThemes(
  name: string,
  scheme: 'light' | 'dark',
): readonly ('onmars' | 'material3')[] {
  return scheme === 'light' || MATERIAL3_DARK.has(name) ? ['onmars', 'material3'] : ['onmars'];
}
