import { iconButtonGlyph, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(`
      <ki-icon-button variant="secondary" label="Notifications, 3 unread">
        ${iconButtonGlyph}<ki-counter slot="counter" value="3"></ki-counter>
      </ki-icon-button>
      <ki-icon-button variant="secondary" label="Messages, 120 unread">
        ${iconButtonGlyph}<ki-counter slot="counter" value="120" tone="primary"></ki-counter>
      </ki-icon-button>
      <ki-icon-button variant="secondary" label="Updates, new" dir="rtl">
        ${iconButtonGlyph}<ki-counter slot="counter" dot></ki-counter>
      </ki-icon-button>
      <ki-avatar label="Ana García, online" initials="AG">
        <ki-counter slot="counter" tone="success" dot></ki-counter>
      </ki-avatar>
      <ki-avatar label="Team inbox, 12 pending" initials="TI">
        <ki-counter slot="counter" tone="neutral" value="12"></ki-counter>
      </ki-avatar>
      <ki-icon-button variant="secondary" label="No unread alerts">
        ${iconButtonGlyph}<ki-counter slot="counter" value="0"></ki-counter>
      </ki-icon-button>
    `),
  ].join(''),
} satisfies VisualGallery;
