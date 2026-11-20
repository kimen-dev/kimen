import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 390,
  minHeight: 390,
  html: `
    <div style="display:grid; gap:var(--ki-layout-spacing-lg)">
      <ki-search label="Search Kimen" placeholder="Search Kimen" mode="docked"></ki-search>
      <ki-search label="Search components" mode="docked" value="dia" open>
        <ki-search-suggestion value="ki-dialog" description="Component">ki-dialog</ki-search-suggestion>
        <ki-search-suggestion value="modal-dialogs" description="Guide">Modal dialogs</ki-search-suggestion>
        <ki-search-suggestion recent>button tokens</ki-search-suggestion>
        <p slot="results">Dialog accessibility guide</p>
      </ki-search>
    </div>
  `,
  prepare: () => settleFrames(3),
} satisfies VisualGallery;
