import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `
    <div style="display:flex;flex-wrap:wrap;align-items:start;gap:var(--ki-space-xl)">
      <section aria-label="Loading project" aria-busy="true"
        style="box-sizing:border-box;display:grid;gap:var(--ki-space-md);inline-size:18rem;
               max-inline-size:100%;padding:var(--ki-space-xl);background-color:var(--ki-surface-s0);
               border:var(--ki-border-hairline-base-em);border-radius:var(--ki-radius-component-lg)">
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);
                    align-items:center;gap:var(--ki-space-md)">
          <ki-skeleton shape="circle" size="2.5rem" animated="false"></ki-skeleton>
          <ki-skeleton lines="2" inline-size="60%" animated="false"></ki-skeleton>
        </div>
        <ki-skeleton shape="rect" block-size="6rem" animated="false"></ki-skeleton>
        <ki-skeleton lines="2" animated="false"></ki-skeleton>
      </section>
      <section aria-label="Assistant is writing" aria-busy="true"
        style="inline-size:16rem;max-inline-size:100%;padding-block:var(--ki-space-xl)">
        <ki-skeleton lines="3" animated="false"></ki-skeleton>
      </section>
    </div>
  `,
} satisfies VisualGallery;
