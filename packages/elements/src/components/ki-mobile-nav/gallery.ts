import '../../../icons/circle-user.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/search.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const frame = 'transform:translate(0);min-block-size:7rem;background-color:var(--ki-surface-s0)';
const destinations = `
  <ki-mobile-nav-item href="#home" icon-name="house" current>Home</ki-mobile-nav-item>
  <ki-mobile-nav-item href="#search" icon-name="search">Search</ki-mobile-nav-item>
  <ki-mobile-nav-item href="#inbox" icon-name="inbox" count="3">Inbox</ki-mobile-nav-item>
  <ki-mobile-nav-item href="#profile" icon-name="circle-user">Profile</ki-mobile-nav-item>
`;

export default {
  width: 384,
  html: `
    <div style="${frame}">
      <ki-mobile-nav label="Fixed navigation">${destinations}</ki-mobile-nav>
    </div>
    <div style="${frame}">
      <ki-mobile-nav label="Floating navigation" variant="floating" dir="rtl">
        ${destinations}
      </ki-mobile-nav>
    </div>
  `,
} satisfies VisualGallery;
