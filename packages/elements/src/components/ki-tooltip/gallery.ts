import { row, settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: row(`
    <ki-tooltip label="Explains the save action" placement="top"><ki-button>Save</ki-button></ki-tooltip>
    <ki-button id="gallery-rich-retention" type="button" variant="ghost">Retention</ki-button>
    <ki-tooltip for="gallery-rich-retention" heading="Grace period" placement="bottom">
      Deleted projects stay restorable for 30 days.
    </ki-tooltip>
  `),
  minHeight: 180,
  prepare: async (wrapper) => {
    wrapper.querySelector('#gallery-rich-retention')?.shadowRoot?.querySelector('button')?.focus();
    await settleFrames(2);
  },
} satisfies VisualGallery;
