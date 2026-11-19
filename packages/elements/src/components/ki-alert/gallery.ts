import { iconButtonGlyph } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// The alert icon slot takes the same vector glyph.
const alertGlyph = iconButtonGlyph.replace('<svg ', '<svg slot="icon" ');

// The Alert master anatomy (spec 011 A1): the tone is drawn on the icon, so
// every tone carries one; the neutral alert shows the actions row and the
// danger one the iconless, heading-less form. Two columns keep all five
// inside the 700px capture.
export default {
  focusFirst: true,
  html: [
    '<div style="display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:16px;">',
    `<ki-alert tone="neutral" dismissible dismiss-label="Dismiss" heading="Neutral heading">${alertGlyph}Neutral message body.<button slot="actions" type="button">Later</button><button slot="actions" type="button">Review</button></ki-alert>`,
    `<ki-alert tone="info" heading="Info heading">${alertGlyph}Informational message body.</ki-alert>`,
    `<ki-alert tone="success" heading="Success heading">${alertGlyph}Success message body.</ki-alert>`,
    `<ki-alert tone="warning" heading="Warning heading">${alertGlyph}Warning message body.</ki-alert>`,
    '<ki-alert tone="danger">Danger message without a heading.</ki-alert>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
