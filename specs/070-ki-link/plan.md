# Link implementation plan

1. Scaffold the component and both theme token sources with the Nx generator.
2. Write browser scenarios for the native link and add coverage for catalog
   navigation. Check accessible names, focus, input modality and theme changes.
3. Style the shadow anchor with semantic token aliases and preserve native
   navigation. Register the component in discovery and the catalog.
4. Add documentation, stories and a gallery for inline and standalone links.
   Regenerate package surfaces and declare the public API addition as minor.
5. Run the local deterministic gates. The integrator verifies the browser
   matrix and captures Linux visual baselines in CI.
