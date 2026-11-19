import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<p>Read the <ki-link href="#catalog">catalog contract</ki-link>, or browse ' +
      '<ki-link href="https://github.com/kimen-dev/kimen" external>the source on GitHub</ki-link>.</p>',
    row(
      '<ki-link href="#catalog" underline="hover">Documentation</ki-link>' +
        '<ki-link href="#changelog" variant="neutral" underline="hover">Changelog</ki-link>',
    ),
  ].join(''),
} satisfies VisualGallery;
