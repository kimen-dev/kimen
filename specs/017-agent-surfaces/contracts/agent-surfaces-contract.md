# Contract: Agent surfaces (CEM + llms.txt + pipeline)

The behavior contract is `specs/017-agent-surfaces/feature.feature` (S1–S6).
This document freezes the emitted formats, file locations, script names and
gate wiring the scenarios observe. Any deviation discovered during
implementation re-enters through the spec, not through code (Art. II).

## Artifacts (all generated, committed, sync-gated)

| Artifact | Path | Produced by |
|---|---|---|
| Normalized docs-json intermediate | `packages/elements/generated/docs.json` | `stencil build` + normalization step (FR-008) |
| Custom Elements Manifest | `packages/elements/generated/custom-elements.json` | `buildManifest` |
| LLM summary (published) | `packages/elements/llms.txt` | `buildLlmsTxt` |
| LLM summary (repo root) | `llms.txt` | byte-identical copy of the above |

Hand-editing any of them is an Art. I violation; the `surfaces-sync` gate
turns it into a failure.

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

## llms.txt format

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
Root `llms.txt` and `packages/elements/llms.txt` are byte-identical.

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
| Library (pure) | `packages/elements/scripts/agent-surfaces.mjs` | exports `normalizeDocs(docs)`, `validateDocs(docs)`, `buildManifest(docs)`, `buildLlmsTxt(docs, pkg, preamble)` — no I/O, no clock, no env |
| CLI orchestrator | `packages/elements/scripts/build-surfaces.mjs` | all file I/O; reads `generated/docs.json`, `package.json`, `scripts/llms-preamble.txt`; writes the four artifacts; exit 1 on validation failure |
| Preamble template | `packages/elements/scripts/llms-preamble.txt` | committed input (FR-002 source #2) |
| Build wiring | `@kimen/elements` `build` script: `stencil build && node scripts/build-surfaces.mjs` | nx target name unchanged (`build`); FR-001/FR-002's "the build MUST produce" |
| Nx caching | elements `nx.targets.build` | `outputs` += `{projectRoot}/generated`, `{projectRoot}/llms.txt`, `{workspaceRoot}/llms.txt`; `inputs` += `!{projectRoot}/llms.txt` (keeps `!{projectRoot}/generated/**`) |
| Tests | `packages/elements/scripts/agent-surfaces.spec.ts` via `vitest.node.config.ts`, chained in the package `test` script | marker `// @spec:017-agent-surfaces`, S1–S6 in titles; nx target name unchanged (`test`) |
| Gate | `surfaces-sync` in `scripts/gates/gates-suite.sh`, after `tokens-sync` | `git diff --exit-code -- packages/elements/generated packages/elements/llms.txt llms.txt` |
| Publication | `packages/elements/package.json` | `"customElements": "generated/custom-elements.json"`; `files` += `"generated/custom-elements.json"`, `"llms.txt"` |
| Generator inheritance | `tools/kimen-plugin/.../__name__.tsx.template` | scaffolds `@whenToUse` / `@whenNotToUse` TODO(spec) tags (FR-007) |
| Template obligation | `.specify/templates/overrides/tasks-template.md` T019 | renamed to the delivered pipeline; Zod catalog annotated as Fase 3 (FR-009) |

## Compatibility

First release of both artifacts: from their first published version they
version alongside the public API (Art. IX — spec Constitutional Surface).
Renaming/removing the `customElements` field, the vendor guidance fields or
any documented section of llms.txt after first publish is a breaking change
to the machine contract. The Fase-3 Zod catalog consumes
`generated/custom-elements.json`; it never replaces it.
