# @kimen/catalog

The neutral runtime catalog of Kimen's GenUI layer (constitution Art. VIII):
the machine-readable schema of what agents may emit. It includes opted-in
`ki-*` elements with typed props, slots, events and when-to-use guidance,
plus the validation entry point that accepts or rejects agent-emitted UI
specs at the GenUI boundary. The catalog and the `<ki-*>` components are the
durable assets; protocol adapters (A2UI, MCP Apps) are deliberately
disposable and live in their own packages.

The catalog artifact (`src/generated/catalog.ts`) derives component contracts
from the committed Custom Elements Manifest of `@kimen/elements` (Art. I).
A component's `component.json` must declare `"catalog": true` to expose its
contract to agents (Art. VIII). The `catalog-sync` gate fails any drift
between the committed artifact and a fresh regeneration. It declares its own schema
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
// { type: 'enum', values: ['ghost', 'primary', 'quaternary', 'secondary'], ... }

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

Use `values` when generating enum props. The optional `deprecatedValues`
field lists older values the runtime still accepts for existing specs.

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

### Native primitives

Next to catalog components a spec may carry a closed set of native HTML
elements (spec 037), listed in `NATIVE_PRIMITIVE_TAGS`:

- **Text**: `h2`, `h3`, `h4`, `p`, and `strong`/`em` inside them. No
  attributes; the text takes the host page's typography (the renderer
  writes none). `h1` is the host's.
- **Image**: `img` with `src` (held to the URL policy below), `alt`
  (required: a description, or exactly `""` for a decorative image; white
  space alone is rejected) and optional `width`/`height` hints. The
  renderer pins `referrerpolicy="no-referrer"` and container-fit sizing.
- **Layout**: `div` with `direction` (`column` | `row`), `gap` (a spacing
  token step: `zero`, `xs`, `sm`, `md`, `lg`, `xl`, `3xl`, `7xl`, written
  as `var(--ki-space-<step>)`), `align`, `justify` and `wrap`. The layout
  is written through the CSSOM, never as a `style` attribute, so a page
  whose Content-Security-Policy forbids inline styles keeps working.

```json
{
  "version": 1,
  "root": {
    "component": "div",
    "props": { "gap": "lg" },
    "slots": {
      "": [
        { "component": "h2", "slots": { "": ["Resumen"] } },
        { "component": "p", "slots": { "": ["Ventas de ", { "component": "strong", "slots": { "": ["marzo"] } }] } },
        { "component": "img", "props": { "src": "/img/ventas.png", "alt": "Gráfico de ventas" } },
        { "component": "ki-button", "slots": { "": ["Ver detalle"] } }
      ]
    }
  }
}
```

Every other element (`script`, `iframe`, `a`, `span`, `SCRIPT`, …) is
`unknown-component`, and every other attribute (`style`, `class`, `on*`,
`srcset`, …) is `unknown-prop`. Headings, paragraphs and emphasis accept
only text, `strong` and `em` (`invalid-child` otherwise), and no native
element binds an action (`action-not-allowed`). The primitives come with
the built-in catalog and with catalogs that `extend` it; a consumer
definition can never declare one, and the renderer renders a native tag
only when the catalog in use carries exactly Kimen's definition of it.

### Declared prop limits

A catalog entry states more than a type. Each limit below is generated from
the component contract — never from description prose, never from a table
kept beside it — and is enforced by `validateUiSpec` and by every render
path (`renderUiSpec`, the streaming renderer, the live surface):

| Constraint field | Source in the component | Rejected as |
|---|---|---|
| `required: true` | a prop declared with `!` (`@Prop() label!: string`) | `missing-required-prop` when the node omits the prop, or sets a string to nothing but white space |
| `minimum`, `maximum` | `@minimum <n>` / `@maximum <n>` JSDoc tags on a number prop | `prop-out-of-range` when the number lies outside the inclusive bounds |
| `format: 'url'` | a `@format url` JSDoc tag on a string prop | `url-scheme` for any scheme but `http`/`https` (relative references pass); `url-origin` under `allowedUrlOrigins` |

Bounds exist where a component spends work in proportion to a value:
`ki-indicator` renders one dot per position, so its `count` is bounded to
0–20 and a spec cannot ask one node for a million elements.

A component that degrades gracefully without a prop (a decorative
`ki-avatar` or `ki-status` next to visible text) keeps it optional: the
validator cannot see adjacent content, so it enforces only what the
contract states unconditionally.

### URL props and allowed origins

A URL-typed prop is one the browser may load or navigate to the moment the
attribute is set, so its value is held to a policy that has ONE
implementation: `validateUiSpec` applies it, and the renderers inherit it by
validating through the same code.

- **Schemes, always**: `http`, `https` and relative references pass; every
  other scheme (`javascript:`, `data:`, `blob:`, …) is rejected as
  `url-scheme`, control-character smuggling such as `java\tscript:`
  included.
- **Origins, when you declare them**: any `https` host is accepted by
  default, so a spec can make the page request an image from a host of its
  choosing. Pass `allowedUrlOrigins` to close that:

```ts
const options = { allowedUrlOrigins: ['https://cdn.example.com'] };
validateUiSpec(spec, options);
renderUiSpec(spec, { surface, ...options }); // also the streaming renderer and the live surface
```

With the option present — even as an empty list — every URL prop value must
be an absolute `http(s)://` URL whose origin is on the list, else
`url-origin`. That mode is fail-closed: relative and scheme-relative
references (`/a.png`, `//host/a.png`) are rejected because the boundary
cannot know the document they resolve against and a same-origin request
carries the user's credentials; values with inner white space are rejected
(a multi-URL value names more than one origin); and each entry must be
written exactly as `URL.origin` prints an origin (`https://cdn.example.com`,
`https://localhost:8443`) — a host name alone, a trailing slash or a path
matches nothing, so a typo can only narrow what is accepted.

A prop is URL-typed because its constraint says `format: 'url'`. As a
backstop, a string prop named like a fetchable native attribute (`src`,
`href`, `poster`, `srcset`, `action`, `formaction`, `data`, `cite`,
`background`, `ping`, `xlink:href`) stays URL-typed when its entry declares
no format; declare the format on your own components instead of relying on
the name. `ki-qr`'s `value` is deliberately not URL-typed: the component
encodes it and never loads it, and a QR payload is legitimately any text.
What a code invites a person to scan is your content decision, like the text
of an alert.

### What validation does NOT protect against

Markup inertness is a render-path invariant owned by the guarded renderer
(below), and a string prop that is not URL-typed is opaque data to
validation. Catalog validation is a schema boundary, never content
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

The renderer adds no schema of its own — catalog membership, prop types and
limits, the URL policy, declared actions and the purity wall all come from
the validation layer above (Art. I). Over that it enforces the safe-render
semantics: **no code path from spec data** (text is attached as inert text
nodes, never parsed as markup; the catalog exposes no event-handler props;
URL-typed props obey the URL policy above, `allowedUrlOrigins` included),
**declared budgets** (depth, node count, payload
size — a spec exactly at a budget renders, one beyond it is rejected before
any node attaches), **version skew** (a spec declaring an incompatible
`catalogSchemaVersion` — as a top-level field of the spec document, or via
the render option — is rejected naming both versions; compatible means plain
SemVer with the catalog's major and a minor not newer than its own, so a
`1.1.0` catalog accepts `1.0.0`; under major `0` only the same minor), and **declarative
actions only** (a bound control dispatches its one declared action, as data,
on the single `onAction` channel, on the one event its catalog entry declares
— `change` on the form controls, `ki-change` on `ki-tabs` — or on `click`
when it declares none; a click activation suppresses the native default and
stops bubbling, a declared-event activation cancels nothing and reports the
control's live `checked`/`value`; the innermost bound node claims an
interaction, so exactly one action fires even for nested action-bound nodes
or a button inside a form; a binding on a component declaring several events
is rejected; no other callback exists).

`createStreamingRenderer` renders a streamed spec progressively: a node
attaches only after it fully validates; an invalid node halts the stream
fail-closed while previously validated content remains; the budgets bind the
accumulated stream so a stream that never closes still trips its payload
budget; once halted — by an invalid node, a tripped budget, version skew
or `close()` — every further push is rejected; and each attached node
dispatches its actions at its own path, `stream[<n>]` in attach order
(descendants follow the `renderUiSpec` path grammar below it).

Every rejection is a `RenderDiagnostic` — node path, violated rule and
offending value — pure data, safe to display because a host renders it as
text.

`preflightUiSpec(input, options?)` returns the renderer's verdict without a
DOM: it runs exactly the preparation `renderUiSpec` runs before its first
attach (purity wall, version gate, payload budget, catalog validation, then
the depth, node-count, tag, activation and prop-name guards) and renders
nothing. A DOM-less boundary — the [Kimen MCP server](../mcp-server/README.md),
or a service that checks specs before forwarding them to a page — reports as
valid only what the renderer will paint; `validateUiSpec` alone accepts specs
the renderer's tighter budgets refuse.

```ts
import { preflightUiSpec } from '@kimen/catalog';

const verdict = preflightUiSpec(spec, { allowedUrlOrigins: [] });
if (!verdict.ok) console.warn(verdict.diagnostics); // same diagnostics renderUiSpec would return
```

## Live surface

`createLiveSurface` keeps a long-lived surface current through atomic
batches of `insert`, `set`, `text`, `remove` and `replace` operations
addressed by the optional node `id` (spec 035). Each batch is validated
against the state it would produce — purity wall, per-batch budgets,
optional `ifRevision`, then the same catalog, guard and budget checks as a
spec — before any DOM write; a rejected batch changes nothing and the
surface keeps accepting batches. Applied batches touch only what they name,
so focus, caret, typed text and scroll survive. No `set`, `replace` or
`remove` overwrites or discards a `checked`/`value`/`open` the user changed
(in the node or, for `replace`/`remove`, anywhere in its subtree) unless the
op says `force: true` and the host allowed it (`allowUserStateOverride`).
A batch applied while another is being applied (from `onAction`) is
rejected as `reentrant-batch`. Action events carry the
node `id`, its current `path`, the `revision` and live `data`; `snapshot()`
returns the content as deep-frozen plain data. See the
[UI-spec guide](../../docs/guides/ui-spec.md#live-surface).

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
values. Prop names become attribute names, so they must be conservative
attribute names (lowercase ASCII, then letters, digits, `-` or `_`), and
two classes are forbidden in any letter case (`forbidden-key`): the `on*`
event-handler namespace, which would install executable inline code, and
the reserved names `style`, `class`, `slot` and `id`, which spec data never
writes onto a component (CSS injection and a `style-src-attr 'none'` CSP
breach, coupling to the host page's stylesheets, the renderer's own slot
assignment, and collisions with the host page's ids; 032 FR-015/S19).
`createCatalog` never throws on hostile input: it returns
`{ ok: false, issues }`, and no partial catalog escapes.

`Catalog` is a structural type, so nothing stops a host from handing the
renderers a catalog value it built by hand. Both renderers therefore re-apply
the same tag grammar to every node before creating any element: a hand-built
entry for `script`, `iframe` or a reserved name is rejected fail-closed with
an `invalid-tag` diagnostic and the surface stays untouched (032 FR-013/S17).
They re-check every prop name the same way, on complete, streamed and live
renders alike: an `on*` or reserved name (`style`, `class`, `slot`, `id`)
is a `forbidden-prop-name` diagnostic and nothing attaches (032 S20).
Always build catalogs with `createCatalog`; the re-check is defence in
depth, not a substitute for registration.

The returned catalog is deeply frozen — later mutation attempts throw in
strict mode and can never alter validation or render outcomes. Every
guardrail invariant applies to registered components identically: unknown
components and props are rejected relative to the catalog in use, declared
limits (`required`, `minimum`/`maximum`, `format: 'url'`) are enforced, URL
props obey the URL policy, budgets and the version-skew gate fail
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
- **available** — Kimen MCP server: over stdio, agents list and describe the catalog, validate UI specs with correctable issues and render them as MCP Apps surfaces through the guarded renderer
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:catalog-readme-status:end -->
