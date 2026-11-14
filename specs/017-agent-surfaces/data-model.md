# Phase 1 Data Model: Agent surfaces

No persistent data. The model is the field-by-field mapping from the single
source (Stencil `docs-json` output, normalized per FR-008) to the two
emitted surfaces. The normative formats live in
[contracts/agent-surfaces-contract.md](./contracts/agent-surfaces-contract.md);
this file models the data flow.

```text
src/components/**/*.tsx (JSDoc + types)          ← the one source of truth (Art. I)
        │  stencil build (docs-json output target)
        ▼
generated/docs.json  ──(1) normalizeDocs──▶  generated/docs.json (committed form)
        │                                      no timestamp, no absolute paths
        ├─(2) validateDocs ── FR-004 failure names component.member
        ├─(3) buildManifest ──▶ generated/custom-elements.json
        ├─(4) buildLlmsTxt        ──▶ packages/elements/llms-full.txt
        │                              (+ GenUI layer ──▶ /llms-full.txt)
        ├─(5) buildLlmsDocuments  ──▶ packages/elements/llms/<tag>.md, theming.md
        └─(6) buildLlmsIndex      ──▶ packages/elements/llms.txt (relative links)
                    ▲                  /llms.txt (site links + GenUI guides)
        package.json (name, description, version)
        scripts/llms-preamble.txt (committed template)
        docs/genui-surfaces.json (repository surfaces only)
                    └─(7) buildGenUiDocuments ──▶ /llms/<package>.md
```

## 1. Normalization model (FR-008)

| docs.json field | Raw build value | Normalized committed value |
|---|---|---|
| `timestamp` | `"2026-07-07T08:56:16"` (machine clock) | **removed** |
| `compiler.{name,version,typescriptVersion}` | tool versions | kept (deterministic per lockfile) |
| `components[].filePath` | already package-relative | kept, POSIX separators enforced |
| `components[].props[].complexType.references.<T>.path` | **absolute** (`/Users/…/ki-button.tsx`) | package-root-relative POSIX path (`src/components/ki-button/ki-button.tsx`) |
| `components[].{dirPath,fileName,readmePath,usagesDir}` | absent today; absolute when Stencil emits them | relativized or removed if absent |
| `typeLibrary` keys and `.path` | already relative | kept |
| serialization | Stencil's writer | `JSON.stringify(docs, null, 2) + '\n'` (stable bytes, LF) |

Everything else in docs.json passes through untouched — the file remains a
valid `JsonDocs` for its one runtime consumer (`.storybook/preview.ts`,
which reads `components/props/docsTags` only).

## 2. Completeness model (FR-004, S4)

`validateDocs(docs)` returns a list of violations; any violation makes
generation exit 1 listing every entry as `<tag>.<member>: <reason>`.

| Checked surface | Source field | Rule |
|---|---|---|
| component description | `components[].docs` | non-empty |
| component guidance | `components[].docsTags` | `whenToUse` AND `whenNotToUse` present with non-empty text |
| property | `props[].docs` | non-empty |
| event | `events[].docs` | non-empty |
| method | `methods[].docs` | non-empty |
| slot | `slots[].docs` | non-empty (empty-description detection; slots exist only via `@slot` tags) |
| part | `parts[].docs` | non-empty (idem, `@part`) |
| documented CSS property | `styles[].docs` | non-empty when the entry exists |
| any docsTag | `docsTags[].text` | a tag with empty text is a violation (FR-004's empty-description clause) |

## 3. CEM mapping (docs.json → custom-elements.json)

Top level:

| CEM field | Value |
|---|---|
| `schemaVersion` | `"1.0.0"` (the shape the ecosystem's consumers read) |
| `readme` | `""` |
| `modules[]` | one `kind: "javascript-module"` per `components[]` entry, `path` = `filePath` |

Per component (one `kind: "class"` declaration, `customElement: true`):

| CEM declaration field | docs.json source | Notes |
|---|---|---|
| `name` | — (not in docs.json) | derived: PascalCase(`tag`), e.g. `ki-button → KiButton`; invariant guaranteed by the generator's `TAG_RE` + `names().className` |
| `tagName` | `tag` | |
| `description` | `docs` | verbatim |
| `whenToUse` | `docsTags[name="whenToUse"].text` | vendor extension field, verbatim (S3) |
| `whenNotToUse` | `docsTags[name="whenNotToUse"].text` | vendor extension field, verbatim (S3) |
| `attributes[]` | `props[]` where `attr` is set | `{ name: attr, fieldName: name, type: { text: type }, default }` |
| `members[]` (fields) | `props[]` | `{ kind: "field", name, privacy: "public", type: { text: type }, default, description: docs, attribute: attr, reflects: reflectToAttr }` |
| `members[]` (methods) | `methods[]` | `{ kind: "method", name, privacy: "public", description: docs, return: { type: { text: complexType.return } }, parameters: [{ name, type: { text: type }, description: docs }] }` |
| `events[]` | `events[]` | `{ name: event, type: { text: "CustomEvent<" + detail + ">" }, description: docs }` |
| `slots[]` | `slots[]` | `{ name, description: docs }` (`name: ""` = default slot) |
| `cssParts[]` | `parts[]` | `{ name, description: docs }` |
| `cssProperties[]` | `styles[]` (annotation `prop`) | `{ name, description: docs }`; empty array while contracts document none (ki-button today) |
| `deprecated` | `deprecation` | only when present |

Per module `exports[]`:

| Export | Value |
|---|---|
| `{ kind: "js" }` | `{ name: <className>, declaration: { name: <className>, module: <filePath> } }` |
| `{ kind: "custom-element-definition" }` | `{ name: <tag>, declaration: { name: <className>, module: <filePath> } }` |

Ordering: docs.json order is preserved everywhere (Stencil already emits
components and props in deterministic sorted order); the generator never
re-sorts, so the mapping is order-stable by construction.

Dropped docs.json fields (no CEM equivalent, or internal): `encapsulation`,
`usage`, `listeners`, `states`, `dependents`, `dependencies`,
`dependencyGraph`, `complexType.references` internals, `values`, `optional`,
`required`, `getter`, `setter`, `mutable`, `compiler`, `typeLibrary`.

## 4. llms-full.txt composition model (FR-002, FR-013)

This is the file FR-002 first called `llms.txt`; since FR-011 that name
belongs to the index (§4b).

| Section | Source | Rule |
|---|---|---|
| `# <name> — …` + `> <description>` | `package.json` `name`, `description` | package metadata (allowed source #1) |
| installation / registration / theming preamble | `scripts/llms-preamble.txt` | committed template, verbatim (allowed source #2) |
| `## Components` | — | fixed heading |
| `### <tag>` per component | normalized docs.json | one entry per published component, docs.json order |
| entry body | `docs`, guidance tags, `props/slots/parts/events/styles` | guidance verbatim (S3); multi-line descriptions collapse to single lines (newline → space) for line-oriented consumers; exact layout in the contract |

## 4b. Index and document model (FR-011, FR-012, FR-015)

| Output | Source | Rule |
|---|---|---|
| index H1, blockquote | `package.json` `name`, `description` | as §4 |
| index body | preamble template, up to its first `## ` heading | verbatim; a `## ` inside fenced code is content |
| index `## Components` entry | `components[].tag`, `docsTags[whenToUse]` | `- [<tag>](<base>llms/<tag>.md): <first sentence>` |
| index `## Guides` entry | each `## ` section of the preamble template | title → link name, slug of the title → file name, first sentence → note |
| index `## Generative UI` entry (repository only) | `docs/genui-surfaces.json` + each package's `package.json` | package name → link name, directory basename → file name |
| component document | the same fields as its `llms-full.txt` entry, plus `usage` | headings instead of labels; guidance verbatim; `None.` for an empty facet |
| attribute facts | `props[].required`, `props[].docsTags` (`minimum`, `maximum`, `format`) | printed only when declared; same source the manifest fields use |

## 5. Guidance tag model (FR-003)

| Tag | Level | Cardinality | Consumer |
|---|---|---|---|
| `@whenToUse <text>` | component class JSDoc | exactly 1, non-empty | CEM `whenToUse`, the component document's "When to use" section and the llms-full.txt "When to use:" line — verbatim in all three; its first sentence annotates the index entry |
| `@whenNotToUse <text>` | component class JSDoc | exactly 1, non-empty | CEM `whenNotToUse`, the component document's "When not to use" section and the llms-full.txt "When NOT to use:" line — verbatim in all three |

Prop-level guidance remains prose inside each prop's JSDoc description and
flows verbatim as the member `description` (no additional structure —
Art. VII).

## 6. Determinism invariants (FR-006, S6)

Every emitted byte is a function of: normalized docs.json + package.json
(name, description, version, `customElements`) + llms-preamble.txt +
docs/genui-surfaces.json and the package metadata it names (repository
surfaces only) + the generator code itself. Explicitly excluded inputs: clock, absolute checkout path, machine
name, environment variables, locale (all string operations are
locale-independent; no `toLocaleString`, no `Intl`). All three outputs end
with exactly one LF; JSON uses 2-space indentation (biome-compatible bytes).
