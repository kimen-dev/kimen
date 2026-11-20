import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `
    <dl lang="en-US">
      <dt>Decimal</dt>
      <dd><ki-format-number value="1284.5"></ki-format-number></dd>
      <dt>Currency</dt>
      <dd><ki-format-number value="49" currency="EUR"></ki-format-number></dd>
      <dt>Spanish currency</dt>
      <dd lang="es-ES"><ki-format-number value="49" currency="EUR"></ki-format-number></dd>
      <dt>Percent</dt>
      <dd><ki-format-number value="0.496" format-style="percent" maximum-fraction-digits="1"></ki-format-number></dd>
      <dt>Temperature</dt>
      <dd><ki-format-number value="23" format-style="unit" unit="celsius"></ki-format-number></dd>
      <dt>Compact notation</dt>
      <dd><ki-format-number value="59320" notation="compact"></ki-format-number></dd>
    </dl>
  `,
} satisfies VisualGallery;
