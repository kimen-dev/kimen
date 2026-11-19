import '../../../icons/arrow-right.js';
import '../../../icons/circle-alert.js';
import '../../../icons/circle-check.js';
import '../../../icons/info.js';
import '../../../icons/layers.js';
import '../../../icons/search.js';
import '../../../icons/sparkles.js';
import '../../../icons/triangle-alert.js';

import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(
      '<ki-icon name="search" size="md" label="Search"></ki-icon>' +
        '<ki-icon name="arrow-right" size="md" label="Right"></ki-icon>' +
        '<span><ki-icon name="circle-check"></ki-icon> Confirmed</span>',
    ),
    row(
      ['sm', 'md', 'lg'].map((size) => `<ki-icon name="layers" size="${size}"></ki-icon>`).join(''),
    ),
    row(
      (
        [
          ['info', 'info', 'Information'],
          ['circle-check', 'success', 'Success'],
          ['triangle-alert', 'warning', 'Warning'],
          ['circle-alert', 'danger', 'Error'],
          ['sparkles', 'primary', 'Featured'],
        ] as const
      )
        .map(
          ([name, tone, label]) =>
            `<ki-icon name="${name}" size="lg" label="${label}" style="color:var(--ki-text-${tone}-high-em)"></ki-icon>`,
        )
        .join(''),
    ),
  ].join(''),
} satisfies VisualGallery;
