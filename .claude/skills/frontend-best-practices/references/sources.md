# Rationale and sources

Evidence behind SKILL.md, by concern. Constitution articles cited inline are
normative; external sources are the evidence base (verified July 2026).

## Stencil component authoring

Stencil 4 compiles standard web components with per-component lazy loading
(`dist`), tree-shakable custom elements (`dist-custom-elements`), and a
machine-readable API manifest (`docs-json`). The lazy `dist` target is the
structural reason Kimen can promise single-digit-KB budgets; barrels and
eager cross-imports defeat it, which is why Art. IV forbids them.

- Component decorator & options: https://stenciljs.com/docs/component
- Custom elements output target: https://stenciljs.com/docs/custom-elements
- Lazy-loaded distribution: https://stenciljs.com/docs/distribution
- docs-json output: https://stenciljs.com/docs/docs-json
- Styling, shadow DOM, ::part: https://stenciljs.com/docs/styling

## Form-associated custom elements

Form controls inside shadow DOM do not participate in form submission,
validation, or reset, and label/IDREF association breaks at the boundary.
ElementInternals fixes participation and is Baseline Widely Available
(Chrome 77, Firefox 98, Safari 16.4; the form-associated feature set reached
Widely Available in September 2025) — hence Art. IV treats it as a
foundation, not an enhancement, and every Kimen form control is
`formAssociated`. Stencil ships first-class support since v4.5.0
(`formAssociated` + `@AttachInternals`).

- Stencil form-associated docs: https://stenciljs.com/docs/form-associated
- Stencil v4.5.0 announcement: https://ionic.io/blog/announcing-support-for-form-associated-custom-elements-in-stencil-v4-5-0
- MDN ElementInternals: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals
- WebKit deep dive: https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/
- Baseline status: https://web-platform-dx.github.io/web-features-explorer/features/form-associated-custom-elements/
- WHATWG spec (FACE lifecycle callbacks): https://html.spec.whatwg.org/multipage/custom-elements.html
- Practical FACE patterns: https://bennypowers.dev/posts/form-associated-custom-elements/

## Accessibility

"No ARIA is better than bad ARIA" is the opening warning of the W3C's own
authoring guidance: wrong roles/states actively misinform assistive
technology, and partial patterns (role without keyboard) are worse than
styled native elements. Deque's audit-corpus study found automated tools
catch ~57% of issue *volume* (far fewer criteria) — the empirical basis for
"axe is the floor, not the proof" (Art. V). WCAG 2.2 added the SKILL.md
numbers: target size ≥ 24px (SC 2.5.8) and focus-not-obscured (SC 2.4.11).
EN 301 549 is normative for Kimen because consuming products fall under the
European Accessibility Act (Art. V).

- WAI-ARIA APG patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- "Read Me First" (No ARIA > bad ARIA): https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Deque automated-coverage study: https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/
- Shadow DOM ARIA limits (Nolan Lawson): https://nolanlawson.com/2022/11/28/shadow-dom-and-accessibility-the-trouble-with-aria/
- Cross-root ARIA FAQ (Matuzović): https://www.matuzo.at/blog/2023/web-components-accessibility-faq/aria-references/

### Why Reference Target must never be load-bearing

Reference Target (`ShadowRoot.referenceTarget` /
`shadowrootreferencetarget`) would let IDREFs like `for` and
`aria-labelledby` point at a host and resolve into its shadow tree. Status
as of mid-2026: WHATWG DOM PR under review, Chromium Intent-to-Experiment
(origin trial), no Gecko or WebKit implementation signal, proposed for
Interop 2026. A component library whose labeling only works in one engine's
trial fails the Art. IV three-engine baseline — so Kimen labels via slots,
internal labels, props, or `scoped` light DOM, and treats Reference Target
as a future additive enhancement only.

- Explainer: https://github.com/WICG/webcomponents/blob/gh-pages/proposals/reference-target-explainer.md
- WHATWG DOM PR: https://github.com/whatwg/dom/pull/1353
- Interop 2026 proposal: https://github.com/web-platform-tests/interop/issues/1011
- Chromium Intent to Experiment: https://groups.google.com/a/chromium.org/g/blink-dev/c/C3pELgMqzCY
- Current workarounds: https://www.htmhell.dev/adventcalendar/2025/4/

## Design tokens and CSS

CSS custom properties inherit through shadow boundaries — the one styling
primitive that crosses encapsulation by design — which is why tokens are the
first customization layer and themes are pure token reassignment (Art. VI).
The primitive → semantic → component layering follows the DTCG model
(`packages/tokens/tokens/*.json`, Style Dictionary v5 build): consuming
primitives from components hard-wires a palette and breaks the
single-step re-theme contract. Logical properties make components
direction-agnostic without per-locale CSS (Art. IV); a closed token
vocabulary is also what lets AI agents pick valid values instead of
inventing hex codes (Art. I).

- DTCG token format: https://tr.designtokens.org/format/
- Style Dictionary: https://styledictionary.com/
- MDN custom properties: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- MDN ::part(): https://developer.mozilla.org/en-US/docs/Web/CSS/::part
- MDN logical properties: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
- MDN container queries: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
- prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## TypeScript API design

Strict mode plus no-`any` public APIs is the cheapest deterministic gate in
the stack (Art. X: `tsc` is authoritative). Enums-over-boolean-explosions is
the "make illegal states unrepresentable" principle applied to props: a
`variant` union cannot express `primary && danger`, two booleans can.
Mirroring native attribute contracts (`disabled`, `value`, `name`,
`required`) exploits knowledge both humans and LLMs already have. JSDoc
completeness is not documentation hygiene but product surface: Art. I makes
the generated `docs.json` → CEM → catalog → llms.txt chain the primary
agent-facing deliverable, and SemVer (Art. IX) makes every documented member
a versioned contract.

- TS strict: https://www.typescriptlang.org/tsconfig/#strict
- Declaration do's and don'ts: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Illegal states unrepresentable: https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/
- SemVer: https://semver.org/
- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest

## Performance and budgets

Budgets only work when they are per-unit and enforced: page-level Lighthouse
scores hide a single heavy component, so Kimen budgets each component
(single-digit KB gzipped, size-limit gate) and keeps page-level auditing to
Lighthouse CI (Technology Standards). "Name the metric first" follows the
Core Web Vitals definitions — LCP < 2.5s, INP < 200ms, CLS < 0.1 — and
prevents unmeasurable "optimization" churn; the no-unprofiled-memoization
rule is Art. IV verbatim.

- Core Web Vitals: https://web.dev/articles/vitals
- INP: https://web.dev/articles/inp
- Performance budgets: https://web.dev/articles/performance-budgets-101
- size-limit: https://github.com/ai/size-limit
- content-visibility: https://web.dev/articles/content-visibility
