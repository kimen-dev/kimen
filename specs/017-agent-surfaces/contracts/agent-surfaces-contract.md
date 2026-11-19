# Contract: Agent surfaces (CEM + llms.txt + pipeline)

The behavior contract is `specs/017-agent-surfaces/feature.feature` (S1–S13).
This document freezes the emitted formats, file locations, script names and
gate wiring the scenarios observe. Any deviation discovered during
implementation re-enters through the spec, not through code (Art. II).

## Artifacts (all generated, committed, sync-gated)

| Artifact | Path | Produced by |
|---|---|---|
| Normalized docs-json intermediate | `packages/elements/generated/docs.json` | `stencil build` + normalization step (FR-008) |
| Custom Elements Manifest | `packages/elements/generated/custom-elements.json` | `buildManifest` |
| LLM index (published) | `packages/elements/llms.txt` | `buildLlmsIndex`, relative links |
| LLM complete summary (published) | `packages/elements/llms-full.txt` | `buildLlmsTxt` during the elements build before packing |
| Component documents and guides (published) | `packages/elements/llms/<tag>.md`, `packages/elements/llms/theming.md` | `buildLlmsDocuments` |
| LLM index (repo root, served at `https://kimen.dev/llms.txt`) | `llms.txt` | `buildLlmsIndex`, absolute site links, plus the GenUI guides |
| LLM complete summary (repo root) | `llms-full.txt` | the published one + the GenUI layer (`buildRootLlmsTxt`) |
| GenUI guides (repo root) | `llms/<package>.md` | `buildGenUiDocuments` from `docs/genui-surfaces.json` |

Hand-editing any of them is an Art. I violation; the `surfaces-sync` gate
turns it into a failure. The package summary is a build output. Its bytes
must match the elements portion of the committed site summary.

## Custom Elements Manifest format

`schemaVersion "1.0.0"` shape. Exact emission for ki-button today (fields
elided with `…` carry the verbatim JSDoc text):

```json
{
  "schemaVersion": "1.0.0",
  "readme": "",
  "modules": [
    {
      "kind": "javascript-module",
      "path": "src/components/ki-button/ki-button.tsx",
      "declarations": [
        {
          "kind": "class",
          "name": "KiButton",
          "customElement": true,
          "tagName": "ki-button",
          "description": "A token-styled action button with native button semantics.",
          "whenToUse": "…verbatim @whenToUse text…",
          "whenNotToUse": "…verbatim @whenNotToUse text…",
          "attributes": [
            {
              "name": "variant",
              "fieldName": "variant",
              "type": { "text": "\"primary\" | \"secondary\" | \"tertiary\" | \"quaternary\" | \"ghost\"" },
              "default": "'secondary'"
            }
          ],
          "members": [
            {
              "kind": "field",
              "name": "variant",
              "privacy": "public",
              "type": { "text": "\"primary\" | \"secondary\" | \"tertiary\" | \"quaternary\" | \"ghost\"" },
              "default": "'secondary'",
              "description": "…verbatim prop JSDoc…",
              "attribute": "variant",
              "reflects": true
            }
          ],
          "events": [],
          "slots": [
            { "name": "", "description": "Label content. This is the accessible name source." },
            { "name": "end", "description": "Trailing icon or media. Follows writing direction." },
            { "name": "start", "description": "Leading icon or media. Follows writing direction." }
          ],
          "cssParts": [
            { "name": "button", "description": "Internal native button." },
            { "name": "label", "description": "Label wrapper around the default slot." }
          ],
          "cssProperties": []
        }
      ],
      "exports": [
        {
          "kind": "js",
          "name": "KiButton",
          "declaration": { "name": "KiButton", "module": "src/components/ki-button/ki-button.tsx" }
        },
        {
          "kind": "custom-element-definition",
          "name": "ki-button",
          "declaration": { "name": "KiButton", "module": "src/components/ki-button/ki-button.tsx" }
        }
      ]
    }
  ]
}
```

Guarantees:

- **Every documented facet appears** (S1/FR-001): tag, properties (type +
  default + attribute + reflects), events, methods, slots, CSS shadow
  parts, CSS custom properties — populated exactly as the component
  contract documents them (empty arrays are emitted, never omitted, for
  the facet lists above).
- **Guidance verbatim** (S3/FR-003): `whenToUse` / `whenNotToUse` are
  vendor extension fields on the class declaration, byte-equal to the
  JSDoc tag text.
- **All members are `privacy: "public"`** — anything else never reaches
  docs.json (Stencil only documents decorated public surface).
- **Determinism** (S6/FR-006): no timestamp, no absolute path, docs.json
  ordering preserved, 2-space JSON + trailing LF.
- Field-by-field derivation: [data-model.md](../data-model.md) §3.

## llms.txt format (the index, FR-011)

The shape https://llmstxt.org/ specifies: an H1, a blockquote, body text
with no headings, then H2 sections that contain nothing but link lists.

```text
# @kimen/elements — Kimen web components

> <package.json description, verbatim>

<the part of packages/elements/scripts/llms-preamble.txt that precedes its
 first "## " heading, verbatim: installation instruction, registration
 snippet, stylesheet note>

<repository index only: the intro of docs/genui-surfaces.json>

<fixed note: this file is an index; read only the documents you need>

## Components

- [ki-button](<base>llms/ki-button.md): <first sentence of @whenToUse>
- …one entry per published component, docs.json order…

## Generative UI            ← repository index only

- [@kimen/catalog](<base>llms/catalog.md): <first sentence of whenToUse>
- …one entry per package of docs/genui-surfaces.json, in its order…

## Guides

- [Theming](<base>llms/theming.md): <first sentence of the section>
- …one entry per "## " section of the preamble template…

## Optional

- [llms-full.txt](<base>llms-full.txt): <fixed note>
- [custom-elements.json](<manifest address>): <fixed note>
```

Rules:

- `<base>` is empty in `packages/elements/llms.txt` (links are paths
  relative to the package root) and `https://kimen.dev/` in the repository
  `llms.txt` (FR-014). The manifest address is the package's
  `customElements` field, respectively
  `https://kimen.dev/assets/elements/custom-elements.json`.
- The first sentence of a text is its prefix up to the first period that is
  followed by whitespace and a capital letter ("e.g." and "i.e." never end
  it), or the whole text when there is no such period; newlines collapse to
  spaces. It is never reworded.
- A section with no entries is omitted. Blocks are separated by one blank
  line; the file ends with a single LF.
- Both committed indexes stay at or below `LLMS_INDEX_MAX_BYTES` (16 384).

## Component document format (FR-012)

```text
# ki-button

> <component description, newlines collapsed to spaces>

## When to use

<verbatim @whenToUse text>

## When not to use

<verbatim @whenNotToUse text>

## Examples                 ← omitted when the component has no usage/*.md

<the component's usage/*.md files, sorted by name>

## Attributes

- `variant` ("primary" | …, default 'secondary'): <description, one line>
- `label` (string, required): …
- `count` (number | undefined, minimum 0, maximum 20): …
- `src` (string | undefined, URL): …

## Slots
## Parts
## Events
## Methods
## CSS custom properties
```

Rules: sections in this exact order; a facet with no entries reads `None.`;
attribute facts appear in the order type, `required`, `default`,
`minimum`, `maximum`, `URL`, each only when the contract declares it; the
entry lines are the ones `llms-full.txt` prints for the same component. A
guide is `# <title>`, a blank line and the section text verbatim. A GenUI
guide is `# <package name>`, the description as a blockquote,
`## When to use`, `## When not to use` and `## Entry points`.

## llms-full.txt format (FR-013)

```text
# @kimen/elements — Kimen web components

> <package.json description, verbatim>

<verbatim body of packages/elements/scripts/llms-preamble.txt:
 installation instruction (pnpm add @kimen/elements),
 component registration snippet (defineCustomElement import),
 tokens stylesheet + theming attributes note>

## Components

### ki-button

<component description, verbatim>

When to use: <verbatim @whenToUse text>
When NOT to use: <verbatim @whenNotToUse text>

Attributes:
- `variant` ("primary" | "secondary" | "tertiary" | "quaternary" | "ghost", default 'secondary'): <prop description, newlines collapsed to spaces>
- …one line per attribute, docs.json order…

Slots:
- (default): <description>
- `start`: <description>
- `end`: <description>

Parts:
- `button`: <description>
- `label`: <description>

Events: none

Methods: none

CSS custom properties: see the --ki-button-* component token layer (names
documented in the component contract when present).
```

Rules: sections in this exact order; a facet with no entries renders as
`<Facet>: none` (components with events/methods list them in the same
one-line style); one blank line between blocks; file ends with a single LF.
The repository `llms-full.txt` is the published one followed by the
`## GenUI layer` section.

## Guidance tag convention (FR-003)

| Tag | Placement | Required |
|---|---|---|
| `@whenToUse <text>` | component class JSDoc | yes, non-empty, once |
| `@whenNotToUse <text>` | component class JSDoc | yes, non-empty, once |

A published component missing either tag (or with empty text) fails
generation naming the component and the missing tag (S4 family / FR-003).

## Completeness failure (FR-004, S4)

Generation exits non-zero and prints every violation, one per line:

```text
agent-surfaces: documentation incomplete (Art. I):
  ki-button.variant: property has no documentation
  ki-button: missing @whenToUse guidance tag
```

## Scripts, targets and wiring

| Piece | Name / location | Contract |
|---|---|---|
| Library (pure) | `packages/elements/scripts/agent-surfaces.mjs` | exports `normalizeDocs(docs)`, `validateDocs(docs)`, `buildManifest(docs)`, `buildLlmsTxt(docs, pkg, preamble)`, `buildLlmsIndex(docs, pkg, preamble, options)`, `buildLlmsDocuments(docs, preamble)`, `buildGenUiDocuments(genUi, packages)`, `LLMS_INDEX_MAX_BYTES` — no I/O, no clock, no env |
| CLI orchestrator | `packages/elements/scripts/build-surfaces.mjs` | all file I/O; reads `generated/docs.json`, `package.json`, `scripts/llms-preamble.txt`, `docs/genui-surfaces.json`; writes every artifact above; exit 1 on validation failure. Each index owns the companions derived from its own path (`<index>.txt` → `<index>-full.txt` and `<index>/`), and a `.md` in a documents directory that the run did not write is removed |
| Preamble template | `packages/elements/scripts/llms-preamble.txt` | committed input (FR-002 source #2) |
| Build wiring | `@kimen/elements` `build` script: `stencil build && node scripts/build-surfaces.mjs` | nx target name unchanged (`build`); FR-001/FR-002's "the build MUST produce" |
| Nx caching | elements `nx.targets.build` | `outputs` += `{projectRoot}/generated` and, for the project and the workspace root alike, `llms.txt`, `llms-full.txt`, `llms`; `inputs` exclude the project's own outputs (`!{projectRoot}/generated/**`, `!{projectRoot}/llms.txt`, `!{projectRoot}/llms-full.txt`, `!{projectRoot}/llms/**`) and declare every source outside the project: `docs/genui-surfaces.json`, each GenUI package's `package.json` and `src/index.ts`, `scripts/lib/**/*`, `scripts/gates/check-component-inventory.mjs` |
| Tests | `packages/elements/scripts/agent-surfaces.spec.ts` and `llms-index.spec.ts` via `vitest.node.config.ts`, chained in the package `test` script; `scripts/tests/agent-surfaces-publication.test.mjs` in the infrastructure tests (packs the package, assembles the site) | marker `// @spec:017-agent-surfaces`, S1–S13 in titles; nx target name unchanged (`test`) |
| Gate | `surfaces-sync`: `node scripts/gates/check-generated-sync.mjs surfaces` | every artifact above is required, tracked and byte-equal to a fresh regeneration; one document per component of the committed manifest and per package of `docs/genui-surfaces.json`; both `llms/` directories are closed scopes |
| Publication (npm) | `packages/elements/package.json` | `"customElements": "generated/custom-elements.json"`; `files` += `"generated/custom-elements.json"`, `"llms.txt"`, `"llms-full.txt"`, `"llms"` |
| Publication (site) | `scripts/build-site.sh` | copies the repository `llms.txt` and `llms-full.txt` to the site root and `packages/elements/llms/*.md` plus `llms/*.md` to `/llms/` |
| Generator inheritance | `tools/kimen-plugin/.../__name__.tsx.template` | scaffolds `@whenToUse` / `@whenNotToUse` TODO(spec) tags (FR-007) |
| Template obligation | `.specify/templates/overrides/tasks-template.md` T019 | renamed to the delivered pipeline; Zod catalog annotated as Fase 3 (FR-009) |

## Compatibility

First release of both artifacts: from their first published version they
version alongside the public API (Art. IX — spec Constitutional Surface).
Renaming/removing the `customElements` field, the vendor guidance fields,
any documented section of llms.txt, or the path of `llms-full.txt` or of a
document under `llms/` after first publish is a breaking change to the
machine contract. The Fase-3 Zod catalog consumes
`generated/custom-elements.json`; it never replaces it.
