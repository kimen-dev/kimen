# Research: Consumer catalog registration (spec 032)

Phase 0 consolidation. Primary inputs: the three-agent research workflow of
2026-08-15 (software-engineering RAG on extensible/secure API design; A2UI
custom-catalog format; emitter-pattern survey) and its synthesis, plus
first-hand analysis of `packages/catalog/src`. Raw reports live in the
session scratchpad (`research/{synthesis,rag-best-practices,a2ui-format,emitter-patterns}.md`);
everything load-bearing is restated here.

## D1 — API shape: pure functional creation, no registry

**Decision**: one entry point, `createCatalog(definition, options?)`,
returning a result object (`ok` + `catalog` | `issues`), where
`options.extend` supplies a base catalog to merge under. No mutation of any
module state; callers thread the returned catalog explicitly into
`validateUiSpec(input, { catalog })` and `RenderOptions.catalog`.

**Rationale**: a static mutable registry defeats test isolation and
substitution, opens a mutate-after-validate (TOCTOU) window, and turns every
consumer of the module into a shared-fate tenant (registry-pattern pitfalls;
PoEAA). A value-object catalog gives change-by-replacement semantics, makes
guardrail tests trivially isolatable (fresh catalog per test), and keeps the
renderer's only gate "membership in the catalog value I was handed" — the
renderer stays tag-agnostic.

**Alternatives considered**:
- *Mutable module-global `registerComponents()`* — least ceremony; rejected
  for the reasons above (research synthesis marked it rejected).
- *Build-time generation from a consumer's Custom Elements Manifest (CLI)* —
  zero runtime cost and full type inference, but demands a build step and a
  CEM from consumers, and serves no runtime composition; **deferred** as
  possible future sugar that must emit `createCatalog` input, never a
  parallel mechanism.
- *Two entry points (`createCatalog` + `extendCatalog`)* — collapses into
  one function with an `extend` option (Art. VII: smallest surface that
  satisfies S1–S16; both modes are contract-covered).

## D2 — Entries are contracts, never component references

**Decision**: the definition carries only data — the existing `CatalogEntry`
shape (tag, description, whenToUse, whenNotToUse, props, slots, events).
Component implementation never enters the catalog; consumers call
`customElements.define` themselves.

**Rationale**: keeps the catalog a pure schema boundary (no code-execution
path from definitions, Art. VIII), keeps SSR/DSD options open, and makes the
JSON facade exactly what the adopter asked for: "componentes propios con una
fachada .json delante". One entry contract for both origins is Art. I's
one-source-of-truth applied to the format.

**Alternatives considered**: per-entry validator callbacks or lifecycle
hooks (a "plugin" model) — rejected: a callback is a code-execution path
inside the trust boundary and violates the standard-contract rule the
microkernel pattern demands.

## D3 — Registration is a trust barricade at the UI-spec bar

**Decision**: definition input crosses `toPlainData` (the existing purity
wall: forbidden keys, accessors, functions, cycles, byte budget
`VALIDATION_MAX_BYTES`, depth budget) and then a private strict Zod schema
(unknown keys rejected; guidance fields required non-blank; enum requires
non-empty `values`; scalar-only constraint grammar identical to
`CatalogPropConstraint`). Tags must match a conservative custom-element
pattern (lowercase ASCII, hyphen-mandatory) and must not be an SVG/MathML
reserved name; collisions (in-definition duplicates via JSON semantics, and
against the extend base) are hard errors. All rejections are
`RegistrationIssue`s naming code, path, offender — the `ValidationIssue`
diagnostic style. `createCatalog` never throws on bad input.

**Rationale**: the definition arrives from config files, network payloads or
build pipelines the library does not control (spec User Story 2); a weaker
door here voids the guardrail (barricade principle: validate at the
boundary, assert inside). Reusing the purity wall keeps ONE wall (Art. I)
instead of two drifting ones.

**Alternatives considered**: trusting definitions ("the consumer wrote
them") — rejected; 027/028's history (prototype-pollution and TOCTOU classes
found by review) shows the bar exists for a reason.

## D4 — Snapshot + deep-freeze; base entries re-snapshotted

**Decision**: the produced catalog is a plain-data snapshot of validated
entries, deep-frozen (`Object.freeze` on every node). In extend mode the
BASE entries are snapshotted and frozen too, not shared by reference.

**Rationale**: S10 (immutability) and TOCTOU-proofing: the generated
`catalogData` is `as const` (compile-time only) and NOT frozen at runtime —
merging by reference would let `catalogData.components['ki-button']`
mutations flow into "immutable" consumer catalogs. Snapshotting ~29 base
entries is a one-time, trivially cheap cost.

**Alternatives considered**: freeze-on-return only at the top level —
rejected (nested props/slots records would stay mutable); `Proxy`-based
read-only views — rejected (runtime cost on the hot path, exotic semantics).

## D5 — Catalog-in-use resolution, version skew, type-pinning

**Decision**: `validateUiSpec`, `validatePlainData`, `renderUiSpec` and
`createStreamingRenderer` resolve `catalog ?? builtInCatalog` once at entry
and thread it through `checkNode`, `versionDiagnostic` (skew compares the
spec's declared version against the catalog-in-use's `catalogSchemaVersion`)
and `buildNode` (`type`-prop pinning reads the catalog-in-use entry). A
created catalog carries the current `CATALOG_SCHEMA_VERSION`; extend mode
refuses a base whose `catalogSchemaVersion` differs from the current one
(fail-closed, named).

**Rationale**: FR-011 ("never half-applied") — grep shows exactly four
coupling sites (`validate.ts:46/367`, `render.ts:19/242/285`); threading a
parameter through them is surgical. Skew parity is S15.

**Alternatives considered**: catalog as a constructor-bound renderer factory
(`createRenderer(catalog)`) — a nice-to-have ergonomic layer that doubles
the surface; rejected for v1 (Art. VII), revisitable without breakage.

## D6 — No precompiled per-entry prop schemas in v1

**Decision**: keep the existing hand-rolled `checkProp` switch; do NOT add a
per-entry compiled-schema cache.

**Rationale**: the hot path is already an O(1) record lookup plus a
branch-light switch over scalar types; the research synthesis itself
conditioned the cache on a benchmark. Adding cache machinery now is
speculative complexity (Art. VII). A timing sanity check in the new suite
documents that extended-catalog validation is not measurably slower than
built-in validation.

**Alternatives considered**: precompiling Zod schemas per entry at
`createCatalog` time — deferred until a real benchmark shows `checkProp` as
a bottleneck.

## D7 — Scalar-only prop space; `required` flag deferred; `events` stay descriptive

**Decision**: registered prop constraints use the exact
`CatalogPropConstraint` grammar (boolean | number | string | enum over
strings, optional `documentedValues` and `default`). No `required` flag in
v1: built-in entries have none (component defaults exist), the UiSpec
validator has no required-prop concept, and adding one only for consumer
entries would fork the entry contract. The `events` record remains
descriptive metadata; the declared-actions channel stays the only dispatch
surface.

**Rationale**: symmetry (one entry contract, Art. I), minimalism (Art. VII),
and the UiSpec format's scalar prop values (027). A future additive
`required` is a MINOR change; recorded for the A2UI-export follow-up, which
is where it earns its keep.

## D8 — Standards alignment noted, protocol vocabulary excluded

**Decision**: the definition format stays protocol-neutral; the A2UI
custom-catalog export (`toA2uiCatalog`) is explicitly OUT of this spec and
OUT of `@kimen/catalog`/`@kimen/emitter` — if built, it lives in
`@kimen/adapter-a2ui` (Art. VIII: protocol churn belongs to adapters),
recorded as a follow-up backlog item.

**Rationale**: A2UI research confirms the Kimen entry shape maps cleanly to
an A2UI catalog component (enum→`{type:'string',enum}`, default slot→
children, named slots→child props, guidance→description/instructions), so
losslessness needs no format change today beyond the deferred `required`
flag. Keeping the export out preserves FR-009 and the adapter discipline.

## D9 — Error-reporting style and codes

**Decision**: `RegistrationIssue` mirrors `ValidationIssue` ({code, path,
message, value?}) with new codes: `collision`, `invalid-tag`,
`missing-guidance`, `malformed-constraint`, `malformed-definition`,
`empty-definition`, plus the purity-wall codes reused verbatim
(`forbidden-key`, `size-budget`, `depth-budget`, `malformed-spec` renamed in
context). Messages name the offender and never echo attacker-controlled
payload bodies beyond the offending identifier.

**Rationale**: one diagnostic idiom across the package (031 hosts already
consume the `ValidationIssue` shape); structured, coded errors are the
production-observability recommendation from the RAG report.

## Security invariants checklist (verified against design)

1. Only catalog-member tags validate/render; catalog-in-use is the sole gate. ✓ (D5)
2. Only declared actions dispatch; single delegated channel unchanged. ✓ (no change)
3. Unknown props/slots/keys rejected, relative to catalog-in-use. ✓ (D5)
4. No code-execution path from spec OR definition data. ✓ (D2, D3)
5. Purity wall on both inputs. ✓ (D3)
6. Snapshot + deep freeze; mutation cannot alter outcomes. ✓ (D4)
7. Budgets unchanged and enforced (validation + render + stream). ✓ (no change)
8. URL allowlist unchanged, applies by prop name over any catalog. ✓ (S14)
9. Version skew fails closed for created catalogs. ✓ (D5)
10. Override/shadow of existing tags is a hard error; no bypass flag. ✓ (D3)
