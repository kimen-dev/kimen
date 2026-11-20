import '../../../icons/bot.js';
import '../../../icons/circle-alert.js';
import '../../../icons/circle-check.js';
import '../../../icons/git-merge.js';
import '../../../icons/triangle-alert.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 360,
  // Historical timestamps keep relative-time text out of the snapshots.
  html: `<ki-timeline label="Deployment activity">
    <ki-timeline-item icon-name="bot" datetime="2024-11-19T10:18:00Z">Build started</ki-timeline-item>
    <ki-timeline-item icon-name="git-merge" tone="primary" datetime="2024-11-19T10:41:00Z">
      <strong>Luis Perez</strong> merged a fix
    </ki-timeline-item>
    <ki-timeline-item icon-name="circle-check" tone="success" datetime="2024-11-19T10:38:00Z">
      All checks passed
    </ki-timeline-item>
    <ki-timeline-item icon-name="triangle-alert" tone="warning" datetime="2024-11-19T10:25:00Z">
      Runner capacity is low
    </ki-timeline-item>
    <ki-timeline-item icon-name="circle-alert" tone="danger" datetime="2024-11-19T10:20:00Z" details-label="Build log">
      Preview deploy failed
      <div slot="details">The runner timed out.</div>
    </ki-timeline-item>
  </ki-timeline>`,
} satisfies VisualGallery;
