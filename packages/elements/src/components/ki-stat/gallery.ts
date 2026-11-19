import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ki-space-xl)" lang="en-US">
    <ki-stat label="Active surfaces" value="1284" delta="0.12" delta-label="vs last week"></ki-stat>
    <ki-stat label="Median render time" value="84" unit="ms" delta="-9" delta-label="vs last week" direction="lower-is-better"></ki-stat>
    <ki-stat label="Blocked components" value="37" delta="5" delta-label="vs last week" direction="lower-is-better"></ki-stat>
    <ki-stat label="Availability" value="99.95" unit="%" delta="0" delta-label="vs last week" direction="neutral"></ki-stat>
    <ki-stat label="Open issues" value="18" delta="-3" direction="neutral" dir="rtl"></ki-stat>
    <ki-stat label="Builds this week" value="148">
      <svg slot="chart" aria-hidden="true" viewBox="0 0 80 20" width="80" height="20">
        <path d="M1 17 L13 11 L27 14 L39 4 L52 8 L67 5 L79 1" fill="none" stroke="currentColor" />
      </svg>
    </ki-stat>
  </div>`,
  async prepare(wrapper) {
    const surfaces = wrapper.querySelector('ki-stat[label="Active surfaces"]');
    if (surfaces) {
      Object.assign(surfaces, { deltaFormat: { style: 'percent' } });
    }
    await settleFrames(2);
  },
} satisfies VisualGallery;
