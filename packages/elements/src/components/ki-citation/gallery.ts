import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <p>The procedure<ki-citation ref="citation-gallery-method"></ki-citation>
      explains the sample<ki-citation ref="citation-gallery-sample"></ki-citation>.
      See the procedure<ki-citation ref="citation-gallery-method"></ki-citation> for the full sequence.</p>
    <ki-sources>
      <ki-source id="citation-gallery-sample" href="https://example.net/sample" title="Sample"></ki-source>
      <ki-source id="citation-gallery-method" href="https://example.org/method" title="Procedure"></ki-source>
    </ki-sources>`,
} satisfies VisualGallery;
