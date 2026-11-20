import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `
    <dl lang="en-US">
      <dt>Long date</dt>
      <dd><ki-format-date date="2026-11-19" date-style="long"></ki-format-date></dd>
      <dt>Spanish date</dt>
      <dd><ki-format-date date="2026-11-19" date-style="long" lang="es-ES"></ki-format-date></dd>
      <dt>UTC timestamp</dt>
      <dd><ki-format-date date="2026-11-19T08:41:00Z" date-style="short" time-style="short" time-zone="UTC"></ki-format-date></dd>
    </dl>
  `,
} satisfies VisualGallery;
