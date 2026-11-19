# Implementation plan

1. Define the four props and the assistive-technology behavior in the [component contract](contracts/spinner-contract.md).
2. Scaffold with `pnpm component:new ki-spinner --spec 071-ki-spinner`. Write the catalog and browser tests before implementing the behavior.
3. Render the graphics and a single status in a shadow root. Drive geometry, typography, colors and motion from the token pipeline. Preserve the ring and dots in forced colors.
4. Complete the stories, usage examples, documentation and visual gallery. Generate both themes' surface metadata, the neutral catalog and all framework wrappers. Declare a minor addition to the public API.
5. Run static and token gates locally. Use the integrator's browser runs for keyboard, ARIA, axe, media emulation and visual evidence.
