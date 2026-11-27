# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release entries
are generated through [the release pull request](./docs/releasing.md).

## [0.6.0] - 2026-11-27

### Added

- **emitter:** Match model glyph choices to the host's `icons` list, shorten catalog prompts with `verbosity: 'compact'`, and declare exact field keys for named button actions in strict schemas and tools (specs 168–170).
- **emitter:** add host icon vocabularies, compact prompts, and strict collection ([#657](https://github.com/kimen-dev/kimen/pull/657))

## [0.5.0] - 2026-11-27

### Changed

- **elements:** ship one glyph declaration and no duplicate llms summary ([#645](https://github.com/kimen-dev/kimen/pull/645))
- **elements:** shorten Stencil-generated vDOM keys ([#650](https://github.com/kimen-dev/kimen/pull/650))
- ⚠️  **elements:** serve ./loader from the per-component modules ([#648](https://github.com/kimen-dev/kimen/pull/648))
- **elements:** share shadow styles across chunks ([#654](https://github.com/kimen-dev/kimen/pull/654))
- **react:** slim the generated wrapper runtime ([#649](https://github.com/kimen-dev/kimen/pull/649))
- **tokens:** make the core and tag sheets the documented default ([#644](https://github.com/kimen-dev/kimen/pull/644))
- **tokens:** drop the private foundations from the full sheet ([#647](https://github.com/kimen-dev/kimen/pull/647))
- **tokens:** ship Newsreader at weight 500 ([#651](https://github.com/kimen-dev/kimen/pull/651))

**Breaking changes**

- **elements:** align event and form contracts with behaviour  ([#656](https://github.com/kimen-dev/kimen/pull/656))
  Dialog close events always set cancelable. Only fullscreen
  Escape and the header close button accept a veto. Seventeen notification events
  now have cancelable set to false. Code block copy results originate on the code
  block. Disabled textarea, checkbox, switch and prompt input values leave form
  data immediately.
  * chore: regenerate the public API snapshot after merging main
- **elements:** drop componentOnReady from the element types  ([#655](https://github.com/kimen-dev/kimen/pull/655))
- **elements:** serve ./loader from the per-component modules  ([#648](https://github.com/kimen-dev/kimen/pull/648))

### Removed

- **elements:** **Breaking:** `HTMLKi*Element` types no longer declare
  `componentOnReady()`. Await `customElements.whenDefined(tag)` for
  registration and wait for the component's first render if you need its DOM.

### Fixed

- ⚠️  **elements:** drop componentOnReady from the element types ([#655](https://github.com/kimen-dev/kimen/pull/655))
- ⚠️  **elements:** align event and form contracts with behaviour ([#656](https://github.com/kimen-dev/kimen/pull/656))

## [0.4.0] - 2026-11-26

### Added

- **adapter-mcp-apps:** publish form and data surface documents (spec 165) ([#629](https://github.com/kimen-dev/kimen/pull/629))
- **tokens:** core and per-component token sheets (spec 166) ([#630](https://github.com/kimen-dev/kimen/pull/630))

### Changed

- **catalog:** parse with zod/mini and keep guidance prose out of the GenUI host ([#634](https://github.com/kimen-dev/kimen/pull/634))
- **elements:** compile the Stencil runtime into the per-component modules ([#636](https://github.com/kimen-dev/kimen/pull/636))
- **react:** ship the output target runtime instead of its build tooling ([#633](https://github.com/kimen-dev/kimen/pull/633))

### Fixed

- **adapter-mcp-apps:** declare SURFACE_DOCUMENT as string, not as its own text ([#628](https://github.com/kimen-dev/kimen/pull/628))
- **deps:** update dependency astro to v7.4.13 ([#637](https://github.com/kimen-dev/kimen/pull/637))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.328 ([#641](https://github.com/kimen-dev/kimen/pull/641))
- **elements:** bundle the lazy loader with Vite and esbuild ([#632](https://github.com/kimen-dev/kimen/pull/632))
- **elements:** export the ki-top-nav types its declarations use ([#638](https://github.com/kimen-dev/kimen/pull/638))

## [0.3.0] - 2026-11-25

### Changed

- **release:** every package publishes only what its exports reach, ships source
  maps that embed their sources, and has a tarball and unpacked size budget;
  the ten packages together shrink from about 7.6 MB to 5.3 MB packed
  ([#621](https://github.com/kimen-dev/kimen/pull/621),
  [#623](https://github.com/kimen-dev/kimen/pull/623))

### Removed

- **elements:** **Breaking:** `@kimen/elements` no longer publishes `dist/cjs`,
  the Stencil collection (`collection`, `collection:main`) or the `dist/kimen`
  browser build (`unpkg`). Every export resolves as before; a bare
  `https://unpkg.com/@kimen/elements` URL no longer serves a script. See the
  [migration guide](./docs/migrations/package-outputs-0.3.0.md)
  ([#621](https://github.com/kimen-dev/kimen/pull/621),
  [#624](https://github.com/kimen-dev/kimen/pull/624))

### Fixed

- **elements:** let a ki-table frame scroll natively from the arrow keys ([#625](https://github.com/kimen-dev/kimen/pull/625))
- **release:** let a feat raise the minor version whatever its scope ([#610](https://github.com/kimen-dev/kimen/pull/610))
- **release:** keep TypeScript build info out of the published packages ([#611](https://github.com/kimen-dev/kimen/pull/611))
- **release:** publish only what consumers use ([#621](https://github.com/kimen-dev/kimen/pull/621))
- **release:** publish the two generated modules without a source map ([#623](https://github.com/kimen-dev/kimen/pull/623))

## [0.2.1] - 2026-11-25

### Added

- **release:** publish the generative UI packages and framework wrappers ([#609](https://github.com/kimen-dev/kimen/pull/609))

### Fixed

- **catalog:** close the built-in open unions over their documented values (spec 164) ([#606](https://github.com/kimen-dev/kimen/pull/606))
- **deps:** update sandbox toolchain ([#603](https://github.com/kimen-dev/kimen/pull/603))

## [0.2.0] - 2026-11-24

### Added

- **adapter-mcp-apps:** MCP Apps surfaces change without a full repaint (157) ([#567](https://github.com/kimen-dev/kimen/pull/567))
- **adapter-mcp-apps:** show a waiting placeholder until a spec paints (spec 163) ([#598](https://github.com/kimen-dev/kimen/pull/598))
- **catalog:** repair live-surface focus and clear forced numbers (spec 155) ([#566](https://github.com/kimen-dev/kimen/pull/566))
- **catalog:** let an action collect other fields' values (spec 153) ([#570](https://github.com/kimen-dev/kimen/pull/570))
- **catalog:** bind an action per event (spec 154) ([#575](https://github.com/kimen-dev/kimen/pull/575))
- **catalog:** reset a live control once an action delivered it (spec 155 S9–S14) ([#578](https://github.com/kimen-dev/kimen/pull/578))
- **catalog:** read-only native tables (spec 158) ([#579](https://github.com/kimen-dev/kimen/pull/579))
- **catalog:** deliver a surface's actions within an action-rate budget (spec 162) ([#589](https://github.com/kimen-dev/kimen/pull/589))
- **elements:** custom-error on twelve form controls (spec 156) ([#569](https://github.com/kimen-dev/kimen/pull/569))
- **elements:** ki-carousel rotates at most once every 5000 ms (spec 123 A1) ([#588](https://github.com/kimen-dev/kimen/pull/588))
- **elements:** ki-button link mode and content alignment tokens (integrator 0.1.3, items 2-3) ([#593](https://github.com/kimen-dev/kimen/pull/593))
- **elements:** ki-top-nav collapse-at="none" wraps links instead of collapsing ([#590](https://github.com/kimen-dev/kimen/pull/590))
- **elements:** color Gherkin in ki-code-block (integrator 0.1.3, item 4) ([#587](https://github.com/kimen-dev/kimen/pull/587))
- **tokens:** give the switch thumb its own shadow token and name md in size descriptions ([#585](https://github.com/kimen-dev/kimen/pull/585))
- **tokens:** preference modes win over any theme ([#592](https://github.com/kimen-dev/kimen/pull/592))

### Fixed

- **agents:** version the plugin with each release; clarify region theming and css/base ([#584](https://github.com/kimen-dev/kimen/pull/584))
- **catalog:** keep the person's unsent input out of the agent's reach (spec 159) ([#574](https://github.com/kimen-dev/kimen/pull/574))
- **catalog:** a forced override hands back only the props it names (spec 160) ([#577](https://github.com/kimen-dev/kimen/pull/577))
- **catalog:** open the browser bubble on the field that takes the focus (spec 153 S13) ([#597](https://github.com/kimen-dev/kimen/pull/597))
- **deps:** update sandbox toolchain ([#553](https://github.com/kimen-dev/kimen/pull/553))
- **elements:** keep a custom error set during a checkbox toggle; disabled switch validity ([#573](https://github.com/kimen-dev/kimen/pull/573))
- **elements:** keep a dialog opener's popup ARIA and cancel middle clicks on a loading link ([#596](https://github.com/kimen-dev/kimen/pull/596))
- **mutation:** unblock the daily mutation run and its stale specs ([#571](https://github.com/kimen-dev/kimen/pull/571))
- **scripts:** stop background git maintenance in generated-sync fixtures ([#576](https://github.com/kimen-dev/kimen/pull/576))

## [0.1.3] - 2026-11-21

### Fixed

- **deps:** update dependency @astrojs/starlight to v0.43.1 ([#551](https://github.com/kimen-dev/kimen/pull/551))
- **elements:** component fixes from the 0.1.1 integrator feedback (items 2, 3, 4, 7, 8, 9, 10) ([#558](https://github.com/kimen-dev/kimen/pull/558))
- **elements:** never clip ki-avatar initials, only the portrait ([#564](https://github.com/kimen-dev/kimen/pull/564))
- **ki-date-picker:** show an outside value written before a commit renders ([#559](https://github.com/kimen-dev/kimen/pull/559))
- **tokens:** theming fixes from the 0.1.1 integrator feedback (items 1, 5, 6, 11, 12, color-scheme) ([#557](https://github.com/kimen-dev/kimen/pull/557))

## [0.1.2] - 2026-11-21

### Added

- **agents:** bundle a pinned kimen-mcp in the plugin, Gemini extension, install links and MCP Registry metadata ([#519](https://github.com/kimen-dev/kimen/pull/519))

### Fixed

- design-system review of 2026-11-20 (items 1–12) ([#548](https://github.com/kimen-dev/kimen/pull/548))
- design-review follow-ups (M3 low-em inks, neutral alert icon, DESIGN.md) ([#552](https://github.com/kimen-dev/kimen/pull/552))
- **catalog:** offer specs only the stock glyph selection (069 S14) ([#556](https://github.com/kimen-dev/kimen/pull/556))
- **deps:** update dependency astro to v7.4.12 ([#546](https://github.com/kimen-dev/kimen/pull/546))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.324 ([#545](https://github.com/kimen-dev/kimen/pull/545))

## [0.1.1] - 2026-11-20

### Fixed

- **deps:** update dependency @astrojs/starlight to v0.43.0 ([#542](https://github.com/kimen-dev/kimen/pull/542))
- **elements:** clear Firefox's labelled-by cache after aria snapshots ([#543](https://github.com/kimen-dev/kimen/pull/543))

## [0.1.0] - 2026-11-20

### Added

- `@kimen/tokens`: the MarsUI design DNA as new public `--ki-*` tokens — a
  six-step elevation shadow ramp, glass effect recipes with backdrop blur,
  3px scheme-aware focus rings, and a dedicated surface-size scale that gives
  dialogs, tooltips and listboxes real min/max dimensions instead of reusing
  the spacing scale.
- `@kimen/tokens`: the material3 theme is now a complete, faithful Material
  Design 3 baseline — tonal palettes, state layers, the full type scale,
  shape corner scale, elevation levels, and motion durations/easings — still
  opt-in via `data-ki-theme="material3"` plus `@kimen/tokens/css/material3`.
- Pixel-exact visual regression gate covering 60 deterministic
  component-state galleries (20 components × onmars light/dark + material3
  light) with vendored fonts and zero-mismatch tolerance. Ships disarmed
  (loud skips); it arms once the linux baselines are minted in CI and
  committed (see `packages/elements/browser-tests/README.md`).
- Fase 0 factory — pnpm+Nx monorepo, deterministic layer, kimen workflow ([274d90ea](https://github.com/kimen-dev/kimen/commit/274d90ea))
- Storybook 10 component workshop + GitHub Pages docs deploy ([#5](https://github.com/kimen-dev/kimen/pull/5))
- harden project integrity ([#36](https://github.com/kimen-dev/kimen/pull/36))
- consolidate the visual-fidelity train onto main (fases T, M3, V, Q, D) ([#50](https://github.com/kimen-dev/kimen/pull/50))
- MarsUI fidelity pixel pass — Storybook truthful, components pixel-matched, subtle motion ([#101](https://github.com/kimen-dev/kimen/pull/101))
- GenUI review batch — catalog hardening + @kimen/emitter + framework wrappers ([#150](https://github.com/kimen-dev/kimen/pull/150))
- **adapter-a2ui:** A2UI protocol adapter — render through the guardrail (spec 029) ([#59](https://github.com/kimen-dev/kimen/pull/59))
- **adapter-a2ui:** accept A2UI 1.0 alongside 0.9.1 (spec 039) ([#279](https://github.com/kimen-dev/kimen/pull/279))
- **adapter-mcp-apps:** expose Kimen surfaces to MCP Apps hosts (spec 030) ([#60](https://github.com/kimen-dev/kimen/pull/60))
- ⚠️  **adapter-mcp-apps:** deliver a complete, themed surface document ([#261](https://github.com/kimen-dev/kimen/pull/261))
- **adapter-mcp-apps:** relay acknowledged surface actions to the model (spec 040) ([#283](https://github.com/kimen-dev/kimen/pull/283))
- **agents:** add the Connect your agent guide and the kimen agent plugin ([#510](https://github.com/kimen-dev/kimen/pull/510))
- **agents:** npx skills install and a plugin eval suite for the kimen plugin ([#517](https://github.com/kimen-dev/kimen/pull/517))
- **button:** forward host aria-description to the delegated inner button ([#32](https://github.com/kimen-dev/kimen/pull/32))
- **catalog:** neutral runtime catalog with schema validation at the genui boundary ([#57](https://github.com/kimen-dev/kimen/pull/57))
- **catalog:** guarded renderer — untrusted specs render only through the catalog ([#58](https://github.com/kimen-dev/kimen/pull/58))
- **catalog:** consumer catalog registration — createCatalog + catalog-in-use threading (spec 032) ([#148](https://github.com/kimen-dev/kimen/pull/148))
- **catalog:** live surface with stable node ids and atomic id-addressed batches (spec 035) ([#191](https://github.com/kimen-dev/kimen/pull/191))
- ⚠️  **catalog:** reject inaccessible, out-of-range and unsafe-URL specs ([#260](https://github.com/kimen-dev/kimen/pull/260))
- **catalog:** native primitives for text, layout and images in generated UI (spec 037) ([#280](https://github.com/kimen-dev/kimen/pull/280))
- **catalog:** reserve style, class, slot and id prop names (032 S19-S20) ([#282](https://github.com/kimen-dev/kimen/pull/282))
- **elements:** ki-button — five-level emphasis, tone, tokens-only styling (002) ([#4](https://github.com/kimen-dev/kimen/pull/4))
- **elements:** agent surfaces — custom-elements manifest + llms.txt pipeline (017) ([#10](https://github.com/kimen-dev/kimen/pull/10))
- **elements:** ki-card — slotted regions with empty-collapse, tokens-only (009) ([#9](https://github.com/kimen-dev/kimen/pull/9))
- **elements:** ki-input — native text field with ElementInternals form participation (003) ([#11](https://github.com/kimen-dev/kimen/pull/11))
- **elements:** ki-checkbox — native toggle with zero aria and deliberate barrel (006) ([#12](https://github.com/kimen-dev/kimen/pull/12))
- **elements:** ki-textarea — multiline sibling of ki-input, enter never submits (004) ([#13](https://github.com/kimen-dev/kimen/pull/13))
- **elements:** ki-badge — zero-js five-tone status pill (010) ([#14](https://github.com/kimen-dev/kimen/pull/14))
- **elements:** ki-switch — immediate on/off setting, apg switch pattern (008) ([#15](https://github.com/kimen-dev/kimen/pull/15))
- **elements:** ki-alert — persistent inline message, five tones, live-region by tone (011) ([#16](https://github.com/kimen-dev/kimen/pull/16))
- **elements:** ki-radio-group + ki-radio — APG radio group, composite form control (007) ([#17](https://github.com/kimen-dev/kimen/pull/17))
- **elements:** ki-progress — determinate + indeterminate, linear & circular (015) ([#18](https://github.com/kimen-dev/kimen/pull/18))
- **elements:** ki-list + ki-list-item — non-interactive data list (016) ([#19](https://github.com/kimen-dev/kimen/pull/19))
- **elements:** ki-tooltip — supplementary text on hover & focus, aria-description (013) ([#20](https://github.com/kimen-dev/kimen/pull/20))
- **elements:** ki-dialog — modal on native <dialog>, keyboard-safe footer (012) ([#21](https://github.com/kimen-dev/kimen/pull/21))
- **elements:** ki-tabs + ki-tab + ki-tab-panel — APG Tabs, automatic activation (014) ([#22](https://github.com/kimen-dev/kimen/pull/22))
- **elements:** ki-select + ki-option — APG select-only combobox, form-associated (005) ([#23](https://github.com/kimen-dev/kimen/pull/23))
- **elements:** per-component import subpaths in package exports ([#27](https://github.com/kimen-dev/kimen/pull/27))
- **elements:** fase N wave 1 — divider, status, icon-button, avatar and avatar-group ([#52](https://github.com/kimen-dev/kimen/pull/52))
- **elements:** fase N wave 2 — scroller, indicator, video and qr close the catalog at 29 ([#55](https://github.com/kimen-dev/kimen/pull/55))
- ⚠️  **elements:** make llms.txt an index with one document per component ([#263](https://github.com/kimen-dev/kimen/pull/263))
- **elements:** give every form control the native field validation API ([#278](https://github.com/kimen-dev/kimen/pull/278))
- **elements:** field help and error text on form controls (spec 042) ([#291](https://github.com/kimen-dev/kimen/pull/291))
- **elements:** compact region density (spec 045) ([#294](https://github.com/kimen-dev/kimen/pull/294))
- **elements:** give ki-alert the Alert master anatomy with icon and actions slots (011 A1) ([#323](https://github.com/kimen-dev/kimen/pull/323))
- **elements:** loading buttons, field label hints, touch density and touch-size field text (#317-#321) ([#340](https://github.com/kimen-dev/kimen/pull/340), [#317](https://github.com/kimen-dev/kimen/issues/317), [#321](https://github.com/kimen-dev/kimen/issues/321))
- **elements:** a font-family token for component headings ([#347](https://github.com/kimen-dev/kimen/pull/347), [#416](https://github.com/kimen-dev/kimen/pull/416))
- **elements:** themeable switch glyphs ([#345](https://github.com/kimen-dev/kimen/pull/345), [#418](https://github.com/kimen-dev/kimen/pull/418))
- **elements:** solid backgrounds for dialog, tooltip and select listbox ([#343](https://github.com/kimen-dev/kimen/pull/343), [#421](https://github.com/kimen-dev/kimen/pull/421))
- **elements:** four button roles, tertiary deprecated as secondary ([#344](https://github.com/kimen-dev/kimen/pull/344), [#423](https://github.com/kimen-dev/kimen/pull/423))
- **elements:** size axes for fields, tabs, list rows and choice controls ([#316](https://github.com/kimen-dev/kimen/pull/316), [#424](https://github.com/kimen-dev/kimen/pull/424))
- **elements:** add ki-icon with per-icon Lucide imports ([#360](https://github.com/kimen-dev/kimen/pull/360), [#442](https://github.com/kimen-dev/kimen/pull/442))
- **elements:** ki-toast and ki-toaster (spec 049, #353) ([#426](https://github.com/kimen-dev/kimen/pull/426), [#353](https://github.com/kimen-dev/kimen/issues/353))
- **elements:** Add ki-spinner for inline indeterminate activity ([#365](https://github.com/kimen-dev/kimen/pull/365), [#437](https://github.com/kimen-dev/kimen/pull/437))
- **elements:** Add neutral stack and grid layout elements ([#361](https://github.com/kimen-dev/kimen/pull/361), [#438](https://github.com/kimen-dev/kimen/pull/438))
- **elements:** Add the static Note component ([#359](https://github.com/kimen-dev/kimen/pull/359), [#440](https://github.com/kimen-dev/kimen/pull/440))
- **elements:** ## Summary ([#351](https://github.com/kimen-dev/kimen/pull/351), [#441](https://github.com/kimen-dev/kimen/pull/441))
- **elements:** Add the Counter component ([#356](https://github.com/kimen-dev/kimen/pull/356), [#443](https://github.com/kimen-dev/kimen/pull/443))
- **elements:** ## Summary ([#362](https://github.com/kimen-dev/kimen/pull/362), [#444](https://github.com/kimen-dev/kimen/pull/444))
- **elements:** Add CheckboxGroup and map A2UI multiple selection ([#367](https://github.com/kimen-dev/kimen/pull/367), [#445](https://github.com/kimen-dev/kimen/pull/445))
- **elements:** Add variants and primary activation to ki-card ([#379](https://github.com/kimen-dev/kimen/pull/379), [#446](https://github.com/kimen-dev/kimen/pull/446))
- **elements:** Add segmented controls ([#381](https://github.com/kimen-dev/kimen/pull/381), [#450](https://github.com/kimen-dev/kimen/pull/450))
- **elements:** Add Chip and Chip Group ([#355](https://github.com/kimen-dev/kimen/pull/355), [#448](https://github.com/kimen-dev/kimen/pull/448))
- **elements:** add ki-skeleton ([#385](https://github.com/kimen-dev/kimen/pull/385), [#449](https://github.com/kimen-dev/kimen/pull/449))
- **elements:** Add `<ki-button-group>` ([#382](https://github.com/kimen-dev/kimen/pull/382), [#451](https://github.com/kimen-dev/kimen/pull/451))
- **elements:** Add the anchored action menu ([#352](https://github.com/kimen-dev/kimen/pull/352), [#452](https://github.com/kimen-dev/kimen/pull/452))
- **elements:** add ki-stat ([#395](https://github.com/kimen-dev/kimen/pull/395), [#454](https://github.com/kimen-dev/kimen/pull/454))
- **elements:** let ki-button open ki-dialog with invoker commands ([#368](https://github.com/kimen-dev/kimen/pull/368), [#447](https://github.com/kimen-dev/kimen/pull/447))
- **elements:** add <ki-empty-state> (EmptyState) ([#393](https://github.com/kimen-dev/kimen/pull/393), [#461](https://github.com/kimen-dev/kimen/pull/461))
- **elements:** Add localized Format elements ([#386](https://github.com/kimen-dev/kimen/pull/386), [#458](https://github.com/kimen-dev/kimen/pull/458))
- **elements:** add ki-copy-button ([#366](https://github.com/kimen-dev/kimen/pull/366), [#456](https://github.com/kimen-dev/kimen/pull/456))
- **elements:** add <ki-fab> (FAB and extended FAB) ([#401](https://github.com/kimen-dev/kimen/pull/401), [#471](https://github.com/kimen-dev/kimen/pull/471))
- **elements:** add <ki-slider> (Slider) ([#387](https://github.com/kimen-dev/kimen/pull/387), [#469](https://github.com/kimen-dev/kimen/pull/469))
- **elements:** Add the anchored Popover component ([#363](https://github.com/kimen-dev/kimen/pull/363), [#453](https://github.com/kimen-dev/kimen/pull/453))
- **elements:** add <ki-breadcrumb> (Breadcrumb) ([#392](https://github.com/kimen-dev/kimen/pull/392), [#462](https://github.com/kimen-dev/kimen/pull/462))
- **elements:** Add Stepper for named task progress ([#394](https://github.com/kimen-dev/kimen/pull/394), [#459](https://github.com/kimen-dev/kimen/pull/459))
- **elements:** add <ki-table> (Table) ([#354](https://github.com/kimen-dev/kimen/pull/354), [#463](https://github.com/kimen-dev/kimen/pull/463))
- **elements:** add <ki-ai-label> (AILabel) ([#398](https://github.com/kimen-dev/kimen/pull/398), [#466](https://github.com/kimen-dev/kimen/pull/466))
- **elements:** add <ki-code-block> (CodeBlock) ([#369](https://github.com/kimen-dev/kimen/pull/369), [#495](https://github.com/kimen-dev/kimen/pull/495))
- **elements:** add <ki-conversation> and <ki-message> (Conversation) ([#371](https://github.com/kimen-dev/kimen/pull/371), [#485](https://github.com/kimen-dev/kimen/pull/485))
- **elements:** add <ki-confirmation> (Confirmation) ([#374](https://github.com/kimen-dev/kimen/pull/374), [#465](https://github.com/kimen-dev/kimen/pull/465))
- **elements:** add the action slot to ki-input (InputAction) ([#383](https://github.com/kimen-dev/kimen/pull/383), [#467](https://github.com/kimen-dev/kimen/pull/467))
- **elements:** add <ki-combobox> (Combobox) ([#375](https://github.com/kimen-dev/kimen/pull/375), [#468](https://github.com/kimen-dev/kimen/pull/468))
- **elements:** Add native Details and Accordion ([#364](https://github.com/kimen-dev/kimen/pull/364), [#455](https://github.com/kimen-dev/kimen/pull/455))
- **elements:** add a toggle mode to ki-icon-button and ki-button (ToggleIconButton) ([#376](https://github.com/kimen-dev/kimen/pull/376), [#464](https://github.com/kimen-dev/kimen/pull/464))
- **elements:** add <ki-search> (Search) ([#378](https://github.com/kimen-dev/kimen/pull/378), [#472](https://github.com/kimen-dev/kimen/pull/472))
- **elements:** land document 2 components, batch of 24 (+ Renovate) ([#505](https://github.com/kimen-dev/kimen/pull/505))
- **elements:** add <ki-carousel> (Carousel) ([#413](https://github.com/kimen-dev/kimen/pull/413), [#492](https://github.com/kimen-dev/kimen/pull/492))
- **elements:** land document 2 components, batch 2 (Sources, InteractiveList, InputVariants, FullscreenDialog) ([#509](https://github.com/kimen-dev/kimen/pull/509))
- **mcp-server:** Kimen MCP server over stdio (spec 038) ([#281](https://github.com/kimen-dev/kimen/pull/281))
- **meta:** unscoped kimen placeholder package ([6884be1a](https://github.com/kimen-dev/kimen/commit/6884be1a))
- **sandbox:** vendor-agnostic loop agents (Claude Code + Codex CLI) ([e11d0bdb](https://github.com/kimen-dev/kimen/commit/e11d0bdb))
- **sandbox:** two-command UX with ChatGPT-subscription Codex ([e01d0534](https://github.com/kimen-dev/kimen/commit/e01d0534))
- **site:** ship redesigned landing, docs shell, and playground ([#127](https://github.com/kimen-dev/kimen/pull/127))
- **site:** publish the site at kimen.dev from Cloudflare Pages ([#134](https://github.com/kimen-dev/kimen/pull/134))
- **site:** redesign kimen.dev to onmars v2 ([#499](https://github.com/kimen-dev/kimen/pull/499), [#504](https://github.com/kimen-dev/kimen/pull/504))
- **tokens:** onmars theme sources from MarsUI with light+dark build ([0aaad79e](https://github.com/kimen-dev/kimen/commit/0aaad79e))
- **tokens:** declare each token once and theme by subtree ([#259](https://github.com/kimen-dev/kimen/pull/259))
- **tokens:** deprecate the 85 component tokens nothing paints (spec 041) ([#289](https://github.com/kimen-dev/kimen/pull/289))
- **tokens:** more contrast and reduced transparency modes (specs 043, 044) ([#292](https://github.com/kimen-dev/kimen/pull/292))
- **tokens:** let a theme turn the backdrop filter off ([#342](https://github.com/kimen-dev/kimen/pull/342), [#422](https://github.com/kimen-dev/kimen/pull/422))
- **tokens:** opt-in font stylesheets for the themes ([#346](https://github.com/kimen-dev/kimen/pull/346), [#420](https://github.com/kimen-dev/kimen/pull/420))
- **tokens:** onmars v2 (Calma) theme values ([#341](https://github.com/kimen-dev/kimen/pull/341), [#425](https://github.com/kimen-dev/kimen/pull/425))
- **tooling:** Nx generators for component, feature-spec and adapter ([01f64368](https://github.com/kimen-dev/kimen/commit/01f64368))

### Changed

- `ki-button` restyled to MarsUI visual fidelity, variant by variant:
  primary hover now lightens over a glass shadow stack, secondary becomes
  neutral glass with backdrop blur, bevel borders and exact per-size heights
  (24/32/40/48/56px) render as designed; danger/success primary and disabled
  colors deliberately diverge from the design source to preserve WCAG
  contrast.
- All components adopt the MarsUI language: the double focus ring (3px glow
  under the opaque WCAG indicator) lands on every form control and tab,
  card/dialog/select-listbox/tooltip move onto the shared elevation ramp,
  and dialog widths now come from the new surface-size tokens.
- Token public API grows additively (no removals) with declared,
  digest-bound effective-value changes; consumers who pinned exact rendered
  values should re-check against the new baseline.
- Test and release infrastructure hardened: browser-test coverage is now
  measured, raw sleeps replaced by condition waits, and package/packaging
  contracts are validated inside release dry runs.

**Breaking changes**

- **elements:** make llms.txt an index with one document per component  ([#263](https://github.com/kimen-dev/kimen/pull/263))
  `EmitterTarget` no longer includes 'anthropic-strict' and
  `DerivationOptions.maxDepth` is removed.
  Scenarios: 033 S20 added, S15 extended, S6 retired.
- **tokens:** let the host scheme win and give material3 dark its tones  ([#262](https://github.com/kimen-dev/kimen/pull/262))
  `EmitterTarget` no longer includes 'anthropic-strict' and
  `DerivationOptions.maxDepth` is removed.
  Scenarios: 033 S20 added, S15 extended, S6 retired.
- **adapter-mcp-apps:** deliver a complete, themed surface document  ([#261](https://github.com/kimen-dev/kimen/pull/261))
  `EmitterTarget` no longer includes 'anthropic-strict' and
  `DerivationOptions.maxDepth` is removed.
  Scenarios: 033 S20 added, S15 extended, S6 retired.
- **catalog:** reject inaccessible, out-of-range and unsafe-URL specs  ([#260](https://github.com/kimen-dev/kimen/pull/260))
  `EmitterTarget` no longer includes 'anthropic-strict' and
  `DerivationOptions.maxDepth` is removed.
  Scenarios: 033 S20 added, S15 extended, S6 retired.
- **adapter-a2ui:** speak A2UI v0.9.1 instead of a v0.8 dialect  ([#190](https://github.com/kimen-dev/kimen/pull/190))
  apply() now takes A2UI v0.9.1 messages only; v0.8-style
  messages are rejected. The protocolVersion and onUserAction options are
  replaced by the per-message version field and onAction (A2UI action
  event). Heading, ListItem, MultilineTextField, Checkbox, Badge, Alert and
  Progress are no longer accepted types: they are not in the basic catalog.
  * docs(adapter-a2ui): describe the A2UI v0.9.1 host flow
  Rewrite the A2UI host guide and the site page for createSurface,
  updateComponents, updateDataModel and deleteSurface, the action and error
  client messages, and the data model held by the adapter. Regenerate
  llms.txt from docs/genui-surfaces.json."
  M	docs/genui-surfaces.json
  M	docs/guides/a2ui-host.md
  M	llms.txt
  M	packages/adapter-a2ui/COMPAT.md
  M	packages/adapter-a2ui/README.md
  M	packages/adapter-a2ui/src/adapter.ts
  M	packages/adapter-a2ui/src/coverage.ts
  A	packages/adapter-a2ui/src/data-model.ts
  M	packages/adapter-a2ui/src/index.ts
  M	packages/adapter-a2ui/src/protocol.ts
  A	packages/adapter-a2ui/src/render-point.ts
  M	packages/adapter-a2ui/src/translate.ts
  A	packages/adapter-a2ui/src/values.ts
  M	packages/adapter-a2ui/tests/adapter.spec.ts
  M	packages/adapter-a2ui/tests/coverage.spec.ts
  A	packages/adapter-a2ui/tests/fixtures/spec-examples.ts
  M	packages/adapter-a2ui/tests/security.spec.ts
  M	site/docs/src/content/docs/guides/a2ui.mdx
  M	specs/029-adapter-a2ui/feature.feature
  M	specs/029-adapter-a2ui/spec.md
- **adapter-mcp-apps:** speak the MCP Apps 2026-01-26 lifecycle  ([#187](https://github.com/kimen-dev/kimen/pull/187))
  METHOD_ACTION, parseEnvelope, ActionMessage,
  ProtocolEnvelope and ToolResultMessage are removed; METHOD_TOOL_RESULT is
  now 'ui/notifications/tool-result'; createSurfaceBridge needs start() and
  a completed handshake before it renders; surfaceToolResult moves the spec
  from _meta.ui.surface to structuredContent.kimenSurface.
  * docs(adapter-mcp-apps): document the MCP Apps 2026-01-26 wire lifecycle
  Update the MCP Apps guide, the site page and the GenUI surface source
  (llms.txt regenerated by build-surfaces) for the ui/initialize handshake,
  ui/notifications/tool-result rendering, the structuredContent payload and
  the app-only kimen_surface_action tool."
  M	docs/genui-surfaces.json
  M	docs/guides/mcp-apps.md
  M	llms.txt
  M	packages/adapter-mcp-apps/COMPAT.md
  M	packages/adapter-mcp-apps/README.md
  M	packages/adapter-mcp-apps/src/bridge.ts
  M	packages/adapter-mcp-apps/src/index.ts
  M	packages/adapter-mcp-apps/src/protocol.ts
  M	packages/adapter-mcp-apps/src/resource.ts
  M	packages/adapter-mcp-apps/src/surface-runtime.ts
  M	packages/adapter-mcp-apps/src/surface-wiring.ts
  M	packages/adapter-mcp-apps/tests/guardrail.spec.ts
  A	packages/adapter-mcp-apps/tests/lifecycle.spec.ts
  M	packages/adapter-mcp-apps/tests/protocol.spec.ts
  M	packages/adapter-mcp-apps/tests/resource.spec.ts
  A	packages/adapter-mcp-apps/tests/spec-messages.ts
  M	packages/adapter-mcp-apps/tests/surface-wiring.spec.ts
  M	site/docs/src/content/docs/guides/mcp-apps.mdx
  M	specs/030-adapter-mcp-apps/feature.feature
  M	specs/030-adapter-mcp-apps/spec.md

### Fixed

- match canonical founder login ([#34](https://github.com/kimen-dev/kimen/pull/34))
- the bare-page contract, the MarsUI focus ring, and 13 false-negative specs ([#63](https://github.com/kimen-dev/kimen/pull/63))
- the five semgrep findings that have kept the security gate red since 17 July ([#70](https://github.com/kimen-dev/kimen/pull/70))
- ⚠️  **adapter-a2ui:** speak A2UI v0.9.1 instead of a v0.8 dialect ([#190](https://github.com/kimen-dev/kimen/pull/190))
- ⚠️  **adapter-mcp-apps:** speak the MCP Apps 2026-01-26 lifecycle ([#187](https://github.com/kimen-dev/kimen/pull/187))
- **angular:** commit the utils.ts that angular-output-target 1.6.0 generates ([#300](https://github.com/kimen-dev/kimen/pull/300))
- **catalog:** emit dist reliably and declare a real exports map ([0be2a95d](https://github.com/kimen-dev/kimen/commit/0be2a95d))
- **catalog:** give each streamed node its own action path ([#185](https://github.com/kimen-dev/kimen/pull/185))
- **catalog:** re-check custom-element tag grammar in the renderers ([#186](https://github.com/kimen-dev/kimen/pull/186))
- **catalog:** fire bound actions on each control's declared activation event ([#189](https://github.com/kimen-dev/kimen/pull/189))
- **catalog:** keep guarded surfaces contained (spec 152) ([#513](https://github.com/kimen-dev/kimen/pull/513))
- **checkbox,switch:** boolean presence semantics survive hydration ([#29](https://github.com/kimen-dev/kimen/pull/29))
- **ci:** give the React wrapper publint/tsc tests an explicit timeout ([#181](https://github.com/kimen-dev/kimen/pull/181))
- **ci:** install Semgrep from a hash-locked lock, in release validation too ([#312](https://github.com/kimen-dev/kimen/pull/312))
- **deps:** renovate rejected the config the semgrep rule asked for ([#78](https://github.com/kimen-dev/kimen/pull/78), [#77](https://github.com/kimen-dev/kimen/issues/77))
- **deps:** node is a floor in this repository, and renovate was pinning it ([#85](https://github.com/kimen-dev/kimen/pull/85))
- **deps:** update dependency @nx/devkit to v23.1.1 ([#92](https://github.com/kimen-dev/kimen/pull/92))
- **deps:** close the three high osv advisories in transitives ([#104](https://github.com/kimen-dev/kimen/pull/104))
- **deps:** pin js-yaml and nanoid so the osv fixes survive lockfile regeneration ([#109](https://github.com/kimen-dev/kimen/pull/109))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.221 ([#133](https://github.com/kimen-dev/kimen/pull/133))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.222 ([#136](https://github.com/kimen-dev/kimen/pull/136))
- **deps:** update dependency @openai/codex to v0.146.1 ([#140](https://github.com/kimen-dev/kimen/pull/140))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.223 ([#142](https://github.com/kimen-dev/kimen/pull/142))
- **deps:** update sandbox toolchain ([#145](https://github.com/kimen-dev/kimen/pull/145))
- **deps:** update dependency astro to v7.2.0 ([#144](https://github.com/kimen-dev/kimen/pull/144))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.226 ([#147](https://github.com/kimen-dev/kimen/pull/147))
- **deps:** close the osv-scan critical and high advisories ([#182](https://github.com/kimen-dev/kimen/pull/182))
- **deps:** update sandbox toolchain ([#153](https://github.com/kimen-dev/kimen/pull/153))
- **deps:** update dependency @astrojs/starlight to v0.42.7 ([#137](https://github.com/kimen-dev/kimen/pull/137))
- **deps:** update dependency @stencil/react-output-target to v1.7.0 ([#158](https://github.com/kimen-dev/kimen/pull/158))
- **deps:** widen peer dependency ranges instead of pinning them ([#197](https://github.com/kimen-dev/kimen/pull/197))
- **deps:** pin dependencies ([#157](https://github.com/kimen-dev/kimen/pull/157))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.314 ([#201](https://github.com/kimen-dev/kimen/pull/201))
- **deps:** admit the dev-deps group's nx and esbuild builds and pin undici 7 ([#205](https://github.com/kimen-dev/kimen/pull/205))
- **deps:** update dependency @stencil/vue-output-target to v0.14.7 ([#202](https://github.com/kimen-dev/kimen/pull/202))
- **deps:** update dependency zod to v4.6.7 ([#203](https://github.com/kimen-dev/kimen/pull/203))
- **deps:** update dependency astro to v7.4.4 ([#214](https://github.com/kimen-dev/kimen/pull/214))
- **deps:** update dependency @astrojs/starlight to v0.42.8 ([#211](https://github.com/kimen-dev/kimen/pull/211))
- **deps:** update dependency @nx/devkit to v23.3.1 ([#212](https://github.com/kimen-dev/kimen/pull/212))
- **deps:** update dependency tslib to v2.9.1 ([#227](https://github.com/kimen-dev/kimen/pull/227))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.315 ([#228](https://github.com/kimen-dev/kimen/pull/228))
- **deps:** update dependency @anthropic-ai/claude-code to v2.1.316 ([#238](https://github.com/kimen-dev/kimen/pull/238))
- **deps:** update nx monorepo to v24 ([#240](https://github.com/kimen-dev/kimen/pull/240))
- **deps:** update dependency astro to v7.4.7 [security] ([#256](https://github.com/kimen-dev/kimen/pull/256))
- **deps:** update dependency @nx/devkit to v24.0.5 ([#252](https://github.com/kimen-dev/kimen/pull/252))
- **deps:** update sandbox toolchain ([#249](https://github.com/kimen-dev/kimen/pull/249))
- **deps:** update dependency @astrojs/starlight to v0.42.10 ([#272](https://github.com/kimen-dev/kimen/pull/272))
- **deps:** update dependency astro to v7.4.10 ([#247](https://github.com/kimen-dev/kimen/pull/247))
- **deps:** update sandbox toolchain ([#285](https://github.com/kimen-dev/kimen/pull/285))
- **deps:** update stencil output targets ([#288](https://github.com/kimen-dev/kimen/pull/288))
- **deps:** update dependency @nx/devkit to v24.0.6 ([#290](https://github.com/kimen-dev/kimen/pull/290))
- **deps:** update dependency @astrojs/starlight to v0.42.11 ([#336](https://github.com/kimen-dev/kimen/pull/336))
- **deps:** stop Renovate editing the hash-locked Semgrep lock ([#338](https://github.com/kimen-dev/kimen/pull/338))
- **deps:** update dependency @openai/codex to v0.169.0 ([#507](https://github.com/kimen-dev/kimen/pull/507))
- **dialog:** boolean presence semantics for close-on-backdrop ([#31](https://github.com/kimen-dev/kimen/pull/31))
- **elements:** ship ESM-only; make public types node16-resolvable ([e32a626a](https://github.com/kimen-dev/kimen/commit/e32a626a))
- **elements:** declare @kimen/tokens workspace dependency for the theming suite ([d23e9b1c](https://github.com/kimen-dev/kimen/commit/d23e9b1c))
- **elements:** anchor the tab start point in the card focus-delegation test ([#54](https://github.com/kimen-dev/kimen/pull/54))
- **elements:** a disabled radio group now looks disabled ([#67](https://github.com/kimen-dev/kimen/pull/67))
- **elements:** the pressed state was unreachable CSS for keyboard users ([#68](https://github.com/kimen-dev/kimen/pull/68))
- **elements:** hover paint that a touch screen cannot take back ([#69](https://github.com/kimen-dev/kimen/pull/69))
- **elements:** bound the animation-settle waits to the remaining test deadline ([#107](https://github.com/kimen-dev/kimen/pull/107))
- **elements:** skip the park hover when the top layer covers the probe ([#112](https://github.com/kimen-dev/kimen/pull/112))
- **elements:** keep the managed ki-tabs tab slot out of the agent surfaces ([#198](https://github.com/kimen-dev/kimen/pull/198))
- **elements:** pressed paints from rest in every input modality ([#71](https://github.com/kimen-dev/kimen/pull/71), [#242](https://github.com/kimen-dev/kimen/pull/242))
- **elements:** close the accessibility gaps axe cannot see ([#258](https://github.com/kimen-dev/kimen/pull/258))
- **elements:** resolve children read by property and survive a move in the document ([#311](https://github.com/kimen-dev/kimen/pull/311))
- **elements:** align six components with their Figma masters and show disabled under forced colors ([#325](https://github.com/kimen-dev/kimen/pull/325))
- **elements:** make components and the browser suite work in Firefox and WebKit ([#326](https://github.com/kimen-dev/kimen/pull/326))
- **elements:** dim the ki-select label when disabled, and follow hover and focus ([#350](https://github.com/kimen-dev/kimen/pull/350))
- **elements:** let ki-input shrink with narrow columns ([#348](https://github.com/kimen-dev/kimen/pull/348), [#417](https://github.com/kimen-dev/kimen/pull/417))
- **elements:** keep composed shadow layers when a theme sets an effect to none ([#349](https://github.com/kimen-dev/kimen/pull/349), [#419](https://github.com/kimen-dev/kimen/pull/419))
- **elements:** centre the touch target on the painted control ([#427](https://github.com/kimen-dev/kimen/pull/427), [#432](https://github.com/kimen-dev/kimen/pull/432))
- **elements:** keep component glyphs in sideEffects-honouring bundles ([#524](https://github.com/kimen-dev/kimen/pull/524))
- **elements:** keep a carousel move through a resize observation ([#533](https://github.com/kimen-dev/kimen/pull/533))
- **elements:** Firefox and WebKit release failures in ki-toaster, ki-toast, ki-checkbox-group and the landing ([#538](https://github.com/kimen-dev/kimen/pull/538))
- **gates:** comment-proof traceability and biome-exempt generated artifacts ([3c5da1e9](https://github.com/kimen-dev/kimen/commit/3c5da1e9))
- **gates:** biome respects .gitignore and tool-owned nx.json ([a49ae951](https://github.com/kimen-dev/kimen/commit/a49ae951))
- **gates:** pnpm 11 private store and cross-device docs builds ([#179](https://github.com/kimen-dev/kimen/pull/179))
- **gates:** build every project before the dependency gate's lint ([#196](https://github.com/kimen-dev/kimen/pull/196))
- **gates:** designate a cross-device TMPDIR for gate runs on macOS ([#327](https://github.com/kimen-dev/kimen/pull/327))
- **gates:** stop scenario-families reading present IDs as missing ([#537](https://github.com/kimen-dev/kimen/pull/537))
- **ki-button:** show the disabled state of a quaternary button ([#293](https://github.com/kimen-dev/kimen/pull/293))
- **ki-select:** open the list in the top layer so clipping ancestors cannot cut it ([#277](https://github.com/kimen-dev/kimen/pull/277))
- **ki-tooltip:** open the bubble in the top layer so clipping ancestors cannot cut it ([#286](https://github.com/kimen-dev/kimen/pull/286))
- **ki-tooltip:** open the bubble next to its trigger under a transformed ancestor in Firefox ([#328](https://github.com/kimen-dev/kimen/pull/328))
- **mutation:** derive generated exclusions from the sync contract ([#244](https://github.com/kimen-dev/kimen/pull/244))
- **mutation:** run the component behaviour contracts in the weekly elements mutation ([#254](https://github.com/kimen-dev/kimen/pull/254))
- **release:** repair packaging, the consumer contract, licences and the provenance allowlist ([#307](https://github.com/kimen-dev/kimen/pull/307))
- **renovate:** name the dev group's branch so docs can deploy it, and run the validator on Node 24 ([#335](https://github.com/kimen-dev/kimen/pull/335))
- **review:** use dedicated Check Run App ([#35](https://github.com/kimen-dev/kimen/pull/35))
- **sandbox:** loops mount a dedicated local clone, not a worktree ([bb833902](https://github.com/kimen-dev/kimen/commit/bb833902))
- **sandbox:** invoke loop-entry via explicit interpreter; device-auth login ([ca30727e](https://github.com/kimen-dev/kimen/commit/ca30727e))
- **sandbox:** COPY --chmod=755 for scripts the node user must read ([1f05bb0d](https://github.com/kimen-dev/kimen/commit/1f05bb0d))
- **sandbox:** bake pnpm into the image via corepack at build time ([8072ce90](https://github.com/kimen-dev/kimen/commit/8072ce90))
- **sandbox:** local git identity for loop commits ([8275c36c](https://github.com/kimen-dev/kimen/commit/8275c36c))
- **sandbox:** IPv4-first DNS, Playwright prss CDN host, IPv6 default-deny ([23d2e49c](https://github.com/kimen-dev/kimen/commit/23d2e49c))
- **sandbox:** format before verdict and always-fetchable loop snapshots ([5e3c5eb7](https://github.com/kimen-dev/kimen/commit/5e3c5eb7))
- **sandbox:** create loop lock directories with mkdir(2), not /bin/mkdir ([#273](https://github.com/kimen-dev/kimen/pull/273))
- **security:** supply-chain hardening flagged by the semgrep gate; trufflehog flag ([848c0c45](https://github.com/kimen-dev/kimen/commit/848c0c45))
- **security:** minimumReleaseAge on every renovate packageRules entry ([cd25bb08](https://github.com/kimen-dev/kimen/commit/cd25bb08))
- **security:** make the OSV scan green again: lock Semgrep 1.185.0, ignore its unreachable advisories ([#331](https://github.com/kimen-dev/kimen/pull/331))
- **site:** align site with approved design ([#128](https://github.com/kimen-dev/kimen/pull/128))
- **site:** match hero reference details ([#130](https://github.com/kimen-dev/kimen/pull/130))
- **site:** bound the vendored font staleness window to seven days ([#138](https://github.com/kimen-dev/kimen/pull/138))
- **site:** hold production analytics behind a repository variable ([#180](https://github.com/kimen-dev/kimen/pull/180))
- **site:** name the brand link with its visible text ([#233](https://github.com/kimen-dev/kimen/pull/233))
- **site:** make the privacy page true and stop soft 404s ([#526](https://github.com/kimen-dev/kimen/pull/526))
- **site:** keep docs navigation below 1440 px and fix the hero spine and dock ([#528](https://github.com/kimen-dev/kimen/pull/528))
- **site:** live-review fixes for kimen.dev , P2 and P3 ([#520](https://github.com/kimen-dev/kimen/pull/520), [#529](https://github.com/kimen-dev/kimen/pull/529))
- **tests:** close the pid-file truncation race behind the S4 flake ([#139](https://github.com/kimen-dev/kimen/pull/139), [#106](https://github.com/kimen-dev/kimen/issues/106))
- **tokens:** remove unbuilt css/mars export ([fc8b5e88](https://github.com/kimen-dev/kimen/commit/fc8b5e88))
- **tokens:** strict-index guards in theming spec and true-primary material3 brand.600 ([72b87971](https://github.com/kimen-dev/kimen/commit/72b87971))
- **tokens:** resolve size-limit via its own devDependency ([6329bd22](https://github.com/kimen-dev/kimen/commit/6329bd22))
- **tokens:** address clean-context review round 1 ([7d7c99cd](https://github.com/kimen-dev/kimen/commit/7d7c99cd))
- **tokens:** sync generated dark scheme selectors ([33bffd05](https://github.com/kimen-dev/kimen/commit/33bffd05))
- **tokens:** close the prefers-color-scheme media block in generated dark CSS ([#3](https://github.com/kimen-dev/kimen/pull/3))
- **tokens:** the control-boundary role — a control that can be empty gets an edge you can see ([#64](https://github.com/kimen-dev/kimen/pull/64))
- **tokens:** the overlay sweep built its own pattern out of data it reads ([#72](https://github.com/kimen-dev/kimen/pull/72))
- ⚠️  **tokens:** let the host scheme win and give material3 dark its tones ([#262](https://github.com/kimen-dev/kimen/pull/262))
- **tooltip:** reserve the offset gap in the flip decision ([#28](https://github.com/kimen-dev/kimen/pull/28))
- **tooltip:** preserve consumer-authored trigger aria-description ([#30](https://github.com/kimen-dev/kimen/pull/30))
- **wrappers:** track the new Angular boolean-attribute output ([#234](https://github.com/kimen-dev/kimen/pull/234))
