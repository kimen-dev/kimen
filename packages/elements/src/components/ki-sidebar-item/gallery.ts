import '../../../icons/house.js';
import '../../../icons/inbox.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 384,
  html: `
    <ki-sidebar label="Project navigation">
      <ki-sidebar-item href="#home" icon-name="house" current>Home</ki-sidebar-item>
      <ki-sidebar-item href="#inbox" icon-name="inbox" count="120">Inbox</ki-sidebar-item>
      <ki-sidebar-item href="#reports" count="0">Reports</ki-sidebar-item>
    </ki-sidebar>
  `,
} satisfies VisualGallery;
