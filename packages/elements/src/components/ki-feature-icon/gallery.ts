import '../../../icons/ban.js';
import '../../../icons/info.js';
import '../../../icons/layers.js';
import '../../../icons/puzzle.js';
import '../../../icons/rocket.js';
import '../../../icons/shield-check.js';
import '../../../icons/sparkles.js';
import '../../../icons/zap.js';

import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export const toneGlyphs = [
  ['neutral', 'puzzle'],
  ['primary', 'sparkles'],
  ['primary-light', 'rocket'],
  ['info', 'info'],
  ['success', 'shield-check'],
  ['warning', 'zap'],
  ['danger', 'ban'],
] as const;

export const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

const rowStyle = 'display:flex;flex-wrap:wrap;align-items:center;gap:var(--ki-space-md)';
const headingStyle = 'margin-block:0;font-size:var(--ki-typography-size-body-1)';

export default {
  width: 400,
  html: `
    <div style="${rowStyle}">
      ${toneGlyphs
        .map(
          ([tone, glyph]) =>
            `<ki-feature-icon tone="${tone}"><ki-icon name="${glyph}"></ki-icon></ki-feature-icon>`,
        )
        .join('')}
    </div>
    <div style="${rowStyle}">
      ${sizes
        .map(
          (size) =>
            `<ki-feature-icon size="${size}" tone="primary-light"><ki-icon name="layers"></ki-icon></ki-feature-icon>`,
        )
        .join('')}
    </div>
    <div style="${rowStyle}">
      <ki-feature-icon tone="primary-light"><ki-icon name="shield-check"></ki-icon></ki-feature-icon>
      <h2 style="${headingStyle}">Security settings</h2>
    </div>
    <div dir="rtl" style="${rowStyle}">
      <ki-feature-icon tone="primary-light" shape="circle"><ki-icon name="shield-check"></ki-icon></ki-feature-icon>
      <h2 style="${headingStyle}">Workspace access</h2>
    </div>
  `,
} satisfies VisualGallery;
