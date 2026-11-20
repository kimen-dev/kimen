# Implementation plan

1. Freeze and lint the Gherkin contract. Scaffold `ki-fab` through the component generator, then commit the S-ID browser and scroll unit tests before implementation.
2. Render one native activator in a shadow root. Keep the accessible name independent of the visual label. Observe viewport scroll only while eligible and remove the listener on disconnection.
3. Use logical CSS and semantic aliases for fixed placement, size, fill, icon, focus, motion and elevation. Document the page-owned clearance calculation and include a working example.
4. Opt into catalog discovery and generate public docs, manifests and framework wrappers. Declare the API addition and verify source and generated surfaces. The integrator runs the browser matrix and captures the Linux visual baselines.
