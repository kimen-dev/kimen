import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `<ki-carousel label="Getting started" layout="hero">
    <ki-carousel-item>
      <strong>Publish your first surface</strong>
      <span>Add components from the catalog and choose a theme.</span>
    </ki-carousel-item>
    <ki-carousel-item style="--ki-carousel-item-bg:var(--ki-surface-s3)">
      <strong>Share a preview</strong>
      <span slot="preview" style="background-color:var(--ki-surface-s3)"></span>
    </ki-carousel-item>
  </ki-carousel>`,
} satisfies VisualGallery;
