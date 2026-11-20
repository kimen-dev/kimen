import '../../../icons/calendar.js';
import '../../../icons/pencil.js';

import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <div role="menu" aria-label="Create" style="display:grid;justify-items:start;gap:8px;padding:12px;">
      <ki-fab-menu-item icon-name="pencil" value="message">New message</ki-fab-menu-item>
      <ki-fab-menu-item icon-name="calendar" href="#event">New event</ki-fab-menu-item>
      <ki-fab-menu-item dir="rtl">New project</ki-fab-menu-item>
    </div>
  `,
} satisfies VisualGallery;
