import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  // The top-layer calendar does not contribute to the capture wrapper's height.
  minHeight: 680,
  html: `<div style="display:grid;gap:var(--ki-layout-spacing-md)" lang="en-GB">
    <ki-date-picker label="Departure" value="2025-11-12" help-text="Enter a date in DD/MM/YYYY format."></ki-date-picker>
    <ki-date-picker label="Return" value="2025-11-18" disabled></ki-date-picker>
    <ki-date-picker label="Stay" mode="range" confirm value="2025-11-12/2025-11-16"
      min="2025-11-10" max="2025-11-27" help-text="Check-in through check-out."></ki-date-picker>
  </div>`,
  async prepare(wrapper) {
    const picker = wrapper.querySelector('ki-date-picker[mode="range"]');
    picker?.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]')?.click();
    await settleFrames(2);
  },
} satisfies VisualGallery;
