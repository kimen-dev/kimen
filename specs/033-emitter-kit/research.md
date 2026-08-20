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
