import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-radio-group label="Plan" required value="pro">',
    '<ki-radio value="basic">Basic</ki-radio>',
    '<ki-radio value="pro">Pro</ki-radio>',
    '</ki-radio-group>',
    '<ki-radio-group label="Disabled group" disabled value="basic">',
    '<ki-radio value="basic">Basic</ki-radio>',
    '<ki-radio value="pro">Pro</ki-radio>',
    '</ki-radio-group>',
  ].join(''),
} satisfies VisualGallery;
