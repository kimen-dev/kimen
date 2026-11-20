import '../../../icons/circle-user.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/settings.js';
import '../../../icons/users.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const destinations = `
  <ki-sidebar-item href="#home" icon-name="house" current>Home</ki-sidebar-item>
  <ki-sidebar-item href="#inbox" icon-name="inbox" count="12">Inbox</ki-sidebar-item>
  <ki-sidebar-group label="Workspace">
    <ki-sidebar-item href="#members" icon-name="users">Members</ki-sidebar-item>
    <ki-sidebar-item href="#settings" icon-name="settings">Settings</ki-sidebar-item>
  </ki-sidebar-group>`;

export default {
  width: 384,
  html: `
  <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:12px;">
    <ki-sidebar label="Workspace navigation" collapsible>
      <span slot="brand">Kimen</span>
      ${destinations}
      <ki-button slot="footer" type="button" variant="ghost" size="sm">
        <ki-icon slot="start" name="circle-user"></ki-icon>Ana Garcia
      </ki-button>
    </ki-sidebar>
    <ki-sidebar label="Workspace navigation rail" collapsible collapsed>
      ${destinations}
      <ki-icon-button slot="footer" label="Account: Ana Garcia" variant="ghost" size="sm">
        <ki-icon name="circle-user"></ki-icon>
      </ki-icon-button>
    </ki-sidebar>
  </div>`,
} satisfies VisualGallery;
