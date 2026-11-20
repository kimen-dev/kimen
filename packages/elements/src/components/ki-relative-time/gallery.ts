import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// Keep both locales safely inside the two-hour range during a capture.
const earlier = new Date(Date.now() - 9_000_000).toISOString();

export default {
  html: `
    <dl lang="en-US">
      <dt>Recent</dt>
      <dd><ki-relative-time date="${earlier}"></ki-relative-time></dd>
      <dt>Recent in Spanish</dt>
      <dd lang="es-ES"><ki-relative-time date="${earlier}"></ki-relative-time></dd>
      <dt>Absolute calendar date</dt>
      <dd><ki-relative-time date="2026-11-19" threshold="0"></ki-relative-time></dd>
    </dl>
  `,
} satisfies VisualGallery;
