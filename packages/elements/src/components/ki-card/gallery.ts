import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-card>',
    '<div slot="media" style="block-size:96px;background:linear-gradient(135deg,#334155,#94a3b8);"></div>',
    '<h3 slot="header" style="margin:0;">Monthly report</h3>',
    '<p style="margin:0;">Revenue increased across every region this quarter.</p>',
    '<button slot="footer" type="button">Download</button>',
    '</ki-card>',
    '<ki-card>Storage is almost full.</ki-card>',
    '<ki-card><h3 slot="header" style="margin:0;">Header only</h3><p style="margin:0;">Body copy.</p><button slot="footer" type="button">Close</button></ki-card>',
  ].join(''),
} satisfies VisualGallery;
