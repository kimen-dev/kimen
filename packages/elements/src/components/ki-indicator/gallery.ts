import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    // The current dot across the positional states: first, middle, last
    // (current is 1-based; the highlight treatment is the capture's core).
    row('<ki-indicator count="5" current="1" label="Slides"></ki-indicator>'),
    row('<ki-indicator count="5" current="3" label="Slides"></ki-indicator>'),
    row('<ki-indicator count="5" current="5" label="Slides"></ki-indicator>'),
    // Short and long collections hold the same dot metrics and gap.
    row('<ki-indicator count="2" current="1" label="Pages"></ki-indicator>'),
    row('<ki-indicator count="8" current="4" label="Pages"></ki-indicator>'),
  ].join(''),
} satisfies VisualGallery;
