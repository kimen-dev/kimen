import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const centered = {
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

export default centered;

export const fullscreenCompact = {
  html: [
    '<ki-dialog heading="New event" fullscreen="compact" confirm-label="Save" close-label="Discard and close">',
    '<div style="display:grid;gap:var(--ki-space-3xl)">',
    '<ki-input label="Title" value="Design review"></ki-input>',
    '<ki-input label="Date" value="24 Nov 2026"></ki-input>',
    '<ki-switch>All day</ki-switch>',
    '</div>',
    '</ki-dialog>',
  ].join(''),
  minHeight: 700,
  prepare: centered.prepare,
  width: 360,
} satisfies VisualGallery;

export const fullscreenWide = {
  ...fullscreenCompact,
  width: 1024,
} satisfies VisualGallery;
