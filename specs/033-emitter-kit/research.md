# Research: Emitter kit (spec 033)

Phase 0 consolidation. Shares the 2026-08-15 research workflow with spec
032; the emitter-specific report (per-system findings: json-render's
`catalog.prompt()`, tambo registration, A2UI prompt-first Agent SDK, Thesys
C1 custom components, provider structured-output subsets, Zod 4
`z.toJSONSchema` options) is restated here where load-bearing.

## D1 — Hand-built JSON Schema, not z.toJSONSchema

**Decision**: construct schema documents directly from `Catalog` entries.

**Rationale**: the catalog's private Zod schema describes the GENERIC
UiSpec, not the catalog-specialized one (per-component branches with closed
props are the whole point); z.toJSONSchema would require rebuilding a Zod
tree per catalog first, then post-processing for every provider target
anyway (verified: Zod 4 offers no provider-strict targets). Direct
construction is fewer moving parts, zero runtime deps, full dialect
control, trivially deterministic.

**Alternatives**: z.toJSONSchema pipeline (rejected above); publishing the
private Zod schema from the catalog package (rejected: widens 027's surface
and still not catalog-specialized).

## D2 — Targets: draft-2020-12 (default), openai-strict, anthropic-strict

**Decision**: three named targets. `openai-strict`: every object
`additionalProperties: false` + all properties required (optionality = null
unions), recursion KEPT via `$ref` (supported), limits enforced (1000 total
enum values, 5000 properties, 10 schema nesting levels, 120k chars of
names/enum strings) with the offending component named. `anthropic-strict`:
recursion UNSUPPORTED by the provider → unroll node tree to bounded depth
(option `maxDepth`, default 6; leaf level accepts text children only),
closed objects, no numeric/string min/max, depth bound declared in the
artifact's description and `$comment`.

**Rationale**: verified provider facts (2026-08): OpenAI strict supports
recursive `$ref`; Anthropic structured outputs / strict tools reject
recursive schemas; the safe cross-provider core is
object/array/scalars + enum + const + anyOf + non-recursive $ref +
all-required + closed objects. Silent truncation is the one unforgivable
failure (a model that cannot see a component will never emit it) — hence
named-offender failures (FR-009/S15).

**Alternatives**: single lowest-common-denominator target (rejected: wastes
OpenAI's recursion support and bloats every schema); per-provider SDK
adapters (rejected: Art. VII, and the tool artifact already maps
mechanically).

### D2 amendment (2026-11-14): `anthropic-strict` removed, `openai-strict` re-pinned

Both provider subsets were re-read in the official documentation on
2026-11-14.

Anthropic, "Structured outputs"
(<https://platform.claude.com/docs/en/build-with-claude/structured-outputs>),
sections "JSON Schema limitations" and "Schema complexity limits": not
supported — recursive schemas, numerical constraints (`minimum`, `maximum`,
`multipleOf`), string constraints (`minLength`, `maxLength`), array
constraints beyond `minItems` 0 or 1, `additionalProperties` other than
`false`. Explicit limits per request, across all strict schemas: 20 strict
tools, 24 optional parameters (each parameter not listed in `required`),
16 parameters with union types (`anyOf` or type arrays); beyond them, an
internal grammar-size limit ("Schema is too complex for compilation") and a
180-second compilation timeout.

Measured on the built-in catalog, the shipped `anthropic-strict` artifact
was 291 KB with 719 `anyOf` (708 of them null unions) and 175 `minLength`.
It could not be sent. Every optional prop costs one optional parameter or
one union, and a catalog-specialized schema needs one union per child
position to choose among components, per unrolled level: three small
components at depth 2 already carried 27 unions. Only a single leaf
component at depth 1 fit. **Decision**: remove the target (Art. VII) rather
than ship a lowering that only toy subsets satisfy and that cannot be
verified without calling the provider. Integrators on that provider use the
default dialect as advisory guidance (a regular, non-strict tool), the
prompt and the single-round repair loop.

OpenAI, "Structured Outputs", section "Supported schemas"
(<https://developers.openai.com/api/docs/guides/structured-outputs>):
supported string keywords are `pattern` and `format` (date-time, time,
date, duration, email, hostname, ipv4, ipv6, uuid); number keywords
`multipleOf`, `maximum`, `exclusiveMaximum`, `minimum`, `exclusiveMinimum`;
array keywords `minItems`, `maxItems`. Root must be an object and not
`anyOf`; all fields required; `additionalProperties: false` on every
object; up to 5000 object properties and 10 nesting levels; 120,000
characters of property names, definition names, enum values and const
values; 1000 enum values, and 15,000 characters for a single string enum
above 250 values; `allOf`, `not`, `dependentRequired`, `dependentSchemas`,
`if`/`then`/`else` unsupported; recursion and `$defs` supported. The guide
lists `minLength`/`maxLength` only among the keywords fine-tuned models do
not support, never among the supported string properties, so
`openai-strict` no longer emits `minLength` (the non-empty rule of an
action name is a `pattern`), and the single-enum rule is now enforced.

## D3 — Prompt carries judgment, schema carries shape

**Decision**: whenToUse/whenNotToUse, composition rules and the validated
example live in the prompt ONLY; in-schema descriptions stay terse
(prop-level one-liners). The example embedded in the prompt is validated in
tests against the same catalog (S8) — the A2UI `validate_examples` idea.

**Rationale**: token cost and provider char/enum limits (120k chars); both
artifacts derive from the same entries so they cannot drift (Art. I).
Precedents: json-render `catalog.prompt()`, A2UI prompt-first schema
manager.

## D4 — Ingest helpers: normalizeEmission + repairPrompt, one round, fixed

**Decision**: `normalizeEmission` strips null-valued props and empty
optional containers (the all-required strict pattern forces models to emit
placeholders); pure data cleanup, never touches non-placeholder values.
`repairPrompt(report)` formats a `ValidationReport` into ONE corrective
message (code + path + offender per issue) and `null` on ok; the
single-round-then-fail-closed policy is fixed (Art. VII).

**Rationale**: without normalization, the strict targets would GENERATE
specs the boundary rejects (null prop values are not scalars) — the kit
would be self-defeating. Constrained decoding degrades on hard schemas
(JSONSchemaBench: 28–41% on hard classes), so the repair loop is the
honest floor; one round bounds cost and abuse surface.

**Alternatives**: configurable retries (rejected: Art. VII; hosts can loop
themselves if they insist — the kit won't encourage it); partial-JSON
healing/stream compiler (json-render/A2UI precedent) — DEFERRED with
record: the guarded renderer already streams complete nodes; text-level
healing pends real demand.

## D5 — Result-object errors, catalog-version skew refused

**Decision**: derivations return `{ ok: true, artifact } | { ok: false,
issues: EmitterIssue[] }` with the 032 diagnostic idiom (code, path,
message, value). Codes: `unknown-component` (bad subset),
`empty-subset`, `unsupported-version` (catalog skew, S12),
`provider-limit` (S15), `malformed-catalog` (structural guard).
`normalizeEmission` and `repairPrompt` are total functions (no result
wrapper).

**Rationale**: one error idiom across the GenUI layer; skew parity with
032 FR-008 — an emitter for a catalog the boundary can't validate would
manufacture invalid emissions.

## D6 — Determinism as contract

**Decision**: artifacts are built from sorted entries in fixed key order;
no timestamps, no environment reads; byte-identical outputs (S11) are a
tested guarantee. Version stamps: schema `$id`
(`https://kimen.dev/schemas/ui-spec/<catalogSchemaVersion>`), prompt header
line, tool description (FR-012).

**Rationale**: golden-testing and CI diffability (Art. I bar applied to
derived artifacts); Anthropic grammar caches invalidate on structural
change — deterministic output avoids gratuitous cache busts.

## Security invariants (Art. VIII fit)

1. The kit adds NO enforcement path and no code-execution path; inputs are
   plain data in, plain data out.
2. The schema is advisory: budgets, URL allowlist, purity wall,
   declared-actions cross-field stay boundary-only — documented loudly
   (FR-011) and pinned by the agreement property (SC-002: ajv-accepted ⇒
   boundary-accepted, or rejected only for schema-inexpressible rules).
3. Version skew fails closed at derivation (S12) as it does at render.
4. `normalizeEmission` output is untrusted until `validateUiSpec` passes —
   the docs show the loop in that order.
