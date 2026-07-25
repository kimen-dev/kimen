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
    'ki-button hover states only. axe gives up on any `background-image: linear-gradient(...)`, but this gradient is DEGENERATE — ki-button.css builds it as linear-gradient(var(--_ki-button-overlay), var(--_ki-button-overlay)), two stops of one custom property, i.e. a flat hover wash over a solid background-color. There is no gradation to sample. What IS measured: check-contrast.mjs holds every `-hover-fg` against its `-hover-bg` at 4.5:1, worst 5.02 (primary/neutral). What is NOT: neither instrument composites the wash on top, because the token that carries it (--ki-button-primary-hover-overlay) is keyed per variant+state while the fill is keyed per variant+tone+state, so no sibling lookup finds it. Measured by hand at the time of writing: white 5% in light, black 5% in dark, worst case 5.02 -> 4.57, still over the bar but with 0.07 of margin. That margin is the reason this entry names the gap instead of claiming coverage.',
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
