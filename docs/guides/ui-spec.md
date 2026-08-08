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

Each **node** has up to four fields:

- **`component`** — a catalog tag (`ki-button`, `ki-card`, …). A tag outside
  the catalog is rejected (`unknown-component`); there is no escape hatch to
  arbitrary elements.
- **`props`** — optional. Scalar values only (`boolean | number | string`),
  keyed by the attribute name the catalog declares. Unknown names are rejected
  (`unknown-prop`), wrong-typed values are rejected (`invalid-prop-type`), and
  enum-constrained props accept only their declared values.
- **`action`** — optional. One name from the document's `actions` list. When
  the rendered node is activated, the host receives that name — as data, on a
  single callback channel — never a code payload.
- **`slots`** — optional. Children per slot name, where `""` is the default
  slot. Each child is either a nested node or a plain string; strings become
  inert text nodes, never parsed as markup. A slot name the component does not
  declare is rejected (`unknown-slot`).

## What may a spec contain?

The allowed components, props, prop types, enum values, slots and events are
**generated, not documented by hand**. The single source of truth is the
catalog artifact, generated from the committed Custom Elements Manifest and
guarded by the `catalog-sync` gate:

- [`packages/catalog/src/generated/catalog.ts`](../../packages/catalog/src/generated/catalog.ts)
  — the artifact itself, exported at runtime as `catalogData`;
- [`llms.txt`](../../llms.txt) — the same component contracts in
  agent-readable prose.

Query it instead of transcribing it:

```ts
import { catalogData, CATALOG_SCHEMA_VERSION } from '@kimen/catalog';

catalogData.components['ki-button'].props.variant;
// { type: 'enum', values: ['ghost', 'primary', 'quaternary', 'secondary', 'tertiary'], ... }

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
| `unknown-slot` | A slot name the component does not declare |
| `undeclared-action` | A node binds an action absent from the document's `actions` list |
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
    event.path;   // 'root.slots.footer[0]' — which node dispatched it
    event.data;   // the activated node's props, as scalars
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
  string prop under a URL-bearing name (`href`, `src`, `action`, `formaction`,
  `poster`, …) accepts only `http`, `https` and relative references — every
  other scheme is rejected naming the prop and the scheme (rule
  `url-scheme`), including control-character smuggling like `java\tscript:`.
- **Declared budgets.** Depth, node count and payload size, all overridable
  per render and all falsifiable on both sides: a spec exactly at a budget
  renders; one beyond it is rejected before any node attaches.

  ```ts
  import { DEFAULT_RENDER_BUDGETS } from '@kimen/catalog';
  DEFAULT_RENDER_BUDGETS; // { maxBytes: 262144, maxDepth: 32, maxNodes: 512 }
  ```

- **Version skew fails closed.** A spec may declare the catalog schema version
  it was authored against as a top-level `catalogSchemaVersion` field (the
  renderer reads and strips it), or the host may pass it as the
  `catalogSchemaVersion` render option. A version the renderer's catalog does
  not support is rejected naming both versions (rule `unsupported-version`).
  Note that the standalone `validateUiSpec` checks the three-field neutral
  document — the version gate is the renderer's.
- **Declarative actions only.** Activating a bound control dispatches exactly
  one declared action on the single `onAction` channel. Activation suppresses
  the native default and stops bubbling, so a button inside a form submits
  nothing and nested action-bound nodes dispatch once. When the catalog types
  a component's `type` prop with a `button` value and the spec leaves it
  unset, the renderer pins `type="button"` so no native submit path runs
  alongside the action.

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

## Two things a spec cannot say

- **Styling.** The v1 format exposes no CSS values and no per-spec token
  reassignment. Appearance stays at the consuming application's token layer —
  see [Tokens & theming](../../packages/elements/docs/theming.mdx).
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
