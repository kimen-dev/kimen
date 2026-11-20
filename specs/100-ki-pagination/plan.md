# Implementation Plan

Use the Kimen component generator once the contract passes lint. Build a shadow
element using native page controls, the shipped icon buttons and button, and
registered direction icons. Keep page range and URL template logic in a small
pure helper. Use an inline-size container query to switch between the numbered
and compact layouts. The inactive layout is hidden from focus and assistive
technology.

| Obligation | Implementation |
| --- | --- |
| Public source and stability (I, IX) | Document Stencil props, events, parts and semantic token aliases. Regenerate discovery surfaces and declare a minor API addition. |
| Contract and verification (II, III, X) | Write the unit and S-ID browser specs before implementation. Exercise page ranges, keyboard, status updates, guarded actions, responsive layout and tokens. |
| Accessibility and tokens (IV–VI) | Use native keyboard behavior, a named landmark, an overridable page name, polite status, logical styles, and contrast-checked color pairs. Run the shared accessibility and visual suites in CI. |
| Catalog (VIII) | Declare both events and the URL format. Keep guarded action selection limited to the active pagination variant and preserve other renderer guards. |
