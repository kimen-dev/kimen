# @kimen/adapter-a2ui: protocol compatibility matrix

Constitution Art. VIII: each adapter declares the exact protocol version(s) it
supports, versioned with the adapter. A protocol's breaking release is
absorbed here and never forces a core change; an adapter that cannot absorb it
is retired.

This file is the human-readable projection of the machine-readable matrix in
`src/coverage.ts` (`A2UI_SPEC_VERSION`, `SUPPORTED_A2UI_VERSIONS`,
`A2UI_BASIC_CATALOG_IDS`, `A2UI_COVERAGE`, `A2UI_EVALUATED_FUNCTIONS`,
`A2UI_CLIENT_FUNCTION_ALLOWLIST`). The `coverage.spec.ts` suite (scenario S6)
fails if this file and the code drift, and if any mapped catalog counterpart
leaves the generated catalog (Art. I).

## Supported A2UI protocol versions

The adapter implements the A2UI specification **0.9.1** (status `current` in
the spec's `versions.json`), as published in `specification/v0_9_1/` of
[github.com/google/A2UI](https://github.com/google/A2UI) (also served as
`github.com/a2ui-project/a2ui`) at commit
`85120b91e2fe94cb20c8ddef0b545d3da2ae161f`. v0.8 (legacy) and the v1.0
release candidate are not supported.

| Adapter version | A2UI specification | Accepted envelope `version` | Emitted `version` |
| --------------- | ------------------ | --------------------------- | ----------------- |
| 0.0.0           | 0.9.1              | `v0.9.1`, `v0.9`            | `v0.9.1`          |

Every server message must carry `"version"` with one of the accepted values,
exactly the enum of the v0.9.1 `server_to_client.json`: v0.9.1 is
payload-compatible with v0.9 (`docs/evolution_guide.md` §3). Any other value,
or a message without `version` (such as a v0.8 `beginRendering`), is rejected
naming the supported set (scenario S5). Client-to-server messages (`action`,
`error`) and the `a2uiClientDataModel` metadata are written with `v0.9.1`.

Messages: `createSurface`, `updateComponents`, `updateDataModel` and
`deleteSurface` (server to client); `action`, and `error` with code
`VALIDATION_FAILED` (client to server). Envelopes are checked with the
schema's `additionalProperties: false`. A `createSurface` must name one of
these catalog ids; both designate the basic catalog (`catalog.json` declares
the first, `docs/a2ui_protocol.md` writes the second):

- `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`
- `https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json`

Any other `catalogId` is rejected (`unsupported-catalog`). Kimen publishes no
A2UI catalog of its own yet, so its components outside the basic catalog
(badge, alert, progress and others) are not reachable through A2UI until a
Kimen catalog with its own id and schema document exists.

## Component-type coverage

`mapped` types render as the listed `ki-*` components. `inline` types carry no
element of their own: their resolved string becomes inert text in the parent
slot. `layout` types render no element: their children join the parent slot
in order. `unmapped` types degrade per node to a fixed fallback that carries no
agent-supplied content (scenarios S4/S11); a type outside the basic catalog
degrades the same way. `forbidden` types reject the whole message on security
grounds (scenario S7). A property the basic catalog does not declare for the
type rejects the message (`unknown-property`, scenario S9).

| A2UI type     | Coverage  | Catalog counterpart           |
| ------------- | --------- | ----------------------------- |
| Text          | inline    | —                             |
| Row           | layout    | —                             |
| Column        | layout    | —                             |
| List          | mapped    | ki-list, ki-list-item         |
| Card          | mapped    | ki-card                       |
| Tabs          | mapped    | ki-tabs, ki-tab, ki-tab-panel |
| Divider       | mapped    | ki-divider                    |
| Button        | mapped    | ki-button                     |
| TextField     | mapped    | ki-input, ki-textarea         |
| CheckBox      | mapped    | ki-checkbox                   |
| ChoicePicker  | mapped    | ki-radio-group, ki-radio      |
| Image         | unmapped  | —                             |
| Icon          | unmapped  | —                             |
| Video         | unmapped  | —                             |
| AudioPlayer   | unmapped  | —                             |
| Modal         | unmapped  | —                             |
| Slider        | unmapped  | —                             |
| DateTimeInput | unmapped  | —                             |
| html          | forbidden | —                             |
| RawHtml       | forbidden | —                             |
| script        | forbidden | —                             |
| iframe        | forbidden | —                             |

When the component `root` translates to anything other than one catalog node
(a `Column` or `Row` root with several children, or a `Text` root), the
adapter wraps it in `ki-card`: the guarded renderer renders a single root
node and the catalog has no neutral layout element yet.

## Client functions

Dynamic values (`DynamicString`, `DynamicNumber` and the rest) may be
literals, `{ "path": … }` bindings or function calls. Bindings and the data
model (`updateDataModel` upsert and removal, `ChildList` templates with
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

- `Text.variant` (h1 to h5, caption): the text renders without heading or
  caption semantics.
- `Row`/`Column` `justify` and `align`, and `weight` on any component: not
  rendered; the order of children is kept.
- `List.direction` and `align`: not rendered; each child becomes a
  `ki-list-item`.
- `Button.variant`: `primary` becomes `variant="primary"`, `borderless`
  becomes `variant="ghost"`, `default` keeps the catalog default.
- `TextField.variant`: `longText` becomes `ki-textarea`, `obscured` becomes
  `ki-input type="password"`, `number` and `shortText` become `ki-input`;
  `validationRegexp` is not evaluated.
- `ChoicePicker`: `mutuallyExclusive` becomes `ki-radio-group` with the first
  selected value; `multipleSelection` degrades (reason `unsupported-variant`);
  `displayStyle` and `filterable` are not rendered.
- `accessibility` is accepted and not rendered; `createSurface.theme` is
  accepted and ignored (appearance stays token-driven, Art. VI).

## Declared gaps

- **User input does not flow back into the data model.** The guarded renderer
  exposes only click activations, so typing into a `TextField` or toggling a
  `CheckBox` does not update the adapter's data model; an action's context and
  the `sendDataModel` metadata carry the values the agent last set. Closing
  this needs an input channel in `@kimen/catalog`.
- **Full re-render per update.** Every accepted `updateComponents` or
  `updateDataModel` re-renders the whole surface through `renderUiSpec`, so
  scroll, focus and in-progress input are lost. The call lives in one module
  (`src/render-point.ts`) so an incremental renderer can replace it there.
- **Declared action set.** Pass `actions` to declare it up front. Otherwise
  the first successful render that binds an action freezes the set for the
  surface (scenario S8), and a later update binding a new action name is
  rejected.
- **Surface deletion.** `deleteSurface` drops the adapter's state; the host
  owns the teardown of the surface element.
