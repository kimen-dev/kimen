import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  minHeight: 240,
  html: `
    <ki-button id="gallery-group-actions" type="button">Actions</ki-button>
    <ki-menu anchor="gallery-group-actions" open>
      <ki-menu-group label="Edit">
        <ki-menu-item value="rename">Rename</ki-menu-item>
        <ki-menu-item value="duplicate">Duplicate</ki-menu-item>
      </ki-menu-group>
      <ki-divider></ki-divider>
      <ki-menu-group label="Density">
        <ki-menu-item type="radio" value="compact" checked>Compact</ki-menu-item>
        <ki-menu-item type="radio" value="comfortable">Comfortable</ki-menu-item>
      </ki-menu-group>
    </ki-menu>
  `,
} satisfies VisualGallery;
