# Browser tests

Real-browser component suites (Vitest browser mode, Playwright provider).
Functional specs follow the conventions described in
`.agents/skills/frontend-qa/SKILL.md`. This README documents the
visual-regression layer.

## Visual regression (`*.visual[.dark].browser.spec.ts`)

One deterministic "state gallery" PNG per component x theme, captured with
`expect(...).toMatchScreenshot()` inside the ordinary Chromium gate
(`scripts/gates/gates-browser.sh chromium`, part of `gates-suite.sh`):

- Matrix: 20 components x (onmars light + onmars dark) + material3 light
  = 60 captures. Hover and animated states are out of v1.
- Shared harness: `visual/harness.ts` (tokens injection, vendored font
  fixtures + `document.fonts.ready`, reduced-motion emulation, gallery
  mounting). Galleries live in `visual/galleries.ts`. Two fonts are
  vendored under `visual/fonts/` so text metrics never depend on the
  runner image: Inter (onmars body font, SIL OFL 1.1) and Roboto
  (material3 body font, Apache-2.0); licenses and SHA-256 pins are in
  the repository `NOTICE`.
- Tolerance: strict comparator defaults — 0 mismatched pixels, per-pixel
  threshold 0.1, antialiasing ignored. The 0.1 threshold means a very fine
  color shift (grey delta under ~26/255) does NOT trip this gate; the
  token/API gates own that class of regression. If CI ever shows residual
  non-determinism, the answer is a per-capture documented
  `allowedMismatchedPixelRatio`, never a global loosening (Art. X).
- Diagnostics: a mismatch fails in seconds with the comparator verdict
  ("N pixels (ratio X) differ.") plus the reference/actual/diff PNG paths
  (actual and diff land in the gitignored `.vitest-attachments/`). The
  harness deliberately uses one-shot `expect(...)` — `expect.element(...)`
  would retry the failing matcher until the test timeout and bury that
  message under "Test timed out".

## Arming the gate: explicit two-step bootstrap

`visual/ARMED` is a versioned one-word marker (`false` or `true`) that
breaks the bootstrap deadlock between "the PR gate needs committed linux
baselines" and "the baselines workflow only runs on an already-merged
branch":

- **`ARMED = false` (disarmed)**: a capture whose platform baseline PNG is
  missing is **skipped** with a loud
  `visual gate DISARMED — bootstrap pending, see README` notice, and the
  suite exits 0. Captures whose baseline exists still compare normally.
  Explicit update runs (`--update=all`) are never skipped — that is how
  baselines get created.
- **`ARMED = true` (armed)**: current strict semantics — a missing baseline
  in CI is RED, and `scripts/tests/visual-gate.test.mjs` fails `test:infra`
  if the committed linux baselines ever go missing while armed (silent
  disarming by deleting PNGs is detected).

Bootstrap flow (one founder pass):

1. Merge the harness with `ARMED = false`. The PR gate stays green: visual
   specs skip noisily on CI because no linux baseline exists yet.
2. The founder dispatches the `visual-baselines` workflow on `main`
   (Actions -> visual-baselines -> "Run workflow"). It regenerates every
   linux PNG with `vitest run --update=all` and uploads
   `__screenshots__/` as the `visual-baselines-linux` artifact.
3. In ONE follow-up PR: commit the reviewed linux PNGs **and flip
   `visual/ARMED` to `true`**. From that merge on, the gate is armed.

## Baselines: linux-only, CI-generated

Screenshot file names embed the platform
(`<name>-chromium-linux.png` / `-chromium-darwin.png`), so:

- **Versioned arbiters**: only the `*-chromium-linux.png` files under
  `__screenshots__/` are committed. They are generated exclusively on CI
  (ubuntu-latest, the pinned Playwright Chromium) — never locally.
- **Local darwin baselines**: gitignored, a personal safety net. Create or
  refresh them with an explicit update run (see below); once the gate is
  armed, a plain local run also auto-creates missing darwin baselines
  (Vitest creates missing baselines outside CI). A green local run can
  still be red in CI in edge cases: the official verdict is always the
  linux run.
- **In CI (armed) a missing baseline fails the test** and deposits the
  candidate reference in the attachments directory — that is the intended
  gate semantics for brand-new captures.

## Updating baselines when a visual change is intentional

Baseline updates are a founder decision, never automatic:

1. Push the branch with the intentional visual change.
2. Run the `visual-baselines` workflow (Actions -> visual-baselines ->
   "Run workflow" on that branch). It regenerates the linux PNGs with
   `vitest run --update=all` and uploads `__screenshots__/` as the
   `visual-baselines-linux` artifact.
3. Download the artifact, review every changed PNG against the intent of
   the change, and commit the reviewed files into the branch.
4. If a gallery was renamed or removed, delete its stale PNG in the same
   commit (regeneration never deletes).

To re-baseline locally (darwin safety net only):

```sh
bash scripts/gates/cache-env.sh -- \
  pnpm --filter @kimen/elements exec vitest run \
  --config vitest.browser.config.ts --update=all .visual.
```

Note the `=`: vitest declares `--update [type]`, so a bare
`--update .visual.` would swallow the file filter as the update type.

## Residual gaming risk (honest limits)

The linux baselines are ordinary committed PNGs: nothing in the toolchain
can prove a `*-chromium-linux.png` was produced by the CI workflow rather
than generated elsewhere (e.g. a linux container) and committed by hand. A
malicious or careless PR could therefore "re-baseline" a visual regression
without ever dispatching `visual-baselines`. Mitigations, not proofs:

- Founder review of any PR touching `__screenshots__/` is the actual
  arbiter (repo law: founder intent is a human judgment, never a hash).
- `scripts/tests/visual-gate.test.mjs` detects the cruder attack of
  disarming by deletion: while `ARMED = true`, every visual spec must have
  its full set of committed linux baselines.

## Running locally

```sh
# Full browser gate (functional + visual):
bash scripts/gates/gates-browser.sh chromium

# Visual specs only:
bash scripts/gates/cache-env.sh -- \
  pnpm --filter @kimen/elements exec vitest run \
  --config vitest.browser.config.ts .visual.
```
