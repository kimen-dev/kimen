import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `
    <div style="display:flex; flex-wrap:wrap; gap:var(--ki-space-md);">
      <ki-button id="gallery-filters" variant="secondary" type="button">Filters</ki-button>
      <ki-button id="gallery-retention" variant="ghost" type="button">About retention</ki-button>
    </div>
    <ki-popover for="gallery-filters" label="Incident filters">
      <div style="display:grid; gap:var(--ki-space-md);">
        <strong>Incident filters</strong>
        <ki-checkbox checked>Open incidents</ki-checkbox>
        <ki-checkbox>Assigned to me</ki-checkbox>
        <div style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:var(--ki-space-md);">
          <ki-button size="sm" type="button">Clear</ki-button>
          <ki-button size="sm" variant="primary" type="button">Apply</ki-button>
        </div>
      </div>
    </ki-popover>
    <ki-popover for="gallery-retention" kind="toggletip">
      Logs are kept for 30 days. Exports are retained separately.
    </ki-popover>
  `,
  width: 420,
  minHeight: 275,
  prepare: async (wrapper) => {
    const filters = wrapper.querySelector<HTMLElement & { open: boolean }>(
      'ki-popover[for="gallery-filters"]',
    );
    if (filters) {
      filters.open = true;
    }
    await settleFrames(2);
  },
} satisfies VisualGallery;
