# Implementation plan

1. Lint the behavior contract and review the [public interface](contracts/slider.md).
2. Scaffold with Kimen's generator. Add traceable browser tests, numeric unit
   tests and adapter tests before implementing the behavior.
3. Implement pointer and keyboard input, form association and formatting in a
   shadow root. Style the track, fill, ticks and thumb with theme tokens.
4. Add the A2UI mapping, docs, stories and gallery. Regenerate the catalog,
   framework wrappers and other published surfaces, then declare the API.
5. Run offline gates. Use the integrator's three-engine browser run and Linux
   visual artifacts to verify behavior and finish the design-system re-sync.
