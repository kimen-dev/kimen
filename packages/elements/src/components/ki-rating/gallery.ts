import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  focusFirst: true,
  html: [
    row('<ki-rating readonly label="Average review score" value="4.3"></ki-rating>'),
    row('<ki-rating label="How useful was the answer?" value="3"></ki-rating>'),
    row('<ki-rating label="Rate this experience" value="2.5" precision="0.5"></ki-rating>'),
    row('<ki-rating label="Rate the clarity" value="2.5" precision="0.5" dir="rtl"></ki-rating>'),
    row('<ki-rating label="Feedback closed" value="3" disabled></ki-rating>'),
  ].join(''),
} satisfies VisualGallery;
