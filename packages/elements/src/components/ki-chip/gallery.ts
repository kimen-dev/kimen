import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const calendar =
  '<svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v6m8-6v6"/></svg>';
const directions =
  '<svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>';

export default {
  html: [
    row(
      '<ki-chip value="eng">Engineering</ki-chip><ki-chip value="design" selected>Design</ki-chip><ki-chip disabled>Legal</ki-chip><ki-chip size="sm">Marketing</ki-chip>',
    ),
    row(
      '<ki-chip type="input" value="ana" removable><ki-avatar slot="start" size="xxs" initials="AG" label="Ana García"></ki-avatar>Ana García</ki-chip><ki-chip type="input" size="sm" removable>Luis</ki-chip><ki-chip type="input">Approved</ki-chip>',
    ),
    row(
      `<ki-chip type="assist">${calendar}Add to calendar</ki-chip><ki-chip type="assist" size="sm">${directions}Directions</ki-chip>`,
    ),
  ].join(''),
} satisfies VisualGallery;
