import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-dialog heading="Confirm changes">',
    '<p style="margin:0;">Publishing replaces the current version for every member.</p>',
    '<button slot="footer" type="button">Cancel</button>',
    '<button slot="footer" type="button">Confirm</button>',
    '</ki-dialog>',
  ].join(''),
  minHeight: 760,
  prepare: async (wrapper) => {
    const dialog = wrapper.querySelector<HTMLElement & { open: boolean }>('ki-dialog');
    if (dialog) {
      dialog.open = true;
    }
    await settleFrames(2);
  },
  width: 400,
} satisfies VisualGallery;
