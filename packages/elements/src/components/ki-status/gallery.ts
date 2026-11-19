import { badgeTones, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const statusToneRow = (attributes: string): string =>
  badgeTones.map((tone) => `<ki-status tone="${tone}"${attributes}></ki-status>`).join('');

export default {
  html: [
    // Full tone x ring x label matrix. A label never paints (visible
    // status text belongs to ki-badge), so each labeled row must stay
    // pixel-identical to its unlabeled sibling — the capture guards that
    // invariant alongside the tone fills and the ring layer.
    row(statusToneRow('')),
    row(statusToneRow(' label="Service state"')),
    // The ring separates the dot from media beneath it and resolves to
    // the surface color, so only a deterministic contrasting strip (the
    // media stand-in) makes the ring layer visible in the capture.
    '<div style="display:flex;flex-direction:column;gap:12px;padding:12px;background:linear-gradient(135deg,#334155,#94a3b8);">' +
      row(statusToneRow(' ring')) +
      row(statusToneRow(' ring label="Service state"')) +
      '</div>',
  ].join(''),
} satisfies VisualGallery;
