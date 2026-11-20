import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    '<div style="display:grid;gap:var(--ki-conversation-gap)">',
    '<ki-message message-role="user">Can I keep a copy of my project settings and restore them later?</ki-message>',
    '<ki-message message-role="event" icon-name="search">Found the export guide</ki-message>',
    '<ki-message author="Ava said">',
    '<span slot="avatar" aria-hidden="true">AV</span>',
    '<strong>Yes.</strong> Save the settings from the export menu.',
    '<button slot="actions" type="button" tabindex="0">Copy reply</button>',
    '</ki-message>',
    '<div dir="rtl" style="display:grid;gap:var(--ki-conversation-gap)">',
    '<ki-message message-role="user">Which format?</ki-message>',
    '<ki-message streaming>Choose the <code>JSON</code> option</ki-message>',
    '</div>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
