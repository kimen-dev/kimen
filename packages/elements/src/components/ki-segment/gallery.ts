import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: row(`<ki-segmented-control label="View" size="sm" value="board">
    <ki-segment value="list">
      <svg slot="start" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z" fill="currentColor"/>
      </svg>
      List
    </ki-segment>
    <ki-segment value="board" aria-label="Board">
      <svg slot="start" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 2h4v12H2zm6 0h6v7H8z" fill="currentColor"/>
      </svg>
    </ki-segment>
    <ki-segment value="timeline" disabled>Timeline</ki-segment>
  </ki-segmented-control>`),
} satisfies VisualGallery;
