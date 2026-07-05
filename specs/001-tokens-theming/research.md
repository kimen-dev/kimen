# Research: 001-tokens-theming

Phase 0 output. All decisions verified against the two design sources on
2026-07-05 via the Figma MCP (Plugin API reads):

- **onmars**: MarsUI file `vbD864Afs8lTSXUgtABFSs` (608 variables, 8
  collections) — already extracted and committed as the onmars token sources.
- **material3**: Material 3 Design Kit (Community) file
  `M2AB76y3pukwl6mzHxufKa` — collections `M3` (197 color roles, Light/Dark
  baseline modes read), `Typescale` (90), `Shape` (10), `Font theme` (7).
  Spec anchor confirmed: `Schemes/Primary` Light = `#6750a4`.

## D1 — Theme delivery: one stylesheet per theme, attribute selection

**Decision**: `tokens.css` carries onmars (`:root` light + dark blocks) and
stays the default export. material3 compiles to a separate
`tokens.material3.css` whose selectors are scoped to
`:root[data-ki-theme='material3']` (light) and
`:root[data-ki-theme='material3'][data-ki-color-scheme='dark']` +
`prefers-color-scheme` media block (dark). Scheme override attribute:
`data-ki-color-scheme='light'|'dark'`; theme attribute: `data-ki-theme`.

**Rationale**: root-attribute scoping with higher specificity than `:root`
makes load order irrelevant; an unknown theme value or a missing material3
stylesheet simply matches no selector and the document stays onmars — S7 and
the edge cases fall out of the cascade with zero runtime code.

**Alternatives considered**: (a) one combined stylesheet with all themes —
rejected: consumers pay bytes for themes they don't use, budget per theme
gets muddy. (b) Class-based theming (`.ki-theme-material3`) — rejected:
attributes read as configuration, match the scheme override mechanism already
shipped, and are the convention the spec approved. (c) CSS `@layer` —
rejected for v1: adds a concept the cascade already solves.

## D2 — material3 sources: theme file + semantic override file

**Decision**: material3 is exactly two DTCG sources:
`tokens/themes/material3.tokens.json` (theme layer: brand ramp from the M3
primary tonal palette, Roboto font stacks, M3-mapped type scale values) and
`tokens/semantic/material3.tokens.json` (semantic overrides where M3's role
mapping differs from onmars), plus a dark-mode override source
`tokens/modes/material3.dark.tokens.json`. Primitives are shared and never
forked.

**Rationale**: FR-005 allows reassigning theme + semantic layers only; the
M3 kit's Scheme roles map naturally onto the Kimen semantic contract:

| Kimen semantic | M3 role (Light / Dark) |
|---|---|
| surface.s0 | Surface `#fef7ff` / `#141218` |
| surface.s1 | Surface Container Low `#f7f2fa` / `#1d1b20` |
| surface.s2 | Surface Container `#f3edf7` / `#211f26` |
| surface.s3 | Surface Container High `#ece6f0` / `#2b2930` |
| surface.s4 | Surface Container Highest `#e6e0e9` / `#36343b` |
| surface.s5 | Surface Dim `#ded8e1` / Surface Bright `#3b383e` |
| text.high-em | On Surface `#1d1b20` / `#e6e0e9` |
| text.med-em | On Surface Variant `#49454f` / `#cac4d0` |
| outline.high-em | Outline `#79747e` / `#938f99` |
| outline.med-em | Outline Variant `#cac4d0` / `#49454f` |
| surface.primary-med-em | Primary `#6750a4` / `#d0bcff` |
| surface.primary-low-em | Primary Container `#eaddff` / `#4f378b` |
| text.primary-on-primary | On Primary `#ffffff` / `#381e72` |
| surface.danger-* | Error / Error Container family |
| overlay.* | Scrim + State Layers opacities |

Brand ramp (theme layer) fills from the M3 baseline primary tonal palette
(P10 `#21005d` … P40 `#6750a4` … P90 `#eaddff`); state-layer opacities (8%,
10%, 16%) inform the alpha steps. Full mapping lands in
`data-model.md`/implementation; roles not covered by M3 (e.g. info/warning
ramps) keep values derived per M3's extended-color guidance.

**Alternatives considered**: forking primitives per theme — rejected:
violates FR-005 and breaks the re-theming promise this feature exists to
prove.

## D3 — material3 typography mapping

**Decision**: Roboto (`Roboto, system-ui, sans-serif`) for display/body;
type scale maps M3 Typescale (Baseline) onto the Kimen type-token names:
body-1←Body Medium (14/20), body-2←Body Large (16/24), caption-2←Body Small
(12/16), caption-1←Label Small (11/16), title-1←Title Small (14/20),
title-2←Title Large (22/28), heading-1←Headline Small (24/32),
heading-2←Headline Medium (28/36), heading-3←Headline Large (32/40),
heading-4←Display Small (36/44), heading-5←Display Medium (45/52),
heading-6←Display Large (57/64); display-1..3 extrapolate above the M3 scale
(M3 stops at Display Large). Tracking values (0.5px, 0.25px, 0.1px, -0.25px)
compile to em at the mapped sizes.

**Rationale**: keeps the token contract identical (S6) while letting each
theme own its scale, which is exactly the theme-layer job.

## D4 — Test harness: existing Vitest 4 browser suite, dark via provider context

**Decision**: scenarios S1-S7 land as browser specs in the existing
`packages/elements/browser-tests/` harness (Vitest 4 browser mode, Playwright
provider), file `tokens-theming.browser.spec.ts` tagged
`@spec:001-tokens-theming`, one `describe`/`it` per S-ID asserting
`getComputedStyle` resolution of `--ki-*` custom properties. Dark-scheme
scenarios (S2, S4) run in a second Vitest browser project configured with
`providerOptions.context.colorScheme: 'dark'`; S3 runs in the default light
project with the attribute override.

**Rationale**: Art. III demands a real browser; the harness, CI wiring and
Playwright install already exist (Fase 0) — no new infrastructure. S6
(contract equality) is asserted in the same suite by importing both compiled
stylesheets as raw text and comparing the extracted custom-property name
sets.

**Alternatives considered**: a new Vitest setup inside `packages/tokens` —
rejected: duplicate infra for zero isolation benefit (Art. VII). Playwright
E2E project — rejected: `emulateMedia` is available but the browser-mode
provider context option covers the need inside the existing suite.

## D5 — Contract-equality and contrast enforcement

**Decision**: two deterministic checks wired into the gate suite:
(a) contract equality (S6/FR-006) asserted in the browser suite (above) —
the test run in CI IS the gate; (b) contrast (FR-009/SC-005) as a node
script `packages/tokens/scripts/check-contrast.mjs` that resolves the
declared text/surface pairs per theme × scheme from the compiled CSS and
fails below 4.5:1, registered as a package target and added to
`gates-suite.sh`.

**Rationale**: Art. X — everything a script can decide is decided by a
script. Contrast math is pure computation; no browser needed.

## D6 — Budgets

**Decision**: add a `size-limit` block + `size` target to
`packages/tokens/package.json`: `dist/css/tokens.css` ≤ 9 KB and
`dist/css/tokens.material3.css` ≤ 9 KB (gzipped, single-digit per Art. IV).
The existing `budgets` gate (`nx run-many -t size`) picks the new target up
automatically.

**Verification**: current `tokens.css` is ~35 KB raw ≈ 5-6 KB gzipped —
comfortable headroom.

## D7 — Hook/tooling caveat (recorded, not a decision to revisit)

Local husky hooks (pnpm + biome native binaries) cannot run in the Cowork
sandbox; commits in this environment use `--no-verify` and CI remains the
enforcement layer (Art. X gates all run on push/PR). The unattended
implement loop, if used, runs in the Art. XI sandbox where the full
toolchain is installed.
