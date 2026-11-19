import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const pencil = `<svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4M4 20l4-1L20 7l-3-3L5 16z"/></svg>`;
const overflow = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`;

export default {
  minHeight: 340,
  html: `
    <div style="display:flex;flex-wrap:wrap;gap:var(--ki-space-5xl)">
      <div style="flex:1 1 var(--ki-menu-min-inline-size);padding-block-end:var(--ki-size-surface-xs)">
        <ki-button id="gallery-actions" type="button" variant="quaternary">Actions</ki-button>
        <ki-menu anchor="gallery-actions" filter-label="Filter actions" open>
          <ki-menu-group label="Edit">
            <ki-menu-item value="rename" shortcut="F2">${pencil}Rename</ki-menu-item>
            <ki-menu-item value="duplicate" shortcut="⌘D">Duplicate</ki-menu-item>
            <ki-menu-item value="move" disabled>Move to…</ki-menu-item>
            <ki-menu-item value="pin" type="checkbox" checked>Pin to sidebar</ki-menu-item>
          </ki-menu-group>
          <ki-divider></ki-divider>
          <ki-menu-item value="delete" tone="danger">Delete</ki-menu-item>
        </ki-menu>
      </div>
      <div style="flex:1 1 var(--ki-menu-min-inline-size);padding-block-end:var(--ki-size-surface-xs)">
        <ki-icon-button id="gallery-account" type="button" variant="ghost" label="Account for Ana García">
          ${overflow}
        </ki-icon-button>
        <ki-menu anchor="gallery-account" open>
          <div slot="header" style="display:flex;align-items:center;gap:var(--ki-space-md);padding:var(--ki-space-md)">
            <ki-avatar initials="AG" size="md"></ki-avatar>
            <div>Ana García<br/><span style="color:var(--ki-menu-meta-fg)">ana@example.com</span></div>
          </div>
          <ki-divider></ki-divider>
          <ki-menu-item value="profile">Profile</ki-menu-item>
          <ki-menu-item value="activity">Activity</ki-menu-item>
          <ki-divider></ki-divider>
          <ki-menu-group label="Density">
            <ki-menu-item value="comfortable" type="radio" checked>Comfortable</ki-menu-item>
            <ki-menu-item value="compact" type="radio">Compact</ki-menu-item>
          </ki-menu-group>
        </ki-menu>
      </div>
    </div>
  `,
} satisfies VisualGallery;
