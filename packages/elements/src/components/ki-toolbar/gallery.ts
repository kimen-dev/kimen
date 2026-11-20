import '../../../icons/archive.js';
import '../../../icons/bold.js';
import '../../../icons/italic.js';
import '../../../icons/link.js';
import '../../../icons/mail.js';
import '../../../icons/reply.js';
import '../../../icons/zoom-in.js';
import '../../../icons/zoom-out.js';

import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const action = (name: string, icon: string) =>
  `<ki-icon-button variant="ghost" size="sm" label="${name}"><ki-icon name="${icon}"></ki-icon></ki-icon-button>`;

export default {
  width: 400,
  html: [
    row(`<ki-toolbar label="Formatting">
      <button type="button" aria-label="Bold" aria-pressed="true" style="
        background-color:var(--ki-surface-primary-med-em);color:var(--ki-text-primary-on-primary);
        border:0;border-radius:var(--ki-radius-component-md);padding:var(--ki-layout-spacing-xs);">
        <ki-icon name="bold"></ki-icon>
      </button>
      ${action('Italic', 'italic')}
      <ki-divider orientation="vertical"></ki-divider>
      ${action('Insert link', 'link')}
    </ki-toolbar>`),
    row(`<ki-toolbar label="Message actions" tone="vibrant" dir="rtl">
      ${action('Archive', 'archive')}
      ${action('Mark unread', 'mail')}
      <ki-button slot="fab" variant="primary" size="sm">
        <ki-icon slot="start" name="reply"></ki-icon>Reply
      </ki-button>
    </ki-toolbar>`),
    row(`<ki-toolbar label="Zoom" orientation="vertical" data-ki-density="touch">
      ${action('Zoom in', 'zoom-in')}
      <ki-divider></ki-divider>
      ${action('Zoom out', 'zoom-out')}
    </ki-toolbar>`),
    `<div style="transform:translateZ(0);min-block-size:var(--ki-layout-spacing-18xl);">
      <ki-toolbar variant="docked" tone="vibrant" label="Message actions on compact screen">
        ${action('Archive', 'archive')}
        ${action('Mark unread', 'mail')}
        ${action('Reply', 'reply')}
      </ki-toolbar>
    </div>`,
  ].join(''),
} satisfies VisualGallery;
