import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    // Default square anatomy beside the token-driven MarsUI round type:
    // the same ASCII value encodes in both (the matrix is deterministic —
    // fixed mask selection by penalty), so only the shape tokens differ.
    // The 4-module quiet-zone floor is part of the captured geometry.
    row(
      '<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>' +
        '<div style="--ki-qr-module-radius:4px;--ki-qr-finder-radius:14px;">' +
        '<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>' +
        '</div>',
    ),
  ].join(''),
} satisfies VisualGallery;
