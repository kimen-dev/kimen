import {
  buttonSizes,
  buttonVariants,
  iconButtonGlyph,
  row,
} from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const iconButtonToneRow = (tone: string): string =>
  buttonVariants
    .map(
      (variant) =>
        `<ki-icon-button variant="${variant}" tone="${tone}" label="Add">${iconButtonGlyph}</ki-icon-button>`,
    )
    .join('');

export default {
  focusFirst: true,
  html: [
    row(iconButtonToneRow('neutral')),
    row(iconButtonToneRow('success')),
    row(iconButtonToneRow('danger')),
    row(
      buttonSizes
        .map(
          (size) =>
            `<ki-icon-button size="${size}" label="Add">${iconButtonGlyph}</ki-icon-button>`,
        )
        .join(''),
    ),
    row(
      buttonVariants
        .map(
          (variant) =>
            `<ki-icon-button variant="${variant}" disabled label="Add">${iconButtonGlyph}</ki-icon-button>`,
        )
        .join(''),
    ),
    // Glass variants over a hard-striped backdrop: the deterministic CSS
    // stripes are the only way the backdrop-filter blur is visible in a
    // capture (over a flat surface a blur is a no-op).
    '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:repeating-linear-gradient(45deg,#334155 0 8px,#94a3b8 8px 16px);">' +
      `<ki-icon-button variant="primary" label="Add">${iconButtonGlyph}</ki-icon-button>` +
      `<ki-icon-button variant="secondary" label="Add">${iconButtonGlyph}</ki-icon-button>` +
      '</div>',
  ].join(''),
} satisfies VisualGallery;
