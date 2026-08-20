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

## When to use

Use `@kimen/catalog` whenever UI structure arrives as data from outside your
trust boundary — an agent, a protocol message, a stored spec. Call
`validateUiSpec` when you need a verdict on a spec; call `renderUiSpec` (or
`createStreamingRenderer` for progressive streams) when a spec should reach
the DOM. If your host speaks a concrete protocol, use the adapter and let it
drive this package: [`@kimen/adapter-a2ui`](../adapter-a2ui/README.md) for
A2UI, [`@kimen/adapter-mcp-apps`](../adapter-mcp-apps/README.md) for MCP
Apps. Hand-written application UI does not need the catalog — use
`@kimen/elements` directly.

The full spec shape, validation failure modes, budgets and streaming
semantics are covered in
[The UI-spec format guide](../../docs/guides/ui-spec.md).

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

A re-render on the same surface replaces the previous tree (and its action
listeners) atomically once validation succeeds; a rejected re-render leaves
the previous content intact.

The renderer adds no schema of its own — catalog membership, prop types,
declared actions and the purity wall all come from the validation layer
above (Art. I). Over that it enforces the safe-render semantics: **no code
path from spec data** (text is attached as inert text nodes, never parsed as
markup; the catalog exposes no event-handler props; URL-typed props accept
only `http`, `https` and relative references, every other scheme rejected
naming the prop and scheme), **declared budgets** (depth, node count, payload
size — a spec exactly at a budget renders, one beyond it is rejected before
any node attaches), **version skew** (a spec declaring an unsupported
`catalogSchemaVersion` — as a top-level field of the spec document, or via
the render option — is rejected naming both versions), and **declarative
actions only** (a bound control dispatches its one declared action, as data,
on the single `onAction` channel — activation suppresses the native default
and stops bubbling, so exactly one action fires even for nested action-bound
nodes or a button inside a form; no other callback exists).

`createStreamingRenderer` renders a streamed spec progressively: a node
attaches only after it fully validates; an invalid node halts the stream
fail-closed while previously validated content remains; the budgets bind the
accumulated stream so a stream that never closes still trips its payload
budget; and once halted — by an invalid node, a tripped budget, version skew
or `close()` — every further push is rejected.

Every rejection is a `RenderDiagnostic` — node path, violated rule and
offending value — pure data, safe to display because a host renders it as
text.

## Registering your own components

`createCatalog` opens the same guardrail to your components (spec 032): you
describe them behind a data-only JSON facade — the exact entry shape the
generated catalog uses — and receive an immutable catalog that
`validateUiSpec`, `renderUiSpec` and `createStreamingRenderer` accept
through their `catalog` option. The catalog carries contracts, never
implementations: your bundle keeps `customElements.define` ownership.

```ts
import { catalogData, createCatalog, renderUiSpec } from '@kimen/catalog';

const created = createCatalog(
  {
    components: {
      'acme-kpi-card': {
        tag: 'acme-kpi-card',
        description: 'A KPI card for Acme dashboards.',
        whenToUse: 'Show one operational metric with its trend.',
        whenNotToUse: 'Tabular breakdowns of many metrics.',
        props: {
          tone: {
            type: 'enum',
            values: ['ok', 'warn', 'critical'],
            description: 'Semantic severity of the metric.',
          },
        },
        slots: { '': 'The metric label.' },
        events: {},
      },
    },
  },
  { extend: catalogData }, // omit to build a standalone catalog
);
if (created.ok) {
  renderUiSpec(spec, { surface, catalog: created.catalog });
}
```

The definition is untrusted input and crosses the same purity wall as UI
specs: unknown keys, prototype-pollution keys, non-data values, accessor
properties, cycles and over-budget payloads are rejected naming the
offender (a `RegistrationIssue`: code, path, value). On top of the wall,
registration enforces its own rules — tags must be conservative
custom-element names (lowercase ASCII, hyphen required, SVG/MathML reserved
names excluded), collisions with the extended catalog are hard errors
(built-ins are never overridden or shadowed), usage guidance
(`description`, `whenToUse`, `whenNotToUse`) is mandatory because it is
what an agent selects components by, and enum constraints need non-empty
values. `createCatalog` never throws on hostile input: it returns
`{ ok: false, issues }`, and no partial catalog escapes.

The returned catalog is deeply frozen — later mutation attempts throw in
strict mode and can never alter validation or render outcomes. Every
guardrail invariant applies to registered components identically: unknown
components and props are rejected relative to the catalog in use, URL-named
props obey the scheme allowlist, budgets and the version-skew gate fail
closed on the complete and streaming paths alike, and the spec format still
exposes no styling surface — your identity lives in your components and
your token layer. Accessibility of registered components remains their
author's contract: the catalog transports your guidance; it cannot audit
your semantics.

When no `catalog` option is supplied everything behaves exactly as before:
the built-in generated catalog is the boundary and unknown tags — including
your `acme-*` ones — are rejected.

See [The UI-spec format guide](../../docs/guides/ui-spec.md) for the
complete spec format, and the [roadmap](../../docs/roadmap.md) for project
context.

<!-- kimen:capabilities:catalog-readme-status:start -->
- **available** — Consumer catalog registration: your own components behind a JSON facade, validated and rendered through the same fail-closed guardrail
- **available** — Emitter kit: model-agnostic prompt, catalog-specialized JSON Schema and tool definition so any LLM emits valid specs, with a single-round repair loop
- **available** — Generated framework wrappers: @kimen/react, @kimen/vue and @kimen/angular with typed props, native events and each framework form idiom, drift-gated
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:catalog-readme-status:end -->
