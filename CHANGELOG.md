# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The changelog is
maintained by hand — the repo deliberately does not use changesets (see
[`docs/releasing.md`](./docs/releasing.md)); nothing is published to npm yet.

## [Unreleased]

### Added

- `@kimen/tokens`: the MarsUI design DNA as new public `--ki-*` tokens — a
  six-step elevation shadow ramp, glass effect recipes with backdrop blur,
  3px scheme-aware focus rings, and a dedicated surface-size scale that gives
  dialogs, tooltips and listboxes real min/max dimensions instead of reusing
  the spacing scale.
- `@kimen/tokens`: the material3 theme is now a complete, faithful Material
  Design 3 baseline — tonal palettes, state layers, the full type scale,
  shape corner scale, elevation levels, and motion durations/easings — still
  opt-in via `data-ki-theme="material3"` plus `@kimen/tokens/css/material3`.
- Pixel-exact visual regression gate covering 60 deterministic
  component-state galleries (20 components × onmars light/dark + material3
  light) with vendored fonts and zero-mismatch tolerance. Ships disarmed
  (loud skips); it arms once the linux baselines are minted in CI and
  committed (see `packages/elements/browser-tests/README.md`).

### Changed

- `ki-button` restyled to MarsUI visual fidelity, variant by variant:
  primary hover now lightens over a glass shadow stack, secondary becomes
  neutral glass with backdrop blur, bevel borders and exact per-size heights
  (24/32/40/48/56px) render as designed; danger/success primary and disabled
  colors deliberately diverge from the design source to preserve WCAG
  contrast.
- All components adopt the MarsUI language: the double focus ring (3px glow
  under the opaque WCAG indicator) lands on every form control and tab,
  card/dialog/select-listbox/tooltip move onto the shared elevation ramp,
  and dialog widths now come from the new surface-size tokens.
- Token public API grows additively (no removals) with declared,
  digest-bound effective-value changes; consumers who pinned exact rendered
  values should re-check against the new baseline.
- Test and release infrastructure hardened: browser-test coverage is now
  measured, raw sleeps replaced by condition waits, and package/packaging
  contracts are validated inside release dry runs.
