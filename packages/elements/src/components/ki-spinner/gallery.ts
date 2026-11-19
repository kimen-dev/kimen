import { row, settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(
      '<ki-spinner size="sm" label="Saving changes"></ki-spinner>' +
        '<ki-spinner label="Running a tool"></ki-spinner>' +
        '<ki-spinner size="lg" label="Connecting"></ki-spinner>',
    ),
    row(
      '<ki-spinner size="sm" label="Saving changes" show-label></ki-spinner>' +
        '<ki-spinner variant="dots" label="Assistant is thinking" show-label></ki-spinner>' +
        '<ki-spinner variant="dots" label="Checking sources"></ki-spinner>',
    ),
  ].join(''),
  async prepare(wrapper) {
    // Reduced motion still rotates the ring. Pause every ring at the start
    // of its revolution to compare identical animation phases.
    for (const host of wrapper.querySelectorAll('ki-spinner')) {
      const ring = host.shadowRoot?.querySelector('[part="ring"]');
      for (const animation of ring?.getAnimations() ?? []) {
        animation.pause();
        animation.currentTime = 0;
      }
    }
    await settleFrames(2);
  },
} satisfies VisualGallery;
