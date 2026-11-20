import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(`<ki-segmented-control label="Range" value="week">
      <ki-segment value="day">Day</ki-segment>
      <ki-segment value="week">Week</ki-segment>
      <ki-segment value="month">Month</ki-segment>
      <ki-segment value="year" disabled>Year</ki-segment>
    </ki-segmented-control>`),
    row(`<ki-segmented-control label="View" size="sm" value="board" full-width>
      <ki-segment value="list">List</ki-segment>
      <ki-segment value="board">Project board</ki-segment>
      <ki-segment value="timeline">Timeline</ki-segment>
    </ki-segmented-control>`),
    row(`<ki-segmented-control label="Order" size="xs" dir="rtl">
      <ki-segment value="new">Newest</ki-segment>
      <ki-segment value="old">Oldest</ki-segment>
    </ki-segmented-control>`),
  ].join(''),
} satisfies VisualGallery;
