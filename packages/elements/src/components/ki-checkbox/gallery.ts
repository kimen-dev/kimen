import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  focusFirst: true,
  html: [
    row('<ki-checkbox>Unchecked</ki-checkbox>'),
    row('<ki-checkbox checked>Checked</ki-checkbox>'),
    row('<ki-checkbox indeterminate>Indeterminate</ki-checkbox>'),
    row('<ki-checkbox required>Required</ki-checkbox>'),
    row('<ki-checkbox disabled>Disabled</ki-checkbox>'),
    row('<ki-checkbox checked disabled>Checked disabled</ki-checkbox>'),
  ].join(''),
} satisfies VisualGallery;
