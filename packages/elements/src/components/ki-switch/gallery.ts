import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  focusFirst: true,
  html: [
    row('<ki-switch>Notifications</ki-switch>'),
    row('<ki-switch checked>Checked</ki-switch>'),
    row('<ki-switch disabled>Disabled</ki-switch>'),
    row('<ki-switch checked disabled>Checked disabled</ki-switch>'),
  ].join(''),
} satisfies VisualGallery;
