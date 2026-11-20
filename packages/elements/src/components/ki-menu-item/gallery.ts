import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  minHeight: 240,
  html: `
    <ki-button id="gallery-item-actions" type="button">Actions</ki-button>
    <ki-menu anchor="gallery-item-actions" open>
      <ki-menu-item value="rename" shortcut="F2">Rename</ki-menu-item>
      <ki-menu-item value="pin" type="checkbox" checked>Pin to sidebar</ki-menu-item>
      <ki-menu-item value="move" disabled>Move to…</ki-menu-item>
      <ki-menu-item value="delete" tone="danger">Delete</ki-menu-item>
    </ki-menu>
  `,
} satisfies VisualGallery;
