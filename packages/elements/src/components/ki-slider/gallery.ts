import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `
    <div lang="en-IE" style="display:grid; gap:var(--ki-space-xl); inline-size:min(100%,20rem);">
      <ki-slider label="Volume" value="60" marks="5" format="percent" help-text="Adjust playback volume"></ki-slider>
      <ki-slider label="Price" range value="20,80" format="currency" currency="EUR"></ki-slider>
      <ki-slider label="Exposure" centered min="-50" max="50" value="20"></ki-slider>
      <ki-slider label="Balance" dir="rtl" centered min="-50" max="50" value="-20"></ki-slider>
      <div style="display:flex; justify-content:space-around; gap:var(--ki-space-xl);">
        <ki-slider label="Bass" orientation="vertical" max="10" value="4" marks="5"></ki-slider>
        <ki-slider label="Treble" dir="rtl" orientation="vertical" max="10" value="7"></ki-slider>
      </div>
      <ki-slider label="Locked level" value="40" disabled></ki-slider>
    </div>
  `,
} satisfies VisualGallery;
