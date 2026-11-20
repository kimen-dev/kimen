import '../../../icons/copy.js';
import '../../../icons/ellipsis.js';
import '../../../icons/refresh-cw.js';
import '../../../icons/thumbs-down.js';
import '../../../icons/thumbs-up.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    '<div style="display:grid;gap:var(--ki-conversation-gap)">',
    '<ki-message message-role="user">Can I keep a copy of my project settings and restore them later?</ki-message>',
    '<ki-message message-role="event" icon-name="search">Found the export guide</ki-message>',
    '<ki-message author="Ava said">',
    '<ki-avatar slot="avatar" size="xs" initials="AV"></ki-avatar>',
    '<strong>Yes.</strong> Save the settings from the export menu.',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="Copy reply"><ki-icon name="copy"></ki-icon></ki-icon-button>',
    '</ki-message>',
    '<ki-message actions-label="Export reply actions" branch-index="2" branch-count="3" feedback="good">',
    'Choose the JSON format to keep the export readable.',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="Copy reply"><ki-icon name="copy"></ki-icon></ki-icon-button>',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="Regenerate" data-message-action="regenerate"><ki-icon name="refresh-cw"></ki-icon></ki-icon-button>',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="Good response" tone="success" data-message-action="good"><ki-icon name="thumbs-up"></ki-icon></ki-icon-button>',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="Bad response" data-message-action="bad"><ki-icon name="thumbs-down"></ki-icon></ki-icon-button>',
    '<ki-icon-button slot="actions" size="sm" variant="ghost" label="More actions"><ki-icon name="ellipsis"></ki-icon></ki-icon-button>',
    '</ki-message>',
    '<div dir="rtl" style="display:grid;gap:var(--ki-conversation-gap)">',
    '<ki-message message-role="user">Which format?</ki-message>',
    '<ki-message streaming>Choose the <code>JSON</code> option</ki-message>',
    '<ki-message branch-index="1" branch-count="3">Store the new file with your project.</ki-message>',
    '</div>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
