# APG Tabs Walkthrough

Feature: `014-ki-tabs`

Date: 2026-07-09

Pattern: WAI-ARIA APG Tabs, horizontal tablist with automatic activation.

## Keyboard

- Tab entry lands on the selected `ki-tab` host because the group stamps roving `tabindex="0"` only on the resolved selected tab.
- Shift+Tab exits to the previous focusable element through native order.
- Tab from the selected tab skips the rest of the strip and lands on the visible `ki-tab-panel` host, including panels with no focusable descendants.
- When every tab is disabled, every tab is stamped `tabindex="-1"` and every panel is hidden, so the strip contributes no tab stop.
- ArrowRight and ArrowLeft wrap, skip disabled and duplicate tabs, and automatically select the focused tab.
- In RTL, ArrowLeft moves to the next tab and ArrowRight moves to the previous tab.
- Home and End move to the first and last selectable tabs.

## Screen Reader Checkpoints

1. "tab, n of N, selected": the real accessibility snapshot exposes a named `tablist` containing the slotted `ki-tab` hosts as tabs, with the selected state on the selected host. If a browser/AT pair mis-announces position, the contingency is group-managed `aria-posinset` and `aria-setsize` on tab hosts, introduced only with a failing browser test first.
2. Panel announcement: the visible `ki-tab-panel` is exposed as a `tabpanel` named after its owning tab through `aria-labelledby`.
3. Automatic activation announcements: arrow navigation changes focus and selection through one path, avoiding duplicate events or a focus-only intermediate state.

## Automated Evidence

- `packages/elements/browser-tests/ki-tabs.browser.spec.ts` covers S4-S8, S13-S16, and S18 with real keyboard events and Playwright `ariaSnapshot`.
- `packages/elements/browser-tests/ki-tabs.dark.browser.spec.ts` covers S10 in the dark browser instance.
- `axe.run(main)` is asserted after initial and changed selection states.
