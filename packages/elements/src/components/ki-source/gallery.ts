import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <ki-sources open>
      <ki-source id="source-gallery-review" href="https://example.org/review" title="Independent review"
        snippet="The review compares the evidence and explains where the studies disagree."></ki-source>
      <ki-source id="source-gallery-index" href="https://example.net/index" title="Study index"></ki-source>
    </ki-sources>`,
} satisfies VisualGallery;
