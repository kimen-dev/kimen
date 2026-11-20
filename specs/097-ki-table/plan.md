# Table implementation plan

1. Define the native markup contract, selection reconciliation and event payloads.
2. Scaffold the component and add traceable browser tests plus unit tests for the sort rule.
3. Enhance the author-owned table in light DOM. Limit generated markup to the sort and selection affordances and loading placeholder. Observe table edits and disconnect when the host leaves the document.
4. Style the frame and cells through semantic-backed component tokens. Cover compact and touch density, logical direction, sticky headers, forced colors and static loading.
5. Add a gallery in both themes and schemes, Storybook examples, and usage docs. Generate catalog, wrappers and public API. Run local gates and hand browser checks and Linux baselines to the integrator.
