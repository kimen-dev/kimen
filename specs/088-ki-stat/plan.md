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

## Bundle evidence

Build the same version of the MCP server with and without Stat. Regenerate
the token stylesheets, elements, catalog and MCP Apps surface for each build.
The base is `0a99e05` and both builds use Node 26.5.0 and pnpm 12.20.0.

| MCP server | Raw bytes | Gzip bytes | Brotli bytes |
| --- | ---: | ---: | ---: |
| Without Stat | 2,555,314 | 481,167 | 356,695 |
| With Stat | 2,569,299 | 484,983 | 358,853 |
| Stat allowance | 13,985 | 3,816 | 2,158 |

Use Gzip level 9 and the default Brotli settings, as the bundle test does.
