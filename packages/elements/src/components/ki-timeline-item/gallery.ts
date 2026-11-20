import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 360,
  html: `<ki-timeline label="Order updates" order="oldest-first" dir="rtl">
    <ki-timeline-item datetime="2024-11-20T11:45:00Z" data-open-details>
      Dispatch confirmed
      <div slot="details">The parcel is with the carrier.</div>
    </ki-timeline-item>
    <ki-timeline-item datetime="2024-11-19">
      <ki-avatar slot="start" size="xs" initials="ML"></ki-avatar>
      <strong>Mina Lee</strong> packed the order
    </ki-timeline-item>
    <ki-timeline-item>Delivery pending</ki-timeline-item>
  </ki-timeline>`,
  prepare: async (wrapper) => {
    const item = wrapper.querySelector('ki-timeline-item[data-open-details]');
    const details = item?.shadowRoot?.querySelector('details');
    if (!details) throw new Error('Timeline item gallery needs a details disclosure');
    details.open = true;
    await settleFrames(2);
  },
} satisfies VisualGallery;
