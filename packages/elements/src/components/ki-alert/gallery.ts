import { iconButtonGlyph } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// The alert icon slot takes the same vector glyph.
const alertGlyph = iconButtonGlyph.replace('<svg ', '<svg slot="icon" ');

// The Alert anatomy (spec 011 A1, A2): the card and the icon carry the tone.
// The neutral alert shows a slotted glyph and the actions row; info, success
// and danger draw their tone's default glyph (danger in the heading-less
// form), and warning replaces it with a slotted one. Two columns keep all
// five inside the 700px capture.
export default {
  focusFirst: true,
  html: [
    '<div style="display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:16px;">',
    `<ki-alert tone="neutral" dismissible dismiss-label="Dismiss" heading="Neutral heading">${alertGlyph}Neutral message body.<button slot="actions" type="button">Later</button><button slot="actions" type="button">Review</button></ki-alert>`,
    '<ki-alert tone="info" heading="Info heading">Informational message body.</ki-alert>',
    '<ki-alert tone="success" heading="Success heading">Success message body.</ki-alert>',
    `<ki-alert tone="warning" heading="Warning heading">${alertGlyph}Warning message body.</ki-alert>`,
    '<ki-alert tone="danger">Danger message without a heading.</ki-alert>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
