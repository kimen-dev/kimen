import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 390,
  minHeight: 270,
  html: `
    <ki-search mode="docked" label="Search components" value="dia" open>
      <ki-search-suggestion value="ki-dialog" description="Component">ki-dialog</ki-search-suggestion>
      <ki-search-suggestion recent>button tokens</ki-search-suggestion>
    </ki-search>
  `,
  prepare: () => settleFrames(3),
} satisfies VisualGallery;
