import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-list>',
    '<ki-list-item>Inbox</ki-list-item>',
    '<ki-list-item><span slot="start">A</span>Notifications<span slot="secondary">Email and push</span><span slot="end">42</span></ki-list-item>',
    '<ki-list-item>Archive<span slot="secondary">Older conversations</span></ki-list-item>',
    '</ki-list>',
  ].join(''),
} satisfies VisualGallery;
