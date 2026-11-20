# Implementation plan for ki-popover

1. Add the behavior contract and scaffold with component discovery.
2. Write scenario browser tests and unit tests for placement normalization.
3. Use a native auto popover with the shared anchored-overlay layout for placement, flip, and viewport bounds. Wire trigger semantics and dialog entry focus. Keep a persistent polite status for toggletips.
4. Build surface tokens, examples, stories, and the four visual combinations.
5. Regenerate package surfaces, declare the additive API, and verify the available gates. Run the three browser engines and generate Linux snapshots in CI.
