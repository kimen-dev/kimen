import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-select label="Country" value="fr">',
    '<ki-option value="es">Spain</ki-option>',
    '<ki-option value="fr">France</ki-option>',
    '<ki-option value="pt" disabled>Portugal</ki-option>',
    '</ki-select>',
  ].join(''),
  minHeight: 380,
  // ki-option paints only inside the ki-select listbox: open it so the
  // option rows (rest, selected, disabled) are what this gallery captures.
  prepare: async (wrapper) => {
    const select = wrapper.querySelector('ki-select');
    const trigger = select?.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
    trigger?.click();
    await settleFrames(2);
  },
} satisfies VisualGallery;
