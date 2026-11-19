import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const scrollerLines = Array.from(
  { length: 8 },
  (_, index) => `<p style="margin:0;">Release note line ${String(index + 1)}</p>`,
).join('');

export default {
  // What this gallery guards is the CLIPPING geometry: exact cut lines at
  // the bounds on each declared axis plus the quiet fitting state. The
  // indicator itself cannot appear here — headless Chromium runs overlay
  // scrollbars, which occupy no layout and paint only during interaction
  // (verified empirically: even ::-webkit-scrollbar with opaque test
  // colors paints nothing at rest) — so the token-resolved rail is
  // guarded by the functional suite's computed-style assertions instead.
  html: [
    // Vertical overflow clipped at 120px, scroll position 0.
    `<ki-scroller label="Release notes" style="block-size:120px;inline-size:280px;">${scrollerLines}</ki-scroller>`,
    // Horizontal overflow: one non-wrapping run clips at the inline edge.
    '<ki-scroller orientation="horizontal" label="Tags" style="inline-size:280px;">' +
      '<div style="white-space:nowrap;">alpha beta gamma delta epsilon zeta eta theta iota kappa lambda</div>' +
      '</ki-scroller>',
    // No overflow: the quiet state stays indistinguishable from a div.
    '<ki-scroller label="Short list" style="block-size:96px;inline-size:280px;"><p style="margin:0;">Fits entirely.</p></ki-scroller>',
  ].join(''),
} satisfies VisualGallery;
