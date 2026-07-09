# Implementation Notes: ki-tooltip

## RED Runs

- T007 mock-doc RED: `pnpm --filter @kimen/elements run test` exits 1 because
  S1 expects the default trigger slot and tooltip bubble, while the scaffold
  still renders only the placeholder label span.
- T008 browser RED:
  `pnpm --filter @kimen/elements exec vitest run --config vitest.browser.config.ts browser-tests/ki-tooltip.browser.spec.ts`
  exits 1 because the built scaffold does not render the default trigger slot,
  so real pointer-path fixtures fail before hover.
- T009 browser RED: the same focused run exits 1 after adding S5/S13 because
  the built scaffold still has no default trigger slot, so Escape and
  blank-label browser paths cannot interact with a rendered trigger.
- T013 browser RED: the focused tooltip browser run exits 1 on S6 because
  after real Tab moves focus to the next button, the tooltip remains visible.
- T014 browser RED: S7/S8 accessibility assertions were added and pass in the
  focused run; the run remains red on the existing S6 focus-leave gap.

## T021 APG Tooltip Walkthrough

Source read during implementation: WAI-ARIA Authoring Practices Guide,
Tooltip Pattern, https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/.

- Hover/focus parity: automated S1/S4 verify reveal from real pointer hover
  and real Tab focus; S4 pins a non-zero show delay and confirms focus ignores
  it.
- WCAG 1.4.13 dismissible/hoverable/persistent: S2 covers pointer leave, S12
  covers pointer transfer onto the tooltip, and S5/S15/S16 cover Escape.
- Escape behavior: document capture consumes Escape with
  `preventDefault()`/`stopPropagation()` while visible; S5 verifies focus stays
  on the trigger and activation count remains zero; S15 verifies focus stays on
  another focused element; S16 verifies a native dialog stays open on the first
  Escape and closes on the second.
- Focus/tab order: mock-doc S8 verifies no `tabindex` in the shadow tree; the
  rendered tooltip contains only text and never receives focus.
- Role/name/description: S7 verifies the trigger remains queryable as a
  button named "Send", carries `aria-description="Send immediately"`, and the
  provider accepts the described button role query; S8 verifies the visible
  tooltip role and hidden non-visible state. Manual AT verification still
  required before PR approval: NVDA and VoiceOver should announce unchanged
  trigger name followed by tooltip text as description.
- Cross-shadow contingency: a composite trigger such as `ki-button` must be
  spot-checked manually. If a target browser/AT pair drops a host
  `aria-description`, the recorded remedy is a one-line forward from the
  composite host to its internal native control.
- Touch note: v1 has no touch gesture; tooltip content remains non-essential
  and this feeds the spec's gate-1 open question for future long-press.
- RTL: automated S11 verifies `placement="start"` renders on the right side
  under `dir="rtl"`; Storybook `RTL` remains the manual visual spot-check.
