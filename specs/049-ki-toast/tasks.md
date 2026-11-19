# Tasks: ki-toast and ki-toaster

RED → GREEN → quality, as built.

1. [x] Contract: `feature.feature` and `spec.md`, lint-feature, spec-contracts and scenario-families green.
2. [x] RED: node specs for `effectiveDuration`, `liveRoleForTone`, `normalizeMax` and `queuedFlags` fail.
3. [x] GREEN: the two helper modules.
4. [x] RED: `ki-toast.browser.spec.ts` (23 of 35 fail against the earlier build) and `ki-toaster.browser.spec.ts` (cannot load its element).
5. [x] GREEN: `ki-toast` (timer, pauses, dismiss, action, Escape, focus hand-off, built-in tone icons) and `ki-toaster` (top layer, placement, newest-first queue, group, `show()`, F6).
6. [x] Tokens: `toast`, `toast.material3`, `toaster`; primitive `ki.size.toast`.
7. [x] Transversal suites, galleries and visual specs; stories, usage examples, docs pages (Storybook and site).
8. [x] Regenerate manifests, llms, catalog and wrappers; React wrappers type events from `@kimen/elements/components`.
9. [x] `changes/api/049-ki-toast.json`, sealed token and component counts.
10. [x] Budgets: the onmars tokens stylesheet fits #316's 12.4 kB (the founder had approved 12 kB); MCP Apps document and MCP server binary re-based to about 5% above their new measurements.
11. [x] `scripts/gates/gates-suite.sh`: core green; Chromium green apart from local macOS references made stale by #344.
12. [x] Linux visual baselines (`visual-baselines` run 44605942374, founder go-ahead).
13. [ ] Manual VoiceOver walkthrough.
