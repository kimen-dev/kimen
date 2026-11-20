import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <p>We compared the study design<ki-citation ref="gallery-methods"></ki-citation>
      with the results<ki-citation ref="gallery-findings"></ki-citation>.
      The design<ki-citation ref="gallery-methods"></ki-citation> explains the difference.</p>
    <ki-sources open>
      <ki-source id="gallery-findings" href="https://example.net/findings" title="Findings" snippet="Observations from the study."></ki-source>
      <ki-source id="gallery-methods" href="https://example.org/methods" title="Study design" snippet="How the study ran."></ki-source>
    </ki-sources>
    <p>Read the appendix<ki-citation ref="gallery-appendix"></ki-citation> for context.</p>
    <ki-sources>
      <ki-source id="gallery-appendix" href="https://example.org/appendix" title="Appendix"></ki-source>
    </ki-sources>
    <section dir="rtl" aria-label="Right-to-left example">
      <p>Reference<ki-citation ref="gallery-rtl"></ki-citation></p>
      <ki-sources open>
        <ki-source id="gallery-rtl" href="https://example.org/notes" title="Study notes"></ki-source>
      </ki-sources>
    </section>`,
} satisfies VisualGallery;
