# Implementation Plan: Stat

The contract covers a read-only metric card. Its main risks are losing the
comparison in the accessibility tree, using the sign as a proxy for success,
and formatting the visible and spoken numbers differently.

1. Scaffold `ki-stat` with the Kimen Nx generator. Add unit coverage for color
   preference, locale and format edge cases. Map browser tests to the contract.
2. Resolve the page language, format both numbers with Intl and derive the trend
   glyph and tone independently. Render the visual metric and its accessible
   phrase from the same strings. Project the optional chart into its own slot.
3. Add aliases for surface, border, typography and delta colors in onmars and
   Material 3. Register the component, its visual cases and its authored docs.
4. Regenerate the API, wrappers, catalog and docs and run the available gates.
   The integrator runs the three-browser suites and creates Linux baselines.
