# @kimen/catalog

The neutral runtime catalog of Kimen's GenUI layer (constitution Art. VIII):
the machine-readable schema of what agents may emit — every published
`ki-*` element with typed props, slots, events and when-to-use guidance —
plus the validation entry point that accepts or rejects agent-emitted UI
specs at the GenUI boundary. The catalog and the `<ki-*>` components are the
durable assets; protocol adapters (A2UI, MCP Apps) are deliberately
disposable and live in their own packages.

The catalog artifact (`src/generated/catalog.ts`) is generated from the
committed Custom Elements Manifest of `@kimen/elements` (Art. I) — never
hand-maintained — and the `catalog-sync` gate fails any drift between the
committed artifact and a fresh regeneration. It declares its own schema
version (`catalogSchemaVersion`) and the elements version it derives from.

## Usage

```ts
import { catalogData, validateUiSpec } from '@kimen/catalog';

// What may an agent emit? One entry per published element:
catalogData.components['ki-button'].props.variant;
// { type: 'enum', values: ['ghost', 'primary', 'quaternary', 'secondary', 'tertiary'], ... }

// Validate an agent-emitted UI spec before anything renders:
const report = validateUiSpec({
  version: 1,
  actions: ['confirm-order'],
  root: {
    component: 'ki-card',
    slots: {
      header: ['Confirm your order'],
      footer: [
        {
          component: 'ki-button',
          props: { variant: 'primary' },
          action: 'confirm-order',
          slots: { '': ['Confirm'] },
        },
      ],
    },
  },
});
report.ok; // true — or false with issues naming each offender and location
```

A UI spec is data, never code. Validation rejects — naming the offender —
unknown components, unknown props, wrong-typed values, undeclared slots,
bindings to actions the spec's `actions` list never declares,
prototype-pollution keys (`__proto__`, `constructor`, `prototype`) anywhere
in the document, payloads beyond the declared size budget
(`VALIDATION_MAX_BYTES`, overridable per call with `maxBytes`) and nesting
beyond the depth budget (`VALIDATION_MAX_DEPTH`). Object input crosses an
iterative purity wall before any other check: validation never invokes
getters or `toJSON` on the input (accessor properties, functions and other
non-JSON values are rejected as not-data), shared object references and
cycles are rejected (a spec is a JSON tree), and every later check runs on
the plain-data snapshot, so mutating the original mid-validation changes
nothing.

### What validation does NOT protect against

URL-scheme allowlisting (`javascript:`, `data:` and other executable
schemes) and markup inertness are render-path invariants owned by the
guarded renderer (below): the safe-scheme policy is a render decision, and
duplicating it in `validateUiSpec` would create two drifting sources for one
rule (Art. I). Catalog validation is a schema boundary, never content
sanitization — a host that renders outside the guarded renderer is outside
the guardrail.

The v1 spec format exposes no styling surface: no CSS values, no per-spec
token reassignment. Appearance stays at the consuming application's token
layer (Art. VI).

## Guarded renderer

`renderUiSpec` renders an untrusted spec into a host-owned surface,
fail-closed and atomic — full validation precedes the first attach, so a
rejected spec never touches the DOM:

```ts
import { renderUiSpec } from '@kimen/catalog';

const result = renderUiSpec(spec, {
  surface: document.querySelector('#genui'),
  onAction: (event) => console.log(event.action, event.data),
  budgets: { maxDepth: 32, maxNodes: 512, maxBytes: 262_144 },
  catalogSchemaVersion: '1.0.0',
});
if (!result.ok) console.warn(result.diagnostics); // machine-readable, inert
```

The renderer adds no schema of its own — catalog membership, prop types,
declared actions and the purity wall all come from the validation layer
above (Art. I). Over that it enforces the safe-render semantics: **no code
path from spec data** (text is attached as inert text nodes, never parsed as
markup; the catalog exposes no event-handler props; URL-typed props accept
only `http`, `https` and relative references, every other scheme rejected
naming the prop and scheme), **declared budgets** (depth, node count, payload
size — a spec exactly at a budget renders, one beyond it is rejected before
any node attaches), **version skew** (a spec declaring an unsupported
`catalogSchemaVersion` is rejected naming both versions), and **declarative
actions only** (a bound control dispatches its one declared action, as
data, on the single `onAction` channel — no other callback exists).

`createStreamingRenderer` renders a streamed spec progressively: a node
attaches only after it fully validates, an invalid node fails closed while
previously validated content remains, and the budgets bind the accumulated
stream so a stream that never closes still trips its payload budget and
halts fail-closed.

Every rejection is a `RenderDiagnostic` — node path, violated rule and
offending value — pure data, safe to display because a host renders it as
text.

See phase 4 of the [roadmap](../../docs/roadmap.md).

<!-- kimen:capabilities:catalog-readme-status:start -->
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **planned** — A2UI, MCP Apps, AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:catalog-readme-status:end -->
