# The UI-spec format

A UI spec is the neutral JSON document an agent emits to describe a Kimen
surface: which catalog components to render, with which props, in which slots,
bound to which declared actions. It is **data, never code** — validation and
rendering never execute, evaluate or interpret spec content. The format is
protocol-free by contract: no A2UI, MCP Apps, AG-UI or json-render vocabulary
appears in it. Protocol adapters ([A2UI](./a2ui-host.md),
[MCP Apps](./mcp-apps.md)) translate their wire formats *into* this document;
the document itself outlives them.

Everything in this guide is implemented by
[`@kimen/catalog`](../../packages/catalog/README.md): `validateUiSpec` accepts
or rejects a spec against the generated catalog, `renderUiSpec` renders an
accepted spec through the guarded renderer, and `createStreamingRenderer`
renders a spec that arrives in chunks.

## The document

```json
{
  "version": 1,
  "actions": ["confirm-order"],
  "root": {
    "component": "ki-card",
    "slots": {
      "header": ["Confirm your order"],
      "": ["Your order total is $42.00."],
      "footer": [
        {
          "component": "ki-button",
          "props": { "variant": "primary" },
          "action": "confirm-order",
          "slots": { "": ["Confirm"] }
        }
      ]
    }
  }
}
```

Three top-level fields:

- **`version`** — the literal number `1`. Anything else is rejected as
  malformed.
- **`actions`** — optional. The complete list of action names any node in the
  tree may bind. A binding to a name outside this list is rejected
  (`undeclared-action`); an adapter or host treats the list as the closed
  interaction contract of the surface.
- **`root`** — the single root node of the component tree.

Each **node** has up to six fields:

- **`id`** — optional. A stable identity for the node: lowercase ASCII
  letters and digits, then up to 63 of those, `-` or `_`
  (`^[a-z0-9][a-z0-9_-]{0,63}$`), unique in the document. A malformed id is
  rejected (`invalid-id`), a repeated one too (`duplicate-id`). Renderers
  never write it to the DOM; it is the address a live surface's operations
  target (see [Live surface](#live-surface)). Catalog schema `1.1.0`.
  A prop the catalog marks `format: "idref"` (a menu's `anchor`, a popover's
  or tooltip's `for`, a copy button's `from`, …) names another node by this
  id, and only a node of the same spec or live surface: any other value is
  rejected (`invalid-reference`). The renderer gives the named node a DOM id
  of its own, so a reference never reaches an element of the host page.
  Catalog schema `1.6.0`.
- **`component`** — a catalog tag (`ki-button`, `ki-card`, …). A tag outside
  the catalog is rejected (`unknown-component`); there is no escape hatch to
  arbitrary elements.
- **`props`** — optional. Scalar values only (`boolean | number | string`),
  keyed by the attribute name the catalog declares. Unknown names are rejected
  (`unknown-prop`), wrong-typed values are rejected (`invalid-prop-type`), and
  enum-constrained props accept only their declared values. That includes
  `ki-alert` and `ki-toast` `tone` and `ki-toaster` `placement`: their
  elements accept any string in markup, but in a spec they are enums like
  every other `tone`, `variant` and `placement` (spec 164).
- **`action`** — optional. One name from the document's `actions` list, or
  an object that maps events the component's catalog entry declares to names
  from that list (see [An action per event](#an-action-per-event), catalog
  schema `1.8.0`). When the rendered node is activated, the host receives
  that name — as data, on a single callback channel — never a code payload.
- **`collect`** — optional, and only on a node with an `action`. The other
  fields the action carries: each key names an entry of the action data, each
  value is the `id` of a node of the same spec (see [A form](#a-form)).
  Catalog schema `1.7.0`.
- **`slots`** — optional. Children per slot name, where `""` is the default
  slot. Each child is either a nested node or a plain string; strings become
  inert text nodes, never parsed as markup. A slot name the component does not
  declare is rejected (`unknown-slot`).

### A form

A spec has no native form. A bound button names the fields its action takes,
and the fields need no action of their own:

```json
{
  "version": 1,
  "actions": ["add"],
  "root": {
    "component": "div",
    "slots": {
      "": [
        { "id": "f-title", "component": "ki-input", "props": { "label": "Title", "required": true } },
        { "id": "f-qty", "component": "ki-number-input", "props": { "label": "Quantity" } },
        {
          "component": "ki-button",
          "props": { "variant": "primary" },
          "action": "add",
          "collect": { "title": "f-title", "quantity": "f-qty" },
          "slots": { "": ["Add"] }
        }
      ]
    }
  }
}
```

The person types "Buy milk" and 2, then activates **Add**. The host receives
`add` with the data `{ variant: 'primary', title: 'Buy milk', quantity: 2 }`.

- **Every field is asked first.** A field that answers `checkValidity()`
  decides and shows its own message; any other is invalid when it matches
  `:invalid`. If one is invalid, nothing is dispatched, each invalid field
  shows its message and the first in document order takes the focus and the
  browser's message bubble. A
  required field left empty, or text that is not a number in `ki-number-input`
  or not a date in `ki-date-picker`, stops the action.
- **Values keep their type.** Each key carries the field's live `checked`,
  `selected` or `value`, the first of them its catalog entry declares, read as
  a declared-event activation reads its own state: a number arrives as a
  number, a checkbox as `true` or `false`, an empty text field as `""`. A field
  with no value of the declared type, such as an empty number field, adds no
  key.
- **Enter does not submit.** The person goes to the button.
- **Rejected:** `collect-without-action` (the node binds no action),
  `collect-unknown-node` (no node of the spec carries the id),
  `collect-no-value` (the named node's entry declares none of `checked`,
  `selected` and `value`), `collect-key-conflict` (a key equals a prop the
  node's own component declares) and `collect-budget` (more than
  `COLLECT_MAX_ENTRIES`, 32, entries).

With `openai-strict`, the emitter can offer an exact set of collection keys
for a button bound to one action. `collect: null` means the report has no
collection. Normalization drops that placeholder before validation.
Use the same host glyph list in `selectSpecIcons()` and the emitter's
`icons` option. [See the cart surface recipe](./emitting-specs.md#configure-the-cart-surface).

### An action per event

A node bound by name fires its action on one event, the one its catalog
entry derives. A component that reports several answers binds each of them
to its own action instead:

```json
{
  "version": 1,
  "actions": ["tool.approved", "tool.denied"],
  "root": {
    "component": "ki-confirmation",
    "props": {
      "heading": "Delete these 12 files?",
      "action": "delete_files",
      "approve-label": "Delete",
      "deny-label": "Keep files"
    },
    "action": { "ki-approve": "tool.approved", "ki-deny": "tool.denied" }
  }
}
```

The person activates **Keep files**, and the host receives `tool.denied`.

- **Each key is an event the component declares,** as its catalog entry
  lists them (the emitter's prompt and schema list them per component). A
  click is not one unless the component declares it.
- **Each listed event fires whenever the component reports it.** The rules a
  binding by name follows for its event do not apply: a `ki-dialog` bound
  per event reports both `ki-confirm` and `ki-close`, with or without a
  confirm label, and `ki-close` arrives on every close, the host's own
  included, so read it as "it closed", not "it was refused".
- **Some events fire without the person.** A toast's time runs out, an
  image fails to load, a carousel rotates, a popover or a lazy tree item
  renders open, the host closes a dialog: each reports its bound action like
  a click would. Their descriptions in the catalog say "it can fire without a
  gesture". Bind an action that stands for a decision, such as an approval,
  only to an event a person causes (`ki-approve`, `ki-confirm`, a click).
- **An action is a report, not consent** (spec 161). It says which event
  fired, never that the person agreed: the spec's author also wrote the words
  on every control. A host confirms a consequential effect outside the spec.
- **The data is the same** as for a binding by name: the node's props with
  its live `checked`, `selected` or `value`, and the fields it collects. The
  event's own detail is not carried: a `ki-table` sort does not say the
  column.
- **`collect` applies to every bound event,** its validity check included.
  An invalid field stops a `ki-dialog`'s close action too, and the dialog has
  already closed by then; put a form's fields behind a button that collects
  them, and bind the dialog's `ki-close` on its own.
- **Some components bind only per event.** `ki-code-input`,
  `ki-confirmation`, `ki-file-upload`, `ki-message`, `ki-popover`,
  `ki-search`, `ki-table`, `ki-time-input` and `ki-tree-item` declare several
  events and no rule that picks one, so a binding by name is rejected
  (`ambiguous-activation-event`).
- **Rejected:** `undeclared-event` (a key the entry does not declare),
  `undeclared-action` (a value outside the `actions` list, at
  `<node>.action.<event>`), `malformed-spec` (an object with no event) and
  `action-not-allowed` (a native element, a glyph, `ki-markdown` or a source
  reference, which bind no action in either form). A `ki-pagination` with
  `href-template` navigates natively and binds nothing.

### A table

Records that share fields are a native table, for reading only, inside a
`ki-table` for Kimen styling (catalog schema `1.9.0`):

```json
{
  "version": 1,
  "root": {
    "component": "ki-table",
    "slots": {
      "": [
        {
          "component": "table",
          "slots": {
            "": [
              { "component": "caption", "slots": { "": ["Pedidos"] } },
              {
                "component": "thead",
                "slots": {
                  "": [
                    {
                      "component": "tr",
                      "slots": {
                        "": [
                          { "component": "th", "props": { "scope": "col" }, "slots": { "": ["Pedido"] } },
                          { "component": "th", "props": { "scope": "col" }, "slots": { "": ["Estado"] } }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                "component": "tbody",
                "slots": {
                  "": [
                    {
                      "component": "tr",
                      "slots": {
                        "": [
                          { "component": "th", "props": { "scope": "row" }, "slots": { "": ["A-17"] } },
                          { "component": "td", "slots": { "": [{ "component": "ki-badge", "slots": { "": ["Pendiente"] } }] } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

- **Elements:** `table`, `caption`, `thead`, `tbody`, `tr`, `th` and `td`
  are native primitives (`NATIVE_PRIMITIVE_TAGS`). The one attribute is a
  `th`'s `scope`, `col` or `row`, optional. Every other one (`colspan`,
  `style`, `data-sort`, …) is `unknown-prop`, and none binds an action
  (`action-not-allowed`); a cell may hold a `ki-button` that does.
- **Content model:** a `table` holds, in order, at most one `caption`, at
  most one `thead`, then any number of `tbody`. `thead` and `tbody` hold
  only `tr`, and `tr` holds only `th` and `td`; none of them holds text. A
  `caption` holds text, `strong` and `em`, and a cell holds what a layout
  `div` holds, except a table. A table part sits only in its own parent:
  never in a `div`, a cell, a component's slot or at a root. Anything else
  is `invalid-child`.
- **Live surface:** a batch is checked where its nodes land. A `tr`
  inserted into a `tbody` is accepted; the same `tr` as a top-level node is
  rejected.
- **`ki-table`:** a spec cannot key a row (`data-key`) or sort a column
  (`data-sort`), so a table from a spec is never sorted or selected. Leave
  `selectable` off.

## What may a spec contain?

The allowed components, props, prop types, enum values, slots and events are
**generated, not documented by hand**. The single source of truth is the
catalog artifact, generated from the committed Custom Elements Manifest and
guarded by the `catalog-sync` gate:

- [`packages/catalog/src/generated/catalog.ts`](../../packages/catalog/src/generated/catalog.ts)
  — the artifact itself, exported at runtime as `catalogData`;
- [`llms.txt`](../../llms.txt) — the index of the same component contracts
  in agent-readable prose, one linked document per component
  ([`llms-full.txt`](../../llms-full.txt) holds them all in one file).

Query it instead of transcribing it:

```ts
import { catalogData, CATALOG_SCHEMA_VERSION } from '@kimen/catalog';

catalogData.components['ki-button'].props.variant;
// { type: 'enum', values: ['ghost', 'outline', 'primary', 'quaternary', 'secondary'], ... }

catalogData.components['ki-card'].slots;
// { '': ..., footer: ..., header: ..., media: ... }

CATALOG_SCHEMA_VERSION; // the catalog document format's own version
```

Each entry also carries `whenToUse` / `whenNotToUse` guidance verbatim from
the component contract, which is what an agent should read before composing.

## Validation

```ts
import { validateUiSpec } from '@kimen/catalog';

const report = validateUiSpec(spec); // spec: object, or a JSON string
report.ok;     // boolean
report.issues; // machine-readable, one per offender
```

`validateUiSpec` accepts either a parsed object or a JSON string. Every
rejection names its offender and location. Two real examples:

```ts
validateUiSpec({
  version: 1,
  root: { component: 'ki-button', props: { onclick: 'alert(1)' }, slots: { '': ['Pay now'] } },
});
// { ok: false, issues: [{
//     code: 'unknown-prop',
//     path: 'root.props.onclick',
//     message: 'ki-button declares no prop "onclick"',
//     value: 'onclick',
// }] }

validateUiSpec({
  version: 1,
  root: { component: 'ki-badge', props: { tone: 'sparkle' }, slots: { '': ['New'] } },
});
// { ok: false, issues: [{
//     code: 'invalid-prop-type',
//     path: 'root.props.tone',
//     message: 'ki-badge prop "tone" expects one of "danger", "info", "neutral", "success", "warning"',
//     value: 'sparkle',
// }] }
```

### Failure modes

Every issue carries a `code`, the `path` to the offending location (e.g.
`root.slots.footer[0].props.tone`), a human-readable `message`, and — when one
exists — the offending `value`. The codes:

| Code | Meaning |
| --- | --- |
| `malformed-spec` | Not the neutral document shape: wrong `version`, missing `root`, non-scalar prop values, invalid JSON string input, or input that is not plain data (see the purity wall below) |
| `unknown-component` | `component` names a tag outside the catalog |
| `unknown-prop` | A prop the component does not declare |
| `invalid-prop-type` | A declared prop with a wrong-typed or out-of-enum value |
| `missing-required-prop` | A prop the component requires is absent, or a required string holds only white space |
| `prop-out-of-range` | A number outside the `minimum`/`maximum` its catalog entry declares |
| `url-scheme` | A URL-typed prop whose scheme is neither `http` nor `https` (relative references pass) |
| `url-origin` | Under `allowedUrlOrigins`, a URL-typed prop that is not an absolute URL on a listed origin |
| `unknown-slot` | A slot name the component does not declare |
| `invalid-child` | A child the parent's content model does not allow (text-only native elements, table parts) |
| `invalid-id` | A node `id` outside the id grammar |
| `duplicate-id` | Two nodes of the spec share an `id` |
| `invalid-reference` | An id-reference prop (`format: "idref"`) that names no node of the same spec or live surface |
| `invalid-command` | A dialog invoker's `command` is not `show-modal`, `close` or `request-close` |
| `invalid-command-target` | A dialog invoker's `commandfor` is not the `id` of a `ki-dialog` in the same spec |
| `action-not-allowed` | An action bound to a node that cannot raise one: a native element, or a passive component such as `ki-icon` |
| `undeclared-action` | A node binds an action absent from the document's `actions` list |
| `undeclared-event` | A binding per event names an event the component's catalog entry does not declare |
| `collect-without-action` | A node has `collect` but no `action` |
| `collect-unknown-node` | A `collect` value is not the `id` of a node of the same spec or live surface |
| `collect-no-value` | A `collect` value names a node whose entry declares none of `checked`, `selected` and `value` |
| `collect-key-conflict` | A `collect` key equals a prop the node's own component declares |
| `collect-budget` | A `collect` with more than 32 entries |
| `forbidden-key` | `__proto__`, `constructor` or `prototype` anywhere in the document |
| `size-budget` | Payload beyond the byte budget (`VALIDATION_MAX_BYTES`, 262,144 by default; overridable per call via `maxBytes`) |
| `depth-budget` | Nesting beyond `VALIDATION_MAX_DEPTH` (256 levels) |

### The purity wall

Object input never reaches the schema checks directly. It first crosses an
iterative snapshot that builds a plain-data clone **without invoking any
foreign code**: no getters or `toJSON` are called, accessor properties are
rejected instead of read, functions, symbols, bigints, non-finite numbers and
class instances are rejected as not-data, and shared object references or
cycles are rejected (a spec is a JSON tree). Every later check runs on the
clone, so mutating the original mid-validation changes nothing — there is no
time-of-check/time-of-use gap. Budgets are enforced *while* walking, so an
over-budget payload aborts early instead of being traversed in full.

### What validation does not protect against

URL-scheme allowlisting (`javascript:`, `data:` and other executable schemes)
and markup inertness are render-path invariants owned by the guarded renderer
below — the safe-scheme policy is a render decision, and duplicating it in
validation would create two drifting sources for one rule. Catalog validation
is a schema boundary, never content sanitization. A host that renders a spec
outside the guarded renderer is outside the guardrail.

## Rendering

```ts
import { renderUiSpec } from '@kimen/catalog';

const result = renderUiSpec(spec, {
  surface: document.querySelector('#genui'),
  onAction: (event) => {
    event.action; // 'confirm-order' — a declared action name, as data
    event.id;     // the node's id, when it has one
    event.path;   // 'root.slots.footer[0]' — which node dispatched it
    event.data;   // the activated node's props and collected fields, as scalars
  },
});
if (!result.ok) console.warn(result.diagnostics);
```

`renderUiSpec` is **fail-closed and atomic**: full validation precedes the
first attach, so a rejected spec touches the surface not at all, and a
rejected *re*-render leaves the previous content intact. On success the
validated tree replaces the surface's content — and its action listeners — in
one operation.

On top of catalog validation the renderer enforces the safe-render semantics:

- **No code path from spec data.** Text children attach as inert text nodes
  (never `innerHTML`); the catalog exposes no event-handler props; and any
  string prop the catalog marks `format: "url"`, or that declares no format
  under a URL-bearing name (`href`, `src`, `action`, `formaction`, `poster`,
  …), accepts only `http`, `https` and relative references — every other
  scheme is rejected naming the prop and the scheme (rule `url-scheme`),
  including control-character smuggling like `java\tscript:`. A prop marked
  `format: "text"` is never a URL, whatever its name: `ki-confirmation`'s
  `action` is a tool identifier such as `github:create_issue`.
- **Declared budgets.** Depth, node count and payload size, all overridable
  per render (`budgets`, lower or higher than the defaults) and all
  falsifiable on both sides: a spec exactly at a budget renders; one beyond
  it is rejected before any node attaches.

  ```ts
  import { DEFAULT_RENDER_BUDGETS } from '@kimen/catalog';
  DEFAULT_RENDER_BUDGETS;
  // { actionRefillMs: 500, maxActionBurst: 10, maxBytes: 262144, maxDepth: 32, maxNodes: 512 }
  ```

- **Action-rate budget.** A rendered surface (one `renderUiSpec` call, one
  stream, one live surface) delivers at most 10 actions at once, then one
  more every 500 ms (`maxActionBurst` and `actionRefillMs` in `budgets`).
  Beyond it an action is held, not queued: each binding keeps only its
  latest report, delivered when the budget allows, so a field bound per edit
  still reports what the person last typed, and a carousel rotating every
  millisecond cannot flood the host. A held report names the path and the
  revision of the moment it fired, and is dropped if its node leaves the
  surface first. The first hold is reported once to `onDiagnostic` (rule
  `action-rate-budget`). An action your host consumes itself and never sends
  on can skip the budget: name it with `isLocalAction`, deciding by what you
  bound (a node path), never by the action name, which the spec chooses.

- **Version skew fails closed.** A spec may declare the catalog schema version
  it was authored against as a top-level `catalogSchemaVersion` field (the
  renderer reads and strips it), or the host may pass it as the
  `catalogSchemaVersion` render option. A compatible version — plain
  `MAJOR.MINOR.PATCH` with the catalog's major and a minor not newer than its
  minor (a `1.1.0` catalog accepts `1.0.0` and `1.1.x`; under major `0`
  only the same minor: a `0.3.0` catalog accepts `0.3.x`) — renders; any other
  is rejected naming both versions (rule `unsupported-version`).
  Note that the standalone `validateUiSpec` checks the three-field neutral
  document — the version gate is the renderer's.
- **Declarative actions only.** Activating a bound control dispatches exactly
  one declared action on the single `onAction` channel. A binding by name
  fires on the event the component's catalog entry derives: its declared
  `activationEvent` (`change` on `ki-combobox`, `ki-page-change` on
  `ki-pagination`), else the one event it declares (`change` on
  `ki-checkbox`, `ki-switch`, `ki-radio-group`, `ki-select`, `ki-input` and
  `ki-textarea`; `ki-change` on `ki-tabs`), else `click`. Three components
  pick the event from their own state: `ki-chip` by its kind, `ki-dialog` by
  its confirm label and `ki-prompt-input` by its status. A binding per event
  fires each listed event (see [An action per
  event](#an-action-per-event)). A declared-event activation never cancels
  the control's own change, and its `data` adds the control's live
  `checked`/`value` (only where the catalog declares that prop) to the spec's
  props. A node with `collect` adds its fields' values on any activation,
  once every field is valid (see [A form](#a-form)). A binding by name on a
  component that declares more than one event and has no rule of its own is
  rejected (`ambiguous-activation-event`). A click activation suppresses the native
  default and stops bubbling, so a button inside a form submits nothing; the
  innermost bound node claims each interaction, so nested action-bound nodes
  dispatch once. A spec owns no form, so it never submits or resets one of
  the host page's: a form-action `type` (an enum offering `button` with
  `submit` or `reset`) accepts only `button`, and the renderer pins
  `type="button"` on every such node the spec leaves unset, bound to an
  action or not (spec 152).

Every rejection is a `RenderDiagnostic` — `path`, `rule`, `message` and the
offending `value` — pure data, safe to display anywhere because a host renders
it as text, never markup.

## Streaming

An agent that emits a surface incrementally uses the streaming renderer: each
pushed node is validated as a standalone subtree and appended to the surface
only after it fully validates.

```ts
import { createStreamingRenderer } from '@kimen/catalog';

const stream = createStreamingRenderer({
  surface: document.querySelector('#genui'),
  actions: ['refresh'], // the declared action set, fixed at creation
  onAction: (event) => handle(event),
});

stream.push({ component: 'ki-card', slots: { '': ['First result'] } });  // attaches
stream.push({ component: 'script' });                                    // refused, halts
stream.push({ component: 'ki-card', slots: { '': ['Never renders'] } }); // rejected: halted
stream.close();
```

The streaming contract:

- A node attaches only after it fully validates; an invalid node fails closed
  — its subtree never attaches, the failure is reported, and previously
  validated content remains.
- The budgets bind the **accumulated** stream (attached node count and payload
  size), so a stream that never closes still trips its budget and halts.
- Once halted — by an invalid node, a tripped budget, version skew, or
  `close()` — every further push is rejected. An untrusted stream never
  mutates the surface again after it has been rejected or completed.
- Each attached node is addressed by its attach order: an action from the
  first pushed node reports `path: 'stream[0]'`, one from a button in the
  second node's footer slot `path: 'stream[1].slots.footer[0]'`, so the host
  always knows which streamed node dispatched it.
- Each pushed node validates on its own, so its `collect` names fields of the
  same pushed node.

## Live surface

A surface that lives for hours — a board the agent keeps current while the
user works in it — must change in place. `renderUiSpec` replaces the whole
tree, which resets focus, typed text and scroll; `createLiveSurface` instead
applies small **batches of operations addressed by node `id`**:

```ts
import { createLiveSurface } from '@kimen/catalog';

const live = createLiveSurface({
  surface: document.querySelector('#board'),
  actions: ['decide'], // the declared action set, fixed at creation
  onAction: (event) => handle(event), // { action, id, path, revision, data }
});

live.apply({ ops: [{ op: 'insert', node: { id: 'decisions', component: 'ki-list' } }] });
const result = live.apply({
  ifRevision: live.revision, // optional optimistic concurrency
  focus: 'dec-8', // optional: where focus goes if this batch leaves it nowhere
  ops: [
    { op: 'insert', parent: 'decisions', node: { id: 'dec-8', component: 'ki-list-item', slots: { '': ['Use Postgres'] } } },
    { op: 'set', id: 'note', props: { label: 'Why?' } },
    { op: 'text', id: 'dec-3', slot: '', text: 'Decided' },
    { op: 'remove', id: 'q-2' },
    { op: 'replace', id: 'cmp-1', node: { id: 'cmp-1', component: 'ki-card' } },
  ],
});
if (!result.ok) console.warn(result.diagnostics); // { ok, revision, diagnostics }
live.snapshot(); // { revision, actions, nodes } — deep-frozen plain data
```

The batch and op shapes are exported as types (`LiveBatch`, `LiveOp` and
`LiveInsertOp`, `LiveSetOp`, `LiveTextOp`, `LiveRemoveOp`, `LiveReplaceOp`,
`LiveResetOp`) for code that writes batches. `apply` still takes `unknown`, and also JSON
text: a batch is untrusted data whatever its type says.

- **Atomic and fail-closed per batch.** The batch crosses the purity wall,
  the per-batch budgets and the `ifRevision` check; every op is applied to a
  copy of the state and the **resulting** state is validated exactly like a
  spec (catalog, props, declared actions, slots, unique ids, tag grammar, URL
  allowlist, the state budgets). Any failure rejects the whole batch with
  diagnostics naming the op (`ops[3].node.component`) or state path, and
  nothing changes. Unlike a stream, the surface stays live: the next valid
  batch applies. Removing content frees budget.
- **Five limits, all host options.** Per batch, `batchBudgets`: 64 ops
  (`batch-op-budget`) and 65,536 bytes of serialized batch
  (`batch-size-budget`). Per resulting state, `budgets`: 512 nodes
  (`node-count-budget`), 32 levels (`depth-budget`) and 262,144 bytes of
  serialized nodes (`size-budget`). The host sets each one at creation, lower
  or higher than its default; a host that raises `batchBudgets` can send a
  whole page as one batch, applied whole or not at all. Two fixed ceilings
  apply first and no option moves them: 8 MiB and 256 levels of JSON nesting
  at the purity wall.
- **A rejection is a return value.** `apply` never throws for a rejected
  batch and reports it through no callback or log: check `ok`. Atomicity
  stops at the batch: several batches are not one change, and a batch
  rejected after others leaves those applied.
- **Minimal DOM change.** `set` writes only the attributes whose value changes
  (`null` unsets); `text` updates a slot's text node in place; `insert` places
  one new subtree before its `before` sibling (or last); `remove` and
  `replace` touch only the named subtree. Nothing else is recreated or
  reordered; there is no move op.
- **The user's state wins.** Once the user changed a control's own
  `checked`, `open`, `selected` or `value`, a `set` that would change it,
  and a `replace` or `remove` of that node or of any ancestor, is rejected
  (`user-state-conflict`) unless the op says `force: true` **and** the host
  created the surface with `allowUserStateOverride: true` (forced without
  it: `user-state-override-denied`). A forced `set` hands back only the
  props it names: forcing a search closed leaves the query the user typed
  theirs. A forced `set` of `null` writes the
  prop's catalog default to the component, or empties it when there is
  none, as for a number field. A `set` that agrees with the user is
  accepted, but their `checked`, `selected` and `value` stay theirs: a
  later `set` to another value is still rejected. No rejection repeats the
  user's value.
- **Emptying a form after it was sent.** `{ op: 'reset', id: 'title' }`
  returns a control's `checked`, `open`, `selected` and `value` to what the
  spec gave it, else the catalog default, else nothing (a number field
  empties too), and makes them the agent's again. It needs neither `force`
  nor `allowUserStateOverride`, because it clears only what already left in
  an action, the node's own or one that collects it. Input no action carried
  is kept and the batch is rejected (`unsent-user-input`, naming the node and
  the prop, never the input): text typed after pressing Add, or a value a
  `set` only agreed with. After a create, answer the action with a batch that
  resets the add form's fields; if it is rejected, the person is typing again,
  so leave the form alone. A node that declares none of the four props is
  `unknown-prop`. Like every op, a reset is checked against the state before
  its batch: set a new value in a later batch.
- **Reopening a dialog the person closed.** After Escape or Cancel, a `set`
  of `open: true` is a conflict: the surface still records the dialog as
  open and reads the closed one as the person's choice. Send `open: false`
  in a batch of its own first, then `open: true` in a later batch; one batch
  with both is checked against the state before it and is rejected too. The
  rejection says so.
- **Focus is repaired, never taken.** A batch may name a node in `focus`.
  Once the batch has settled (its components have rendered, and a closing
  dialog has handed focus back), focus that is then nowhere (the page body)
  goes to that node; focus anywhere else, inside the surface or in the host
  page, is never moved. Without `focus`, replacing the node that held focus
  gives it to the replacement. The id must name a node of the resulting
  surface (`unknown-id` at `batch.focus`), and the node must be able to take
  focus: name the Delete button of the next row, not the row. To delete a row
  after a confirmation, close the dialog and remove the row in one batch that
  names the next row's control.
- **Only declared names.** A slot or prop name must be one the node's
  catalog entry declares as its own: inherited names such as `toString` are
  `unknown-slot`/`unknown-prop`, and `__proto__`, `constructor` and
  `prototype` are never slot names (`forbidden-key`).
- **One batch at a time.** `apply` called while a batch is being applied
  (for instance from `onAction`) returns `reentrant-batch` and changes
  nothing; submit it after `apply` returns.
- **Actions name their node.** The event carries the node's `id`, its current
  `path` (`surface[0].slots.footer[1]`), the `revision` and the same live
  `data` as `renderUiSpec`, computed from the node's current props.
- **Collected fields are the live ones.** A `collect` resolves when the person
  activates the node, against the nodes the surface holds then, so a field a
  batch replaced is read from its new element. A batch that leaves a `collect`
  naming no node, such as one removing a collected field, is rejected whole
  (`collect-unknown-node`). Like `action`, `collect` changes only by `replace`.

The contracts are [spec 035](../../specs/035-live-surface/spec.md) and
[spec 155](../../specs/155-live-surface-reset-focus/spec.md).

## Registering your own components

The catalog a spec validates against does not have to be the built-in one.
`createCatalog` accepts a data-only definition of YOUR components — the
exact entry shape of the generated catalog (tag, usage guidance, typed prop
constraints, slots, events) — and returns an immutable catalog value that
`validateUiSpec`, `renderUiSpec` and `createStreamingRenderer` take through
their `catalog` option, standalone or extending the built-in components
(`{ extend: catalogData }`). "Outside the catalog" then means outside the
catalog in use; nothing else about validation or rendering changes, and
when the option is absent the built-in catalog remains the boundary.

The definition itself is validated as hostile input (same purity wall as
specs, plus tag, collision and guidance rules, every rejection a coded
`RegistrationIssue`), and the returned catalog is deeply frozen. The
registration surface, its acceptance rules and its security model are
documented in the
[@kimen/catalog README](../../packages/catalog/README.md#registering-your-own-components).

## Two things a spec cannot say

- **Styling.** The v1 format exposes no CSS values and no per-spec token
  reassignment, and no catalog, built-in or registered, can declare a
  `style`, `class`, `slot` or `id` prop: those attributes are never written
  from spec data. Appearance stays at the consuming application's token
  layer — see [Tokens & theming](../../packages/elements/docs/theming.mdx).
- **Arbitrary events.** There is no way to bind a DOM event name or a
  callback. The only interaction surface is `action`, and the only receiver
  is the host's `onAction` channel.

## Related

- [`@kimen/catalog` README](../../packages/catalog/README.md) — package
  reference for validation and the guarded renderer.
- [Build an A2UI host with Kimen](./a2ui-host.md) — the A2UI protocol
  adapter over this format.
- [Ship an MCP App with Kimen](./mcp-apps.md) — the MCP Apps adapter over
  this format.
