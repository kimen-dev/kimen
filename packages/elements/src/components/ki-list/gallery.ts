import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    '<ki-list>',
    '<ki-list-item>Inbox</ki-list-item>',
    '<ki-list-item><span slot="start">A</span>Notifications<span slot="secondary">Email and push</span><span slot="end">42</span></ki-list-item>',
    '<ki-list-item>Archive<span slot="secondary">Older conversations</span></ki-list-item>',
    '</ki-list>',
    '<ki-list label="Settings">',
    '<ki-list-item href="#account">Account<span slot="secondary">Name, email, password</span></ki-list-item>',
    '<ki-list-item href="#appearance">Appearance</ki-list-item>',
    '</ki-list>',
    '<ki-list label="Delivery method" selection="single">',
    '<ki-list-item value="email" selected>Email</ki-list-item>',
    '<ki-list-item value="push">Push notification</ki-list-item>',
    '</ki-list>',
    '<ki-list label="Reviewers" selection="multiple">',
    '<ki-list-item value="ana" selected>Ana Garcia<span slot="secondary">Design</span></ki-list-item>',
    '<ki-list-item value="luis">Luis Perez</ki-list-item>',
    '<ki-list-item value="sara" disabled>Sara Martin</ki-list-item>',
    '</ki-list>',
    '<ki-list label="Notifications">',
    '<ki-list-item>Email digest<span slot="secondary">Every Monday</span><ki-switch slot="end" checked></ki-switch></ki-list-item>',
    '</ki-list>',
  ].join(''),
} satisfies VisualGallery;
