import '../../../icons/settings.js';
import '../../../icons/users.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 384,
  html: `
    <ki-sidebar label="Workspace" dir="rtl">
      <ki-sidebar-group label="Team settings">
        <ki-sidebar-item href="#members" icon-name="users" current>Members</ki-sidebar-item>
        <ki-sidebar-item href="#settings" icon-name="settings">Settings</ki-sidebar-item>
      </ki-sidebar-group>
      <ki-sidebar-group label="Personal">
        <ki-sidebar-item href="#profile">Profile</ki-sidebar-item>
      </ki-sidebar-group>
    </ki-sidebar>
  `,
} satisfies VisualGallery;
