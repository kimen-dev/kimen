import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  // Rest state only: the tooltip surfaces after a focus/hover delay, and
  // that timing is not deterministic under the stabilization loop. The
  // popup itself stays covered by the functional + motion suites.
  html: row(
    '<ki-tooltip label="Explains the save action" placement="top"><ki-button>Save</ki-button></ki-tooltip>',
  ),
} satisfies VisualGallery;
