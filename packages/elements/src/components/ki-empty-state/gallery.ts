import '../../../icons/folder-plus.js';
import '../../../icons/search-x.js';

import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 380,
  html: `
    <div style="display:grid;gap:var(--ki-space-7xl)">
      <ki-empty-state heading="No projects yet" icon-name="folder-plus" tone="primary-light">
        Projects hold your surfaces, catalogs and themes.
        <ki-button slot="actions" variant="secondary">Browse templates</ki-button>
        <ki-button slot="actions" variant="primary">New project</ki-button>
      </ki-empty-state>
      <ki-empty-state heading="No results for webhok" icon-name="search-x" size="sm" announce dir="rtl">
        Check the spelling or remove a filter.
        <ki-button slot="actions" variant="secondary">Clear filters</ki-button>
      </ki-empty-state>
      <ki-empty-state heading="Your inbox is clear" heading-level="2">
        <svg slot="media" width="64" height="40" viewBox="0 0 64 40" aria-hidden="true">
          <rect width="64" height="40" rx="8" fill="var(--ki-surface-s2)" />
          <path d="M14 13h36v14H14z M14 13l18 10 18-10" fill="none" stroke="var(--ki-text-high-em)" />
        </svg>
      </ki-empty-state>
    </div>`,
  async prepare() {
    await settleFrames(3);
  },
} satisfies VisualGallery;
