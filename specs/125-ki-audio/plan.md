# Implementation plan

1. Commit the synchronized behavior and API contract. Scaffold through `pnpm component:new`.
2. Commit browser, pointer, rate/time, and A2UI tests before implementation. Reuse Slider for the timeline and Menu for the rate selection.
3. Drive playback through a native audio element. Keep local state synchronized with native media events. Apply semantic tokens and document the localized labels and URL policy.
4. Generate the catalog, wrappers, public API snapshot, and docs. Run the available gates. Hand off the browser matrix, Linux visual baselines, and design-system card re-sync to the integrator.
