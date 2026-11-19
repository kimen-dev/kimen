# FeatureIcon implementation plan

1. Lint the behavior contract and write browser coverage for S1–S12 and a catalog regression test for S13.
2. Scaffold a passive Stencil component with three reflected enum props, a default slot and a decorative tile part.
3. Define semantic size aliases and component tokens for geometry, color pairs, background image and backdrop. Use the same metrics in both themes.
4. Add examples, a responsive gallery and stories. Opt into the catalog and regenerate public surfaces.
5. Verify the API, build, lint, traceability, inventory and token contrast locally. Hand the browser matrix and Linux baselines to the integrator.

## Constitution check

The Stencil contract drives discovery, wrappers and catalog metadata. The element is decorative, uses logical CSS and token aliases, carries no form value, and exposes no callable methods, events or surface actions. The guarded renderer composes only declared catalog children.
