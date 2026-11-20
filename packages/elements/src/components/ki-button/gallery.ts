import { buttonSizes, buttonVariants, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const buttonToneRow = (tone: string): string =>
  buttonVariants
    .map((variant) => `<ki-button variant="${variant}" tone="${tone}">${variant}</ki-button>`)
    .join('');

const togglePairs = [...buttonVariants, 'outline']
  .map((variant) =>
    row(
      `<ki-button size="sm" variant="${variant}" toggle>Pin</ki-button>` +
        `<ki-button size="sm" variant="${variant}" toggle selected>Pin</ki-button>`,
    ),
  )
  .join('');

export default {
  focusFirst: true,
  width: 400,
  html: [
    row(buttonToneRow('neutral')),
    row(buttonToneRow('success')),
    row(buttonToneRow('danger')),
    row(buttonSizes.map((size) => `<ki-button size="${size}">${size}</ki-button>`).join('')),
    row(
      buttonVariants
        .map((variant) => `<ki-button variant="${variant}" disabled>${variant}</ki-button>`)
        .join(''),
    ),
    row(
      '<ki-button variant="primary"><span slot="start">+</span>Start and end<span slot="end">&gt;</span></ki-button>',
    ),
    row(togglePairs),
  ].join(''),
} satisfies VisualGallery;
