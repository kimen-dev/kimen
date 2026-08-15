# @kimen/emitter

The emitter kit of Kimen's GenUI layer (spec 033): model-agnostic guidance
artifacts and emission ingest helpers, derived deterministically from a
catalog value — the built-in generated catalog or one you registered with
`createCatalog` (spec 032). One catalog in; a system prompt, a
catalog-specialized JSON Schema, a provider-neutral tool definition, and
the two helpers that close the reliability loop out.

**Security model, up front**: everything this package produces is
ADVISORY. A derived schema or prompt improves a model's first-try
validity; it authorizes nothing. Budgets, the URL scheme allowlist, the
purity wall and catalog membership are enforced ONLY by `validateUiSpec`
and the guarded renderer in `@kimen/catalog` — always run emissions
through them, whatever your provider's "guaranteed" mode promises.

## Deriving guidance for your model

```ts
import { catalogData, createCatalog } from '@kimen/catalog';
import { catalogPrompt, uiSpecJsonSchema, uiSpecTool } from '@kimen/emitter';

const registered = createCatalog(myDefinition, { extend: catalogData });
if (!registered.ok) throw new Error(registered.issues[0].message);
const catalog = registered.catalog;

catalogPrompt(catalog);                                  // → { ok, artifact: string }
uiSpecJsonSchema(catalog, { target: 'openai-strict' });  // → { ok, artifact: JSON Schema }
uiSpecTool(catalog, { target: 'openai-strict' });        // → { ok, artifact: { name, description, inputSchema } }
```

- **Prompt** (`catalogPrompt`): works with ANY model — format rules, every
  component's when-to-use / when-NOT-to-use guidance verbatim, props with
  enums inline, and one example spec that validates against the same
  catalog. Judgment lives here; shape lives in the schema.
- **Schema** (`uiSpecJsonSchema`): the neutral UI-spec format specialized
  to your catalog (one branch per component, closed objects, closed
  enums). Targets: `draft-2020-12` (default), `openai-strict` (closed
  all-required objects, recursion kept via `$ref`, documented provider
  limits enforced with named offenders), `anthropic-strict` (additionally
  recursion-free: the node tree unrolled to a bounded composition depth,
  default 6 via `maxDepth` — a schema bound only; deeper specs still
  validate at the boundary).
- **Tool** (`uiSpecTool`): `{ name: 'emit_ui', description, inputSchema }`
  — maps mechanically onto any provider's tool/function surface.

Every derivation accepts `{ components: [...] }` to subset large catalogs,
returns `{ ok: false, issues }` (never throws) on version skew, unknown
subset members or exceeded provider limits — never a silent truncation —
and stamps the catalog schema version on the artifact. Identical inputs
yield byte-identical artifacts.

## Closing the reliability loop

```ts
import { validateUiSpec, renderUiSpec } from '@kimen/catalog';
import { normalizeEmission, repairPrompt } from '@kimen/emitter';

const spec = normalizeEmission(JSON.parse(modelOutput));
let report = validateUiSpec(spec, { catalog });
if (!report.ok) {
  const repair = repairPrompt(report);      // ONE corrective message…
  const second = normalizeEmission(JSON.parse(await askModel(repair)));
  report = validateUiSpec(second, { catalog });
  if (!report.ok) throw new Error('emission rejected'); // …then fail closed
}
renderUiSpec(spec, { surface, catalog });
```

`normalizeEmission` strips exactly the placeholders strict-mode
all-required schemas force a model to emit (null-valued props, null action
bindings, empty props containers) and touches nothing else — a value the
model got WRONG stays wrong so validation reports it. `repairPrompt`
formats every issue (code, path, named offender) into a single corrective
message; the one-round-then-fail-closed policy is deliberate and fixed.

See [the emitting-specs guide](../../docs/guides/emitting-specs.md) for
provider wiring patterns, and
[the UI-spec format guide](../../docs/guides/ui-spec.md) for the format
itself.

<!-- kimen:capabilities:emitter-readme-status:start -->
- **available** — Consumer catalog registration: your own components behind a JSON facade, validated and rendered through the same fail-closed guardrail
- **available** — Emitter kit: model-agnostic prompt, catalog-specialized JSON Schema and tool definition so any LLM emits valid specs, with a single-round repair loop
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **planned** — AG-UI and json-render protocol adapters planned
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:emitter-readme-status:end -->
