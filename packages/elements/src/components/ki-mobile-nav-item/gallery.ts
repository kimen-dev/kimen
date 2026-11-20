import '../../../icons/circle-user.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/search.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 384,
  html: `
    <div style="transform:translate(0);min-block-size:7rem;background-color:var(--ki-surface-s0)">
      <ki-mobile-nav label="Item states" variant="floating">
        <ki-mobile-nav-item href="#home" icon-name="house">Home</ki-mobile-nav-item>
        <ki-mobile-nav-item href="#search" icon-name="search">Search</ki-mobile-nav-item>
        <ki-mobile-nav-item href="#inbox" icon-name="inbox" current count="125">Inbox</ki-mobile-nav-item>
        <ki-mobile-nav-item href="#profile" icon-name="circle-user" count="0">Profile</ki-mobile-nav-item>
      </ki-mobile-nav>
    </div>
  `,
} satisfies VisualGallery;
