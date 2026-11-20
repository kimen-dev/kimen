import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-breadcrumb label="Breadcrumb item states">',
    '<ki-breadcrumb-item href="#workspace">Workspace</ki-breadcrumb-item>',
    '<ki-breadcrumb-item>Administration</ki-breadcrumb-item>',
    '<ki-breadcrumb-item current>Settings</ki-breadcrumb-item>',
    '</ki-breadcrumb>',
  ].join(''),
  width: 400,
} satisfies VisualGallery;
