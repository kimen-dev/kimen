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
import { userEvent } from 'vitest/browser';

/**
 * Upper bound on waiting for entry micro-motion, not an assertion: on expiry
 * the scan proceeds and reports whatever it sees.
 */
const ENTRY_MOTION_SETTLE_DEADLINE_MS = 4000;

/**
 * How long a running animation gets to resolve `finished` before it is
 * declared stalled and jumped to its end state. Entry micro-motion is
 * 150–600ms by token; anything still running after this grace is not
 * animating, it is stuck (issue #105).
 */
const STALLED_ANIMATION_GRACE_MS = 750;

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Every animation running anywhere under document.body, shadow trees
 * included. Not document.getAnimations(): measured in this Chromium, it
 * returns nothing for an animation whose target lives in a shadow root —
 * only an element inside the shadow tree sees its own animations.
 */
function treeAnimations(): Animation[] {
  const found = new Set<Animation>();
  const collect = (element: Element): void => {
    for (const animation of element.getAnimations({ subtree: true })) {
      found.add(animation);
    }
  };
  collect(document.body);
  const walk = (node: ParentNode): void => {
    for (const element of node.querySelectorAll('*')) {
      const shadow = element.shadowRoot;
      if (shadow !== null) {
        for (const child of shadow.children) {
          collect(child);
        }
        walk(shadow);
      }
    }
  };
  walk(document.body);
  return [...found];
}

/**
 * Let entry micro-motion finish before axe reads pixels.
 *
 * The fidelity pass gave components decorative entrance animations (Art. V)
 * that fade in from opacity 0. axe multiplies that transient opacity into
 * both foreground and background, so a scan taken mid-flight reports colour
 * pairs no resting user ever sees (e.g. high-em #0a0c11 blended to #c8c8c9)
 * and fails contrast on them. The resting state is the design fact under
 * test. Indeterminate loops (ki-progress) never finish and are left out.
 */
export async function settleEntryMotion(): Promise<void> {
  const deadline = Date.now() + ENTRY_MOTION_SETTLE_DEADLINE_MS;
  // A calm streak of two checks two frames apart: an entrance triggered by a
  // late render pass can START after a first clean check, and a scan taken
  // then sees a tree fading in from opacity 0 (axe reports the blended
  // colours — e.g. "equalRatio", fg identical to bg — for a frame no
  // resting user ever sees).
  let calm = false;
  for (;;) {
    const running = treeAnimations().filter(
      (animation) =>
        animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity,
    );
    if (Date.now() >= deadline) {
      return;
    }
    if (running.length === 0) {
      if (calm) {
        return;
      }
      calm = true;
      await nextFrame();
      await nextFrame();
      continue;
    }
    calm = false;
    // `finished` can stall forever when an animation sticks in `running`
    // (observed on loaded CI runners with the dialog's backdrop /
    // focus-shadow transitions — issue #105). Waiting out the deadline both
    // burns the test budget and still scans mid-flight, so past the grace a
    // stalled animation is jumped to its end state: the resting state is the
    // design fact under test either way. `cancel()` is the fallback for the
    // cases `finish()` rejects (playbackRate 0, infinite effect end) — for
    // an entry transition the underlying style IS the resting state.
    await Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(STALLED_ANIMATION_GRACE_MS, Math.max(0, deadline - Date.now())),
        ),
      ),
    ]);
    for (const animation of running) {
      if (animation.playState === 'running') {
        try {
          animation.finish();
        } catch {
          animation.cancel();
        }
      }
    }
    await nextFrame();
  }
}

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
 * Rest the pointer on a transient corner probe (the ki-card hover-test
 * pattern). The pointer position persists across spec files, and the
 * fidelity pass gave components real hover paint — a pointer that happens to
 * rest where a fixture mounts holds it in its hover state, whose paint is
 * exactly what axe then refuses to reason about (the list-item ::after wash
 * reports as "pseudoContent"). An axe scan is a rest-state claim unless the
 * caller says otherwise.
 */
export async function parkPointer(): Promise<void> {
  const park = document.createElement('div');
  park.style.cssText =
    'position:fixed;inset-block-end:0;inset-inline-end:0;inline-size:8px;block-size:8px;';
  document.body.append(park);
  // An open top layer (modal dialog, popover) covers the probe, and a hover
  // that can never become actionable is not "best-effort": Playwright retries
  // it for the whole action timeout, which tracks the test budget — measured
  // eating 119s of a 120s test while the axe scan itself took 45ms (issue
  // #105, the actual cause of the ki-dialog scan timeouts). The same top
  // layer keeps the content below out of reach of a stray resting pointer,
  // so when the probe is not the hit target there is nothing to park away
  // from — skip instead of paying the timeout for a hover that cannot land.
  const rect = park.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  if (hit === park) {
    await userEvent.hover(park).catch(() => undefined);
  }
  park.remove();
}

/**
 * Assert a context is free of axe violations AND free of undecidable findings
 * outside the triage table above.
 *
 * `keepPointer` is for the scans whose SUBJECT is held open by the hover
 * (ki-tooltip's shown-by-hover states): parking would dismiss the very state
 * under audit.
 */
export async function expectAccessible(
  context: Parameters<typeof axe.run>[0] = document.body,
  options: { keepPointer?: boolean } = {},
): Promise<void> {
  if (options.keepPointer !== true) {
    await parkPointer();
  }
  await settleEntryMotion();
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
