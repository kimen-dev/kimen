# @kimen/adapter-a2ui: protocol compatibility matrix

Constitution Art. VIII: each adapter declares the exact protocol version(s) it
supports, versioned with the adapter. A protocol's breaking release is
absorbed here and never forces a core change; an adapter that cannot absorb it
is retired.

This file is the human-readable projection of the machine-readable matrix in
`src/coverage.ts` (`A2UI_PROTOCOLS`, `SUPPORTED_A2UI_VERSIONS`,
`A2UI_RENDERER_CAPABILITIES`, and per version the catalog ids, coverage
matrix, evaluated functions and `A2UI_CLIENT_FUNCTION_ALLOWLIST`). The
`coverage.spec.ts` (spec 029, scenario S6) and `v1.spec.ts` (spec 039,
scenarios S16 and S17) suites fail if this file and the code drift, and if
any mapped catalog counterpart leaves the generated catalog (Art. I).

## Supported A2UI protocol versions

The adapter speaks two A2UI versions side by side (spec 039). **1.0** is the
preferred version (upstream status `current`); **0.9.1** stays supported
(upstream status `previous`). Both are pinned to exact commits of
[github.com/google/A2UI](https://github.com/google/A2UI) (also served as
`github.com/a2ui-project/a2ui`). v0.8 (deprecated upstream) is not supported.

| Adapter version | A2UI specification | Status    | Upstream commit                            | Accepted envelope `version` | Emitted `version` |
| --------------- | ------------------ | --------- | ------------------------------------------ | --------------------------- | ----------------- |
| 0.0.0           | 1.0                | preferred | `57f961f143da23f4212313e432a64b5843d978f9` | `1.0`                       | `1.0`             |
| 0.0.0           | 0.9.1              | previous  | `85120b91e2fe94cb20c8ddef0b545d3da2ae161f` | `v0.9.1`, `v0.9`            | `v0.9.1`          |

- **1.0** is implemented from `specification/v1_0/` (protocol and schemas)
  and `catalogs/basic/v1/` (basic catalog). Upstream has no git tag for the
  1.0 specification, and one breaking change (#4044, `@`-prefixed component
  envelope keys) landed after its stable stamp, hence the commit pin.
- **0.9.1** is implemented from `specification/v0_9_1/`. It is
  payload-compatible with v0.9 (`docs/evolution_guide.md` §3), so `v0.9` and
  `v0.9.1` envelopes form one family.

**Dispatch by version.** The adapter reads the envelope `version` first and
validates the message against the shapes of that version only
(`agent_to_renderer.json` for 1.0, `server_to_client.json` for 0.9.1, with
`additionalProperties: false` at every level). Any other value, `v1.0`
included (1.0 envelopes carry the bare `"1.0"`), or a message without
`version` (such as a v0.8 `beginRendering`) is rejected naming the supported
set: `1.0`, `v0.9.1`, `v0.9`.

**No mixing.** A message may only use its own version's vocabulary: a 0.9.1
message carrying `@path`, `@checks` or inline `components`, and a 1.0 message
carrying `{ "path" }`, bare `checks` or `accessibility`, or `theme`, are
rejected. The upstream transition rule that lets renderers accept legacy bare
keys on 1.0 components is not adopted. A surface is bound to the version
family of its `createSurface`: a later message for it in the other family is
rejected (`version-mismatch`), and client-to-server messages for it are
written in its version. Surface ids are one namespace across versions.

**Messages.** 0.9.1: `createSurface`, `updateComponents`, `updateDataModel`,
`deleteSurface` (server to client); `action`, and `error` with code
`VALIDATION_FAILED` (client to server). 1.0 adds, agent to renderer,
`callRendererFunction` (always refused, see the 1.0 client functions) and
`agentFunctionResponse` (rejected as `unexpected-message`: the adapter never
calls agent functions); renderer to agent, `rendererFunctionResponse` (only
as that refusal).

**Catalogs.** A 1.0 surface (its default `catalogId`, every component
`@catalogId` and every function-call `catalogId`) may only name the 1.0 basic
catalog:

- `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`

A 0.9.1 `createSurface` must name one of these ids; both designate the 0.9.1
basic catalog (`catalog.json` declares the first, `docs/a2ui_protocol.md`
writes the second):

- `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`
- `https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json`

Any other `catalogId` is rejected (`unsupported-catalog`); a 1.0 component
with no `@catalogId` on a surface created without a default `catalogId` is
rejected (`unresolved-catalog`). Kimen publishes no A2UI catalog of its own
yet and advertises no inline catalogs, so its components outside the basic
catalog (badge, alert, progress and others) are not reachable through A2UI
until a Kimen catalog with its own id and schema document exists.

**Renderer capabilities.** `A2UI_RENDERER_CAPABILITIES` lists what a host
transport attaches, preferred version first: under the metadata key
`a2uiRendererCapabilities`, `{ "1.0": { "supportedCatalogIds": [1.0 basic] } }`;
under `a2uiClientCapabilities`, `{ "v0.9": { "supportedCatalogIds": [0.9.1
basic ids] } }`. The A2UI MIME type is a transport concern: 1.0 names it
`application/a2ui+json`, 0.9.1 `application/json+a2ui`.

## Component-type coverage

This table is the **A2UI 0.9.1** matrix (spec 029); the 1.0 matrix is under
[A2UI 1.0](#a2ui-10) below.

`mapped` types render as the listed `ki-*` components. `unmapped` types degrade
per node to a fixed fallback that carries no agent-supplied content
(scenarios S4/S11). A type outside the basic catalog degrades the same way.
`forbidden` types reject the whole message on security grounds (scenario S7).
A property the basic catalog does not declare for the type rejects the
message (`unknown-property`, scenario S9).

| A2UI type     | Coverage  | Catalog counterpart           |
| ------------- | --------- | ----------------------------- |
| Text          | mapped    | ki-markdown                   |
| Row           | mapped    | ki-stack                      |
| Column        | mapped    | ki-stack                      |
| List          | mapped    | ki-list, ki-list-item         |
| Card          | mapped    | ki-card                       |
| Tabs          | mapped    | ki-tabs, ki-tab, ki-tab-panel |
| Divider       | mapped    | ki-divider                    |
| Button        | mapped    | ki-button                     |
| TextField     | mapped    | ki-input, ki-textarea         |
| CheckBox      | mapped    | ki-checkbox                   |
| ChoicePicker  | mapped    | ki-radio-group, ki-radio, ki-checkbox-group, ki-checkbox |
| Image         | mapped    | ki-image                      |
| Icon          | mapped    | ki-icon                       |
| Video         | unmapped  | —                             |
| AudioPlayer   | unmapped  | —                             |
| Modal         | mapped    | ki-button, ki-dialog          |
| Slider        | mapped    | ki-slider                     |
| DateTimeInput | unmapped  | —                             |
| html          | forbidden | —                             |
| RawHtml       | forbidden | —                             |
| script        | forbidden | —                             |
| iframe        | forbidden | —                             |

Row maps to `ki-stack direction="row"` and Column uses the default column
stack. Both retain their children in order at every depth. An empty root
uses the `ki-card` fallback to satisfy the guarded renderer's single root
requirement.

Content `Text` in both dialects passes its resolved source as a text node
to `ki-markdown`. Markdown links use Kimen's URL policy, images are disabled,
and raw HTML inside the source appears as literal text. Text used in button
and modal trigger labels stays literal. The `html` and `RawHtml` component
types still reject the whole message.

## Client functions

A2UI 0.9.1. Dynamic values (`DynamicString`, `DynamicNumber` and the rest)
may be literals, `{ "path": … }` bindings or function calls. Bindings and the
data model (`updateDataModel` upsert and removal, `ChildList` templates with
relative paths) are resolved inside the adapter. The functions of the basic
catalog are handled as follows:

| Function       | Handling  |
| -------------- | --------- |
| formatString   | evaluated |
| formatNumber   | evaluated |
| formatCurrency | evaluated |
| pluralize      | evaluated |
| formatDate     | degrades  |
| required       | degrades  |
| regex          | degrades  |
| length         | degrades  |
| numeric        | degrades  |
| email          | degrades  |
| and            | degrades  |
| or             | degrades  |
| not            | degrades  |
| openUrl        | forbidden |

`evaluated` functions are pure and read only the surface's data model.
`formatString` interpolates `${/absolute}` and `${relative}` paths; an
expression with a nested function call degrades. A component whose value
needs a `degrades` function, or any function outside the basic catalog,
renders the declared fallback and is reported with reason
`unsupported-function` (scenario S18). `openUrl` reaches a browser capability:
in a value or in an `Action.functionCall` it rejects the whole message
(`forbidden-function`, scenario S17). The client-function allowlist for
`Action.functionCall` is empty by design; widening it is a security decision
recorded here and in spec 029. Component `checks` are accepted and not
evaluated.

## Lossy mappings

A2UI 0.9.1 (the 1.0 differences are under [A2UI 1.0](#a2ui-10)).

- `Text.variant` (h1 to h5, caption): the text renders without heading or
  caption semantics.
- Row and Column map `justify` values `start`, `center`, `end` and
  `spaceBetween` (as `between`). They map `align` values `start`, `center`,
  `end`, `stretch` and `baseline`. Other values keep the stack defaults.
- A2UI `weight` has no representation in the guarded catalog's child slots.
  Authors using HTML can opt a direct stack child into growth with `data-grow`.
- `List.direction` and `align`: not rendered; each child becomes a
  `ki-list-item`.
- `Image.url` becomes `ki-image` `src` and passes through the guarded URL
  policy. `accessibility.label` supplies the alternative text and
  `accessibility.hidden: true` marks the image as decorative. An informative
  image with a missing or blank label uses the per-node fallback and reports
  `missing-image-alt`. `cover` and `contain` pass through to `fit`. Other fit
  values and the `variant` size hint use the `ki-image` defaults.
- `Button.variant`: `primary` becomes `variant="primary"`, `borderless`
  becomes `variant="ghost"`, `default` keeps the catalog default.
- `Modal`: a `Button` or `Text` trigger opens a `ki-dialog` using
  `show-modal`. The referenced content becomes the dialog body and a
  `Close` button in the footer dismisses it. The heading uses the trigger's
  resolved text or defaults to `Dialog`. An empty trigger label defaults to
  `Open dialog`. Other trigger types degrade (`unsupported-variant`).
  An explicitly declared Button action is still relayed.
- `TextField.variant`: `longText` becomes `ki-textarea`, `obscured` becomes
  `ki-input type="password"`, `number` and `shortText` become `ki-input`;
  `validationRegexp` is not evaluated.
- `Slider` maps the label, limits and current value to `ki-slider` and uses
  the component's default step.
- `ChoicePicker`: `mutuallyExclusive` becomes `ki-radio-group` with the first
  selected value. `multipleSelection` becomes a `ki-checkbox-group` with
  a checkbox per option and checked states from the selected value list.
  Provide a label to name either group. An unlabeled multiple-selection
  picker uses the accessible fallback. `displayStyle` and `filterable`
  are not rendered.
- `Image` consumes the accessibility label and hidden flag. All types
  accept the remaining accessibility metadata. `createSurface.theme` is
  accepted and appearance stays token-driven (Art. VI).
- `Icon.name` accepts static names and bindings in both versions. The host
  imports each Lucide module that its surface uses. For example, `check`
  uses `@kimen/elements/icons/check` and `warning` uses
  `@kimen/elements/icons/triangle-alert`. Other strings pass through as Lucide
  names. A binding without a value contributes no glyph while the model loads. The
  guarded renderer rejects an unavailable name and preserves the previous
  surface. The `svgPath` form uses the fixed fallback with reason
  `unsupported-variant`. Icons from the adapter are decorative. [Name mappings](src/translate.ts)

## A2UI 1.0

The 1.0 basic catalog has the same 18 component types and the same 14
functions as 0.9.1, and the adapter maps them the same way: a 1.0 description
and its 0.9.1 equivalent render the same catalog components (spec 039 S2).
Every 1.0 component may carry the envelope keys `id`, `component`,
`@catalogId`, `@accessibility`, `@metadata` and `weight`; `Checkable` types
(Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput) also take
`@checks`. Any other property rejects the message (`unknown-property`).

### A2UI 1.0 type coverage

| A2UI type     | Coverage  | Catalog counterpart           |
| ------------- | --------- | ----------------------------- |
| Text          | mapped    | ki-markdown                   |
| Row           | mapped    | ki-stack                      |
| Column        | mapped    | ki-stack                      |
| List          | mapped    | ki-list, ki-list-item         |
| Card          | mapped    | ki-card                       |
| Tabs          | mapped    | ki-tabs, ki-tab, ki-tab-panel |
| Divider       | mapped    | ki-divider                    |
| Button        | mapped    | ki-button                     |
| TextField     | mapped    | ki-input, ki-textarea         |
| CheckBox      | mapped    | ki-checkbox                   |
| ChoicePicker  | mapped    | ki-radio-group, ki-radio, ki-checkbox-group, ki-checkbox |
| Image         | mapped    | ki-image                      |
| Icon          | mapped    | ki-icon                       |
| Video         | unmapped  | —                             |
| AudioPlayer   | unmapped  | —                             |
| Modal         | mapped    | ki-button, ki-dialog          |
| Slider        | mapped    | ki-slider                     |
| DateTimeInput | unmapped  | —                             |
| html          | forbidden | —                             |
| RawHtml       | forbidden | —                             |
| script        | forbidden | —                             |
| iframe        | forbidden | —                             |

The type `Surface` is reserved by 1.0 for the implicit surface container: a
component of that type rejects the message (`reserved-type`). Composition
constraints (`allowedParents`, `allowedChildren`) never apply: the 1.0 basic
catalog declares none, so `UNALLOWED_PARENT` and `UNALLOWED_CHILD` are never
reported.

### A2UI 1.0 client functions

Bindings are `{ "@path": … }` and function calls `{ "@call": …, "args": …,
"catalogId": … }` (no `returnType` on the wire). Where a `DynamicValue` is
expected (an action context), a plain object is a literal: its `@@x` keys
unescape to `@x`, and an unknown single-`@` key anywhere inside it rejects the
message (`reserved-key`), as it does in any 1.0 value.

| Function       | Handling  |
| -------------- | --------- |
| formatString   | evaluated |
| formatNumber   | evaluated |
| formatCurrency | evaluated |
| pluralize      | evaluated |
| @index         | evaluated |
| formatDate     | degrades  |
| required       | degrades  |
| regex          | degrades  |
| length         | degrades  |
| numeric        | degrades  |
| email          | degrades  |
| and            | degrades  |
| or             | degrades  |
| not            | degrades  |
| openUrl        | forbidden |

`@index` returns the 0-based index of the innermost list-template item plus
its optional `offset`; outside a template it rejects the message. A component
whose value needs a `degrades` function, or a function outside the basic
catalog, renders the declared fallback (`unsupported-function`). The adapter
never routes such a function to the agent with `callAgentFunction`, a
deliberate departure from the 1.0 "fallback to agent RPC" rule (spec 039
S15). `openUrl` (`requiresUserActivation: true` in 1.0) rejects the whole
message in a value, an action context or an `Action.functionCall`; the
`Action.functionCall` allowlist stays empty. Every `callRendererFunction` is
answered with a `rendererFunctionResponse` carrying the error code
`INVALID_FUNCTION_CALL` (through `onFunctionResponse`): no basic-catalog
function is agent-callable (`allowedCallers` defaults to `rendererOnly`).

### A2UI 1.0 lossy mappings

- `createSurface` may carry `components` and `dataModel`: they apply with the
  creation, atomically (a rejected creation creates nothing).
  `createSurface.metadata` is accepted and ignored; `theme` no longer exists
  and is rejected.
- `updateDataModel.value` is required; `null` removes the key at `path`
  (the whole model at `/`).
- `Action.event.userMessage` resolves into the `action` event's
  `userMessage`.
- `TextField.placeholder` becomes the `placeholder` of `ki-input` or
  `ki-textarea`; `TextField.variant` maps as in 0.9.1; `validationRegexp` no
  longer exists (`@checks` with `regex`).
- `Image` reads its label and hidden flag from `@accessibility`. The
  remaining `@accessibility` attributes and `@metadata` are accepted as
  metadata. The adapter accepts `@checks` without evaluating them.
- `Text.variant` (`caption`, `body`; 1.0 dropped the headings), `weight`,
  `Video.posterUrl`: not rendered.
- `Slider.steps` divides the span into the requested number of intervals.
  Both versions map the label, limits and value. Slider edits stay local
  to the rendered control.
- `sendDataModel` metadata travels under `a2uiRendererDataModel` with
  `version: "1.0"`.
- The remaining 0.9.1 lossy mappings apply unchanged.

## Declared gaps

- **User input does not flow back into the data model.** The adapter keeps
  edits to `TextField`, `CheckBox`, `ChoicePicker` and `Slider` local to the
  rendered control. An A2UI action's context and the `sendDataModel` metadata
  use the values the agent last set. Model writeback requires an adapter
  input channel.
- **Full re-render per update.** Every accepted `updateComponents` or
  `updateDataModel` re-renders the whole surface through `renderUiSpec`, so
  scroll, focus and in-progress input are lost, and degradations are
  reported on each render. The call lives in one module
  (`src/render-point.ts`) so an incremental renderer can replace it there.
- **Declared action set.** Pass `actions` to declare it up front. Otherwise
  the first successful render that binds an action freezes the set for the
  surface (scenario S8), and a later update binding a new action name is
  rejected.
- **Surface deletion.** `deleteSurface` drops the adapter's state; the host
  owns the teardown of the surface element.
- **Native primitives (spec 037).** The adapter uses Kimen components for
  text content, layout and images. Hosts can use native primitives when
  they author a surface directly through the neutral catalog.
- **1.0 accessibility attributes.** 1.0 asks renderers to plumb
  `@accessibility` (label, description, live, hidden). The adapter maps
  `Image` label and hidden into the element's image-specific API. Wider
  support awaits a neutral accessibility channel in the catalog.
- **No agent function calls.** The adapter neither answers
  `callRendererFunction` with a result nor issues `callAgentFunction`.
