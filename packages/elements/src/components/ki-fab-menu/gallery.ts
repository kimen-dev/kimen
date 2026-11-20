import '../../../icons/calendar.js';
import '../../../icons/pencil.js';

import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const actions = `
  <ki-fab-menu-item icon-name="pencil" value="message">New message</ki-fab-menu-item>
  <ki-fab-menu-item icon-name="calendar" href="#event">New event</ki-fab-menu-item>
`;

export default {
  width: 400,
  html: `
    <div style="display:grid;justify-items:end;gap:12px;padding:12px;">
      <ki-fab-menu label="Create">${actions}</ki-fab-menu>
      <div style="display:grid;align-items:end;justify-items:end;block-size:192px;inline-size:100%;">
        <ki-fab-menu label="Add" open scrim="false">${actions}</ki-fab-menu>
      </div>
      <div dir="rtl" style="display:grid;justify-items:end;inline-size:100%;">
        <ki-fab-menu label="Compose" variant="surface" icon-name="pencil">${actions}</ki-fab-menu>
      </div>
    </div>
  `,
} satisfies VisualGallery;
