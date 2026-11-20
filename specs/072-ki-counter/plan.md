# Counter implementation plan

1. Lint the behavior contract, scaffold the component with the Kimen
   generator, and add tests that map every scenario.
2. Implement count formatting, decorative semantics, logical placement, and
   the opt-in slots for icon button and avatar. Reuse shared anchor lookup
   and layout tracking for an ID-linked counter.
3. Add contrast-checked token aliases, component inventory, examples, and
   docs. Generate the catalog, wrapper exports, and public API surface.
4. Run the local deterministic checks and pass the browser suite and
   CI-owned visual baselines to the integrator.
