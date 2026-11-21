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
  enums inline, required and URL props marked and numeric ranges stated, and one
  example spec that validates against the same catalog. Judgment lives
  here; shape lives in the schema.
- **Schema** (`uiSpecJsonSchema`): the neutral UI-spec format specialized
  to your catalog (one branch per component, closed objects, closed
  enums, the optional stable node `id` in the boundary's grammar, and the
  limits the catalog declares: a `required` prop is
  required, non-blank and never nullable; numeric bounds become
  `minimum`/`maximum`). The URL policy is not in the schema: no target
  expresses it faithfully, so the prompt states it and the boundary
  enforces it. Targets: `draft-2020-12` (default) and `openai-strict`
  (closed all-required objects, recursion kept via `$ref`, only the
  keywords OpenAI's strict mode documents, its published size limits
  enforced with named offenders).
- **Tool** (`uiSpecTool`): `{ name: 'emit_ui', description, inputSchema }`
  — maps mechanically onto any provider's tool/function surface.

### Which target for which provider

| Provider mode | Target | Why |
|---|---|---|
| OpenAI Structured Outputs / strict function calling | `openai-strict` | Stays inside the documented subset: `pattern` instead of `minLength`, every size limit checked. A test measures the artifact against the published numbers. |
| Anthropic tools | `draft-2020-12` on a regular (non-strict) tool | Anthropic's strict mode rejects recursive schemas and caps a request at 24 optional and 16 union-typed parameters; no catalog-specialized schema of a real catalog fits, so the kit ships no strict target for it. |
| Anything else that takes a JSON Schema as guidance | `draft-2020-12` | The neutral default. |
| No schema support at all | prompt only | `catalogPrompt` works with any model. |

Provider limits were read in the official documentation on 2026-11-14
([OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs),
[Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)).
Whatever the mode, run every emission through `validateUiSpec`.

Every derivation accepts `{ components: [...] }` to subset large catalogs,
returns `{ ok: false, issues }` (never throws) on version skew, unknown
subset members or exceeded provider limits — never a silent truncation —
and stamps the catalog schema version on the artifact. Identical inputs
yield byte-identical artifacts.

## Closing the reliability loop

```ts
import { validateUiSpec, renderUiSpec } from '@kimen/catalog';
import { normalizeEmission, repairPrompt } from '@kimen/emitter';

let spec = normalizeEmission(JSON.parse(modelOutput));
let report = validateUiSpec(spec, { catalog });
if (!report.ok) {
  const repair = repairPrompt(report);      // ONE corrective message…
  spec = normalizeEmission(JSON.parse(await askModel(repair)));
  report = validateUiSpec(spec, { catalog });
  if (!report.ok) throw new Error('emission rejected'); // …then fail closed
}
renderUiSpec(spec, { surface, catalog });   // renders the ACCEPTED emission
```

`normalizeEmission` strips exactly the placeholders strict-mode
all-required schemas force a model to emit (null-valued props, null action
bindings, null node ids, empty props containers) and touches nothing else — a value the
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
- **available** — Generated framework wrappers: @kimen/react, @kimen/vue and @kimen/angular with typed props, native events and each framework form idiom, drift-gated
- **available** — Schema-constrained guarded renderer: untrusted UI specs render only through the neutral catalog, fail-closed
- **available** — Live surface: a long-lived surface stays current through atomic, id-addressed batches validated by the same guardrail, so focus, typed text and scroll survive
- **available** — Kimen MCP server: over stdio, agents list and describe the catalog, validate UI specs with correctable issues and render them as MCP Apps surfaces through the guarded renderer
- **hardening** — Changed-core mutation quality gate in hardening
- **available** — A2UI protocol adapter: declarative A2UI messages render through the guarded renderer
- **available** — MCP Apps adapter: Kimen surfaces reach MCP Apps hosts as self-contained ui:// resources rendered through the guarded renderer
- **available** — Neutral runtime component catalog with schema-validated UI specs at the GenUI boundary
- **available** — Machine-readable Web Components foundation with token-driven theming
<!-- kimen:capabilities:emitter-readme-status:end -->
