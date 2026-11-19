import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  focusFirst: true,
  html: [
    '<ki-radio-group label="Contact method" value="email">',
    '<ki-radio value="email">Email</ki-radio>',
    '<ki-radio value="sms">SMS</ki-radio>',
    '<ki-radio value="phone" disabled>Phone</ki-radio>',
    '</ki-radio-group>',
  ].join(''),
} satisfies VisualGallery;
