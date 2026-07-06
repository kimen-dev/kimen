# Tasks: Tokens and theming — onmars default, material3 reference theme

<!-- KIMEN OVERRIDE of tasks-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, III, X.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Input**: Design documents from `/specs/001-tokens-theming/`

**Prerequisites**: plan.md, spec.md + feature.feature (S1-S7, approved), research.md (D1-D7), data-model.md, contracts/theming-contract.md

**Tests**: MANDATORY, never optional (Art. II/III). Tests first, verified
failing for the right reason. Traceability: the browser spec files carry the
file-level marker `// @spec:001-tokens-theming`; every S1-S7 appears in at
least one test (`scripts/gates/check-traceability.sh`).

**Context note**: the onmars groundwork (sources + light/dark build of
`tokens.css`) is already committed on this branch. US1/US2 tests are
characterization of that groundwork: each RED task verifies the test *can*
fail (run before wiring the stylesheet into the harness page — it must fail
on unresolved custom properties) before turning it green. US3 (material3) is
strict RED: nothing of it exists yet.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (default onmars), US2 (dark/scheme), US3 (material3)

## Phase 1: Setup

- [x] T001 Add the dark-scheme browser project to `packages/elements/vitest.browser.config.ts`: a second Playwright instance/project with `context: { colorScheme: 'dark' }` that includes only `browser-tests/**/*.dark.browser.spec.ts`; the light instances exclude that pattern. Both run under the existing `test-browser` script.
- [x] T002 [P] Add `size-limit` block and `size` script to `packages/tokens/package.json` with the entry `dist/css/tokens.css` ≤ 9 KB (gzip). (The material3 entry is added in T017 when the file exists.) Verify `pnpm exec nx run-many -t size` picks it up.

**Checkpoint**: harness can express light and dark contexts; budget gate wired for the default stylesheet.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the contrast gate validates every story's output (US1/US2 now, US3 later).

- [x] T003 RED: unit tests for the contrast checker in `packages/tokens/scripts/check-contrast.test.mjs` (runner: `node --test`, zero new deps): relative-luminance and ratio math against WCAG reference values (e.g. #000/#fff = 21, #767676/#fff ≥ 4.5), alpha-over-surface compositing, and the pair table from data-model.md (rule 3). Verify failing (script absent).
- [x] T004 GREEN: implement `packages/tokens/scripts/check-contrast.mjs`: parse the compiled stylesheets, resolve the declared pairs per theme × scheme, exit non-zero below 4.5:1. Add `contrast` + `test` scripts to `packages/tokens/package.json`.
- [x] T005 Register the contrast gate in `scripts/gates/gates-suite.sh` (deterministic, after build).

**Checkpoint**: `pnpm --filter @kimen/tokens contrast` exits 0 for onmars light+dark.

## Phase 3: User Story 1 - Default onmars appearance with zero configuration (Priority: P1) 🎯 MVP

**Goal**: loading `@kimen/tokens/css` alone yields the onmars light palette.

**Independent Test**: blank document + stylesheet → read resolved `--ki-*` values.

### RED: failing tests first (MANDATORY, Art. III)

- [x] T006 [US1] Create `packages/elements/browser-tests/tokens-theming.browser.spec.ts` with marker `// @spec:001-tokens-theming` and a helper that injects the compiled CSS (imported as raw text from `@kimen/tokens` dist) into the test document. Tests for **S1**: `--ki-color-brand-500` resolves `#845abe` and `--ki-surface-s0` resolves `#ffffff` (via getComputedStyle on a probe element), plus the US1 acceptance 2 assertion (every name in the published contract resolves non-empty). Verify each fails before the injection helper is wired (unresolved custom properties). Note: getComputedStyle returns normalized `rgb()`/`rgba()` strings — the helper must normalize expected hex anchors before comparing.

### GREEN: implementation

- [x] T007 [US1] Wire the stylesheet injection (and nothing else) until S1 is green. No changes to token sources expected; any discrepancy found is fixed in `packages/tokens/tokens/*` sources, never in dist (Art. I).

### Quality gates (per story)

- [x] T008 [US1] Contrast gate green for onmars light (T004 pairs). axe/APG/CEM/mutation: N/A — no markup, no interaction, no component API, no changed core logic (justification per template).

**Checkpoint**: S1 green in Chromium; contract completeness asserted.

## Phase 4: User Story 2 - Dark appearance that respects the user (Priority: P2)

**Goal**: dark follows `prefers-color-scheme`; document-level override wins both ways.

**Independent Test**: same document under light/dark emulated contexts ± override attribute.

### RED: failing tests first

- [x] T009 [P] [US2] Create `packages/elements/browser-tests/tokens-theming.dark.browser.spec.ts` (marker `// @spec:001-tokens-theming`, runs in the dark project from T001). Tests: **S2** (no attributes → `--ki-surface-s0` resolves `#0a0a0a`) and **S4** (`data-ki-color-scheme='light'` on root → `#ffffff`). Verify failing (before stylesheet injection wiring in this file).
- [x] T010 [P] [US2] In the light spec file: **S3** (`data-ki-color-scheme='dark'` on root → `#0a0a0a`). Verify failing first.

### GREEN: implementation

- [x] T011 [US2] Wire injection in the dark spec; S2-S4 green. Expected green from committed groundwork; discrepancies fix token sources/build only.

### Quality gates (per story)

- [x] T012 [US2] Contrast gate green for onmars dark (already covered by T004 run; confirm pairs table includes dark). Other component gates N/A (as T008).

**Checkpoint**: S1-S4 green across light and dark projects.

## Phase 5: User Story 3 - Re-theming in one step, proven by material3 (Priority: P3)

**Goal**: `data-ki-theme='material3'` + its stylesheet restyles the document; contract name-identical; unknown themes inert.

**Independent Test**: activate material3 → brand resolves M3 primary; compare name sets of both compiled stylesheets.

### RED: failing tests first

- [x] T013 [P] [US3] Light spec file: **S5** (root `data-ki-theme='material3'` + material3 stylesheet injected → `--ki-color-brand-500` resolves `#6750a4`), **S6** (import both compiled stylesheets as raw text, extract `--ki-*` names per scheme — selector-agnostic: classify blocks as light/dark by media query and `data-ki-color-scheme` presence, never by literal selector text, since material3 uses different selectors than onmars — assert exact set equality per scheme), **S7** (root `data-ki-theme='acme'`, only default stylesheet → `#845abe`). Verify S5/S6 fail for the right reason: `dist/css/tokens.material3.css` does not exist yet (S7 may pass immediately — it asserts the fallback that already ships; verify it can fail by asserting against a bogus expected value first).

### GREEN: implementation

- [x] T014 [US3] Create `packages/tokens/tokens/themes/material3.tokens.json`: brand ramp from the M3 baseline primary tonal palette (500 = #6750a4), alpha steps from the M3 state-layer opacities (8/10/16%), em aliases from On Surface roles, Roboto family stacks, M3 typescale mapped per research.md D3 (tracking → em).
- [x] T015 [US3] Create `packages/tokens/tokens/semantic/material3.tokens.json` (role mapping per research.md D2: Surface Container ramp → s0-s5, On Surface → text, Outline → outline, Error → danger, Scrim/state layers → overlay) and `packages/tokens/tokens/modes/material3.dark.tokens.json` (Dark column of the same mapping).
- [x] T016 [US3] Extend `style-dictionary.config.mjs` + `build.mjs`: material3 pipeline (include onmars layers, source material3 overrides, filter to overridden+theme tokens is NOT enough — S6 requires the full contract, so material3 output emits ALL tokens) with selectors `:root[data-ki-theme='material3']` (light) and the dark media/attribute blocks per research.md D1 → `dist/css/tokens.material3.css`. Add the `./css/material3` export to `packages/tokens/package.json`. S5-S7 green.
- [x] T017 [US3] Add the size-limit entry for `dist/css/tokens.material3.css` ≤ 9 KB gzip.

### Quality gates (per story)

- [x] T018 [US3] Contrast gate green for material3 light + dark (pairs per data-model.md rule 3). Budget gate green for both stylesheets. Packaging gate (publint/attw) green with the new export.

**Checkpoint**: S1-S7 green; contract equality enforced; material3 within budget.

## Phase 6: Polish & Cross-Cutting

- [x] T019 [P] Write `packages/tokens/README.md`: when-to-use/when-NOT-to-use for agents (Art. I), the two document attributes, theme-authoring guide (reassign theme+semantic only), link to contracts/theming-contract.md.
- [x] T020 [P] Run `bash scripts/gates/check-traceability.sh` — every S1-S7 maps to a test in the marked files.
- [x] T021 Full suite: `bash scripts/gates/gates-suite.sh` exits 0 (the ONLY definition of done, Art. III).

## Dependencies & Execution Order

- Setup (T001-T002) → Foundational (T003-T005) → US1 (T006-T008) → US2 (T009-T012) → US3 (T013-T018) → Polish (T019-T021).
- US2 depends on T001 (dark project). US3 depends on US1's injection helper (T006/T007) and on T004 (contrast) + T002 (size wiring) for its gates.
- Within each story: RED (verified failing) → GREEN → gates. NON-NEGOTIABLE (Art. III).
- Single writer per feature; this file is the loop's task anchor (onmars-spec C1).

## Parallel Execution Examples

- T002 ∥ T001 (different packages).
- T009 ∥ T010 (different spec files) after T001+T006.
- T014 ∥ T015 (different source files) after T013.
- T019 ∥ T020 during Polish.

## Implementation Strategy

MVP = US1 (S1 green proves the default contract). US2 rides the committed
groundwork (characterization + fixes if the tests expose gaps). US3 is the
real construction work and the Fase 1 exit criterion: strict RED first, then
sources → build → gates. Commit after each task or logical group with
conventional commits; never edit `dist/` by hand (Art. I).
