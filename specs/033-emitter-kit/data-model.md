# Data Model: Emitter kit (spec 033)

## Entities

### DerivationOptions (public, NEW)

`{ components?: readonly string[]; target?: EmitterTarget; maxDepth?: number }`
— subset must name catalog members (else `unknown-component`) and be
non-empty when present (else `empty-subset`); `maxDepth` applies to
`anthropic-strict` only (default 6, integer ≥1).

### Derivation<T> (public, NEW)

`{ ok: true, artifact: T, issues: [] } | { ok: false, issues: EmitterIssue[] }`
— the 032 result idiom; no throw on any catalog/options input.

### EmitterIssue (public, NEW)

`{ code, path, message, value? }`; codes: `empty-subset | invalid-option |
malformed-catalog | provider-limit | unknown-component |
unsupported-version`.

### Schema artifact (public shape)

Draft 2020-12 document: root object `{version: const 1, actions?: string[],
root: node}`, `$defs` with per-component branches (`component` const,
closed `props`, declared `slots` as child containers, `action?: string`),
`child = anyOf[string, node]`; `$id` carries the catalog schema version.
Targets transform per research D2 (strict: all-required + null unions;
anthropic: depth-unrolled `node1..nodeN`, leaf accepts text only, bound in
`description`/`$comment`).

### Prompt artifact (public shape)

Deterministic text: version header → format rules → per-component blocks
(tag, description, whenToUse/whenNotToUse verbatim, props with enums
inline, slots, events) → one example spec that validates against the same
catalog.

### UiSpecTool (public, NEW)

`{ name: 'emit_ui', description, inputSchema }` where `inputSchema` equals
the schema artifact for identical options.

## Provider limits table (openai-strict, research-pinned 2026-08)

| Limit | Value | Check |
|---|---|---|
| Total enum values | 1000 | sum over included components' enum props |
| Total properties | 5000 | property count across the document |
| Schema nesting levels | 10 | by construction (≤6 with $defs); asserted in tests |
| Name/enum char budget | 120000 | total chars of property names + enum strings |

Exceeding ⇒ `provider-limit` naming the largest-contributing component.

## Flows

```text
Catalog --catalogPrompt/uiSpecJsonSchema/uiSpecTool--> Derivation<T>
  (skew check → subset check → limits check → build → version-stamp)

model output --normalizeEmission--> plain spec --validateUiSpec--> report
  --repairPrompt--> one corrective message | null   (then fail closed)
```
