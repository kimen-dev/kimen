// Shared axe assertion.
//
// Every browser spec used to assert `results.violations` and drop
// `results.incomplete` on the floor. `incomplete` is not "passed" — it is
// "axe could not decide", and for a shadow-DOM component library that is
// exactly where the interesting cases land: text over a gradient, a trigger
// overlapped by its own popup, a colour axe cannot resolve to a pixel.
//
// Dropping it silently means the accessibility gate reports green on the
// findings it understands least. This helper asserts BOTH, and allows an
// incomplete finding through only when axe is structurally unable to decide
// AND something else in this repository measures the same pixels.
import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Reasons axe reports as undecidable, each paired with the instrument that
 * does decide. An entry here is a promise, not a shrug: if the named
 * instrument stops covering the case, the entry is a lie and must go.
 *
 * Keyed by `${ruleId}/${messageKey}` — the message key is axe's own name for
 * WHY it gave up, so a rule that starts failing for a different reason is not
 * silently covered by an allowance written for another one.
 */
const UNDECIDABLE: Readonly<Record<string, string>> = {
  'color-contrast/bgGradient':
    'ki-button hover states only. axe gives up on any `background-image: linear-gradient(...)`, but this gradient is DEGENERATE — ki-button.css builds it as linear-gradient(var(--_ki-button-overlay), var(--_ki-button-overlay)), two stops of one custom property, i.e. a flat hover wash over a solid background-color. There is no gradation to sample. What IS measured: check-contrast.mjs holds every `-hover-fg` against its `-hover-bg` at 4.5:1. What is NOT, and this allowance exists to say so out loud: nobody composites the wash on top. The token carrying it is keyed per variant+state (--ki-button-secondary-hover-overlay) while the fill is keyed per variant+tone+state, so no sibling lookup reaches it. A one-off derivation was run over all four theme x scheme combos and found FOUR cells that fall under AA once the wash is composited: --ki-button-secondary-danger-hover and its icon-button twin at 4.80 -> 4.49 (onmars light, 3% black wash), and --ki-button-secondary-success-hover plus twin at 5.36 -> 4.49 (material3 dark, 8% #e6e0e9 wash). It is NOT wired in, because every lever that fixes it is founder-gated: the hover label is the shared semantic role ki.text.<tone>-high-em, and the audit already holds an open decision to move tone text from 700 to 600 — which measures 3.49 on the same washed tint, worse. See the audit tone-ramp decision.',
  'color-contrast/bgOverlap':
    'ki-tooltip triggers only. axe refuses when another element overlaps the text; here it is the tooltip bubble, which sits at visibility: hidden over its own trigger in the rest state and therefore paints nothing at all. The trigger is a plain <button> on the page surface, and bare-page.browser.spec.ts measures exactly that pair by reading computed colour and compositing up the flat tree rather than inferring from geometry.',
};

interface IncompleteDetail {
  key: string;
  target: string;
  allowed: boolean;
}

function detailsOf(results: axe.AxeResults): IncompleteDetail[] {
  return results.incomplete.flatMap((finding) =>
    finding.nodes.flatMap((node) =>
      [...node.any, ...node.all, ...node.none].map((check) => {
        const messageKey =
          typeof check.data === 'object' && check.data !== null && 'messageKey' in check.data
            ? String((check.data as { messageKey?: unknown }).messageKey)
            : 'unspecified';
        const key = `${finding.id}/${messageKey}`;
        return { key, target: String(node.target), allowed: key in UNDECIDABLE };
      }),
    ),
  );
}

/**
 * Assert a context is free of axe violations AND free of undecidable findings
 * outside the triage table above.
 */
export async function expectAccessible(
  context: Parameters<typeof axe.run>[0] = document.body,
): Promise<void> {
  const results = await axe.run(context);
  expect(results.violations).toEqual([]);

  const untriaged = detailsOf(results).filter((detail) => !detail.allowed);
  expect(
    untriaged,
    `axe could not decide, and nothing in UNDECIDABLE covers it: ${untriaged
      .map((detail) => `${detail.key} on ${detail.target}`)
      .join('; ')}`,
  ).toEqual([]);
}
