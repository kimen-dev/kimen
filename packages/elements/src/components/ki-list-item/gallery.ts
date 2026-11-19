import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-list>',
    '<ki-list-item><span slot="start">S</span>Primary text<span slot="secondary">Secondary text</span><span slot="end">E</span></ki-list-item>',
    '<ki-list-item>Plain item</ki-list-item>',
    '</ki-list>',
  ].join(''),
} satisfies VisualGallery;
