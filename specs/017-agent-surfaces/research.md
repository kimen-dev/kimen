# Phase 0 Research: Agent surfaces

Decisions that resolve every open technical question in the plan. Sources:
the 017 spec (S1–S6, FR-001–FR-009), the observed state of
`packages/elements/generated/docs.json` (timestamp + 4 absolute paths in
`complexType.references.*.path` — verified 2026-07-08), the Stencil
`docs-json` type surface (`generated/docs.d.ts`), the tokens-sync gate
precedent (`scripts/gates/gates-suite.sh`), and the repo's supply-chain
policy (`pnpm-workspace.yaml`: `minimumReleaseAge` 7d, `no-downgrade`,
`blockExoticSubdeps`).

## D1 — CEM derivation: own zero-dependency mapper over Stencil docs.json

**Decision**: a repo-owned ESM library
(`packages/elements/scripts/agent-surfaces.mjs`) maps the normalized
`generated/docs.json` to a Custom Elements Manifest (`schemaVersion`
"1.0.0" shape: `modules[] → declarations[] (kind: class, customElement:
true) → attributes/members/events/slots/cssParts/cssProperties`). No new
dependency of any kind. The class name (docs.json does not carry it) is
derived as PascalCase(tag) — safe because the Nx generator enforces
`ki-[a-z…]` tags and `names().className`, so `ki-button → KiButton` is the
invariant construction, documented in data-model.md.

**Rationale**: docs.json already contains 100% of the data the manifest
needs (verified field-by-field in data-model.md: props with types, defaults,
attrs, reflect; events; methods; slots; parts; styles; docsTags). The
transformation is JSON→JSON, ~150 lines, pure functions — cheaper to own
than any dependency is to vet: pnpm's `minimumReleaseAge` 7d and
`no-downgrade` policies make each new package a recurring review cost, and
Art. IV demands a written justification we would rather not need.

**Alternatives considered**: (a) `@custom-elements-manifest/analyzer` — runs
its own TypeScript analysis; Stencil's decorators need community plugins,
its dep tree is large, and it would create a SECOND analysis pass competing
with Stencil's (two sources of truth, Art. I violation in spirit); rejected.
(b) community Stencil→CEM generator packages — third-party maintenance risk
for a trivial mapping we can read in one screen; supply-chain policy cost;
rejected. (c) waiting for an upstream Stencil CEM output target — does not
exist today; the spec's assumption already names docs-json as the source;
rejected.

## D2 — docs.json normalization (FR-008): post-process in place, inside the build target

**Decision**: `build-surfaces.mjs` runs immediately after `stencil build`
inside the same package `build` script
(`"build": "stencil build && node scripts/build-surfaces.mjs"`). Its first
step rewrites `generated/docs.json` in place: delete the top-level
`timestamp` key; relativize every `components[].props[].complexType.references.*.path`
(and `filePath`/`dirPath`/`readmePath`/`usagesDir` if ever absolute) to the
package root with POSIX separators; re-serialize with stable 2-space
indentation + trailing LF. The committed docs.json is therefore already
normalized, and the surfaces-sync gate (D5) covers it.

**Rationale**: FR-008's observed defect is precisely that the committed
intermediate dirties every CI regeneration (timestamp changes on each build;
absolute paths differ per machine). Normalizing at the only place the file
is produced keeps one writer and lets the CEM/llms generators consume an
already-clean input. Storybook (`.storybook/preview.ts` imports
`../generated/docs.json` for `setCustomElementsManifest`) reads
`components/props/docsTags` only — neither `timestamp` nor reference paths —
so the normalization is invisible to it. `generated/docs.d.ts` remains
Stencil-generated (Art. I forbids hand-editing it) and still *declares* a
`timestamp` field; that is a type-surface superset, not a runtime problem,
and no gate typechecks against the JSON's literal shape (`.storybook/` is in
the ESLint disable-type-checked block and outside every tsconfig project).

**Alternatives considered**: (a) leave docs.json raw and normalize only the
downstream surfaces — the committed intermediate keeps drifting on every CI
build, which is the exact defect FR-008 names; rejected. (b) a custom
Stencil output target or config option to suppress the fields — no upstream
hook exists for `timestamp`/reference paths in `docs-json`; rejected.
(c) setting `timestamp` to a constant epoch instead of deleting it — keeps
d.ts shape parity but violates FR-008's letter ("no timestamp") and keeps
dead data; rejected.

## D3 — Guidance tag convention: `@whenToUse` / `@whenNotToUse` on the component class

**Decision**: component-level guidance lives in two dedicated JSDoc tags on
the component class:

```ts
/**
 * A token-styled action button with native button semantics.
 *
 * @whenToUse Trigger the single main action of a view, supporting actions
 * in descending hierarchy, or confirming/destructive actions through tone.
 * @whenNotToUse Navigation, icon-only actions, persistent toggles, or
 * loading/progress semantics.
 */
```

Stencil forwards unknown JSDoc tags verbatim into
`components[].docsTags[{name, text}]` (verified: the current docs.json
already carries `slot`/`part` tags there), so both generators read the tags
from docs.json with no compiler work. Migrating ki-button's current prose
("When to use: … / When NOT to use: …" in the class JSDoc) to the tags is
task one — FR-003 puts it IN scope so the gate is born green. Prop-level
"When NOT to use:" prose stays inside each prop's description (it flows
verbatim into the member description; FR-003's dedicated tags are the
component-level contract).

**Rationale**: a dedicated tag is machine-stable (S3's "verbatim" is
testable byte-for-byte), while prose prefix parsing ("When to use:") is a
regex convention that silently breaks on rewording. `docsTags` is already
the transport Stencil gives us for free.

**Alternatives considered**: (a) parse the existing prose paragraphs —
brittle, unfalsifiable contract; rejected. (b) Stencil `usage/` markdown
directories — per-component hand-maintained files, exactly what Art. I
forbids as contract; rejected. (c) tags per prop as well — component-level
guidance is what US1 needs; prop descriptions already carry their own
guidance prose; adding more structure now is speculative (Art. VII);
rejected.

## D4 — llms.txt generator: preamble template + package metadata + per-component entries

**Decision**: `buildLlmsTxt(docs, pkg, preamble)` composes, in order: an H1
title and blockquote from `package.json` `name`/`description`; the verbatim
body of the committed template
`packages/elements/scripts/llms-preamble.txt` (installation instruction,
registration snippet, tokens/theming note); then one `### <tag>` section per
component in docs.json order, carrying description, the two guidance tags
verbatim, and compact attribute/slot/part/event/CSS-property lists (exact
format in contracts/agent-surfaces-contract.md). Output is written to BOTH
`packages/elements/llms.txt` (published: added to `files`) and the repo
root `llms.txt`, byte-identical (spec assumption kept: root copy for repo
discovery, package copy for npm consumers; consolidation was considered and
rejected because the two audiences never see the same filesystem).

**Rationale**: FR-002 fixes the two allowed preamble sources (package
metadata + committed template) — this keeps the file generated end-to-end
while letting a human curate the one paragraph that is genuinely editorial,
inside a versioned input rather than the output. Deriving component entries
from docs.json (not from the CEM) keeps both surfaces siblings of one source
with no chaining, so a CEM mapping bug cannot corrupt llms.txt too.

**Alternatives considered**: (a) hand-written llms.txt — hand-maintained
artifact, Art. I violation; rejected. (b) deriving entries from the CEM —
adds an internal dependency between outputs for zero gain; rejected.
(c) llms-full.txt / per-component files — speculative (Art. VII); rejected.

## D5 — Sync gate: `surfaces-sync` right after `tokens-sync`

**Decision**: one new gate in `scripts/gates/gates-suite.sh`, placed
immediately after `tokens-sync` (both depend on the `build` gate having just
regenerated everything):

```bash
# Agent surfaces are committed contracts (Art. I): the normalized docs-json
# intermediate, the custom-elements manifest and both llms.txt copies must
# match a fresh regeneration exactly (tokens-sync precedent).
run_gate surfaces-sync git diff --exit-code -- \
  packages/elements/generated packages/elements/llms.txt llms.txt
```

Nx cache correctness is part of this decision: the elements `build` target
gains `outputs: ["{projectRoot}/dist", "{projectRoot}/generated",
"{projectRoot}/llms.txt", "{workspaceRoot}/llms.txt"]` (so a cache replay
restores the artifacts and the gate never diffs against a skipped
regeneration) and `inputs` keeps/extends the exclusions
(`!{projectRoot}/generated/**` exists today; add `!{projectRoot}/llms.txt`)
so the build's own outputs never invalidate its cache hash.

**Rationale**: `git diff --exit-code` is the exact trust model tokens-sync
already established (generated, committed, diffable) — S5's "fails pointing
at the stale files" is git's own output. All four artifact paths are fixed
files: a future component changes their *content*, never adds an untracked
path, so `git diff`'s untracked-file blindness (shared with tokens-sync)
only matters at the born-green bootstrap commit, which this feature itself
makes.

**Alternatives considered**: (a) fold the paths into tokens-sync — mixes
failure domains and messages; rejected. (b) a `--check` mode in the
orchestrator comparing regeneration to disk — weaker than git diff (it
passes on regenerated-but-uncommitted files) and duplicates what git does;
rejected as the gate, kept trivially available for debugging. (c) a
separate nx target instead of chaining into `build` — then "the build MUST
produce" (FR-001/FR-002) would be false and every consumer needs to know a
second verb; rejected.

## D6 — Reproducibility (S6): prove determinism at the function seam, re-prove it in CI

**Decision**: three deterministic layers, no repo-copy build in the gate:

1. **Unit (the S6 test)**: run the full pipeline functions twice over
   fixture docs.json inputs that are identical except for their absolute
   path prefix (`/Users/alice/kimen/...` vs `/home/ci/work/...` in
   `complexType.references.*.path`) and their `timestamp`; assert
   byte-identical outputs for all three surfaces.
2. **Invariants over the real artifacts**: after normalization, assert the
   committed outputs contain no `timestamp` key, no path segment matching
   the absolute-path shape (`/Users/`, `/home/`, drive letters), and end
   with a single LF (stable serialization).
3. **Structural**: CI checks out at a different filesystem path from every
   developer machine, so the `surfaces-sync` gate re-proves S6 on every PR
   for free (SC-003) — any path or clock leak makes the gate fail there.

**Rationale**: copying the whole repo to a tmpdir and rebuilding inside a
test would take minutes, drag pnpm/Stencil into the test's trust boundary
and add flake surface (Art. III: deterministic tests). The function seam is
where path/clock data could enter; testing there is both sufficient and
fast. The quickstart keeps the full "copy the checkout to /tmp and rebuild"
walkthrough as a manual validation.

**Alternatives considered**: full tmpdir rebuild as an automated test —
slow, network-adjacent, flaky; rejected (manual quickstart step instead).

## D7 — Test harness and static-analysis wiring for scripts

**Decision**: tests are Vitest 4 (node environment) in
`packages/elements/scripts/agent-surfaces.spec.ts`, run by a new
`vitest.node.config.ts` chained into the package `test` script
(`"test": "vitest run && vitest run --config vitest.node.config.ts"`, so the
existing nx `test` target and gate pick them up unchanged). Wiring needed to
stay green across the deterministic layer:

- **Traceability**: `check-traceability.sh` only counts `*.spec.ts`,
  `*.spec.tsx`, `*.e2e.ts` under `packages/` — so the tokens precedent
  (`node --test scripts/*.test.mjs`) is NOT usable here: `.test.mjs` files
  are invisible to the gate. `.spec.ts` under `packages/elements/scripts/`
  satisfies it; marker `// @spec:017-agent-surfaces`, S-IDs in test titles.
- **Typecheck**: new `packages/elements/scripts/tsconfig.json` (extends the
  package tsconfig; `include: ["./**/*.ts"]`, `allowJs` so importing the
  `.mjs` library resolves) + root `typecheck` script gains
  `tsc -p packages/elements/scripts --pretty false` (browser-tests
  precedent).
- **ESLint**: the existing relax block ("Config and script files") matches
  `'**/*.mjs', 'scripts/**', 'tools/**'` — extend its `files` with
  `'packages/*/scripts/**'` so the `.spec.ts` files get
  `disableTypeChecked` like every other non-shipped script (otherwise
  `strictTypeChecked` + `projectService` errors on `.mjs` imports typed as
  any).
- **knip**: `build-surfaces.mjs` becomes an entry via the package.json
  `build` script reference; `vitest.node.config.ts` matches the existing
  `packages/*` entry glob `*.config.{ts,mjs}` and knip's vitest plugin
  marks the spec files; fixtures are JSON (not analyzed). No knip.json
  change expected — verify, and if knip still flags a file, add the entry
  in the same change (Art. X: rule it, don't review it).

**Rationale**: the scripts are build infrastructure, not shipped code — the
repo already has a policy lane for exactly that (root `scripts/**`,
`tools/**`); extending the lane to `packages/*/scripts/**` is consistent,
one-line, and keeps `strictTypeChecked` intact for all shipped code.

**Alternatives considered**: (a) `node --test` with `.test.mjs` (tokens
precedent) — invisible to the traceability gate; rejected. (b) placing spec
files under `src/` to reuse the stencil-env vitest project — pollutes the
component tree, runs infra tests in mock-doc for no reason, and `tsc -p
packages/elements` would need `allowJs`; rejected. (c) writing the
generators in TypeScript executed via Node type-stripping — ties the build
to Node-version-dependent TS execution; rejected.

## D8 — Publication surface: manifest in `generated/`, discovery via package.json

**Decision**: the CEM is emitted to
`packages/elements/generated/custom-elements.json`; discovery follows the
ecosystem convention — a `"customElements": "generated/custom-elements.json"`
field in `packages/elements/package.json` — and the packed tarball adds
`"generated/custom-elements.json"` and `"llms.txt"` to `files`. The
`generated/` placement keeps the existing biome
(`!packages/elements/generated/**`), ESLint (`**/generated/**`) and knip
(`**/generated/**`) exclusions working with zero config churn, and gives the
surfaces-sync gate a single directory prefix.

**Rationale**: every CEM consumer (editors, Storybook, framework tooling,
the future Fase-3 catalog) resolves the manifest through the package.json
field, not through a hardcoded root path, so the file's directory is free to
choose; choosing the already-excluded one avoids touching three tool
configs. The serializer still emits biome-compatible bytes (2-space JSON +
LF) so a future exclusion change cannot create format/sync gate crossfire.

**Alternatives considered**: package-root `custom-elements.json` — the more
common visual convention, but requires a new biome exclusion and a knip
check for zero functional gain given the package.json field; rejected.

## D9 — Generator inheritance (FR-007): template ships the tags

**Decision**: update
`tools/kimen-plugin/src/generators/component/files/__name__.tsx.template` to
scaffold the class JSDoc with `@whenToUse TODO(spec): …` /
`@whenNotToUse TODO(spec): …` (replacing today's "When to use: TODO(spec)"
prose lines). A fresh scaffold therefore passes FR-004's non-empty check
mechanically (build stays green right after `nx g component`, per the
generator's own printed workflow) while the TODO text is caught where TODOs
are caught — spec review, not the gate. Everything else about FR-007 is
free: scaffolded components land in `src/components/`, Stencil's docs-json
discovers them, and the surfaces derive from docs.json — zero per-component
wiring by construction (SC-004).

**Rationale**: without the template change, every 003–016 scaffold's first
build would fail FR-004 (missing guidance tags) before the implementer wrote
a line — a gate born red for the wrong reason.

**Alternatives considered**: exempting undocumented *scaffolds* from FR-004
via a marker — a hole in the completeness rule that would inevitably ship;
rejected.
