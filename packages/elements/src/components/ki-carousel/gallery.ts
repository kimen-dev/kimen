import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const slides = `
  <ki-carousel-item style="--ki-carousel-item-bg:var(--ki-surface-s2)">
    <strong>Guarded catalog</strong>
    <span>Build from approved components.</span>
  </ki-carousel-item>
  <ki-carousel-item style="--ki-carousel-item-bg:var(--ki-surface-s3)">
    <strong>Themes</strong>
    <span>onmars and Material 3.</span>
  </ki-carousel-item>
  <ki-carousel-item style="--ki-carousel-item-bg:var(--ki-surface-s1)">
    <strong>Adapters</strong>
    <span>Connect surfaces to your app.</span>
  </ki-carousel-item>`;

export default {
  width: 400,
  html: `<div style="display:grid;gap:var(--ki-space-3xl)">
    <ki-carousel label="Kimen highlights" loop>${slides}</ki-carousel>
    <ki-carousel label="Browse highlights" layout="multi-browse">${slides}</ki-carousel>
    <ki-carousel label="Featured highlights" layout="hero" dir="rtl">${slides}</ki-carousel>
    <ki-carousel label="More highlights" layout="uncontained" current="2">${slides}</ki-carousel>
    <ki-carousel label="Highlights feed" layout="full-screen"
      style="--ki-carousel-full-screen-block-size:var(--ki-space-24xl)">${slides}</ki-carousel>
  </div>`,
} satisfies VisualGallery;
