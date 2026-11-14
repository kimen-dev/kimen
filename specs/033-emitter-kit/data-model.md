# Data Model: Emitter kit (spec 033)

## Entities

### DerivationOptions (public, NEW)

`{ components?: readonly string[]; target?: EmitterTarget }`
— subset must name catalog members (else `unknown-component`) and be
non-empty when present (else `empty-subset`); `target` is `draft-2020-12`
(default) or `openai-strict`, anything else is `invalid-option`.

### Derivation<T> (public, NEW)

`{ ok: true, artifact: T, issues: [] } | { ok: false, issues: EmitterIssue[] }`
— the 032 result idiom; no throw on any catalog/options input.

### EmitterIssue (public, NEW)

`{ code, path, message, value? }`; codes: `empty-subset | invalid-option |
malformed-catalog | provider-limit | unknown-component |
unsupported-version`.

### Schema artifact (public shape)

Draft 2020-12 document: root object `{version: const 1, actions?: string[],
root: node}`, `$defs` with per-component branches (`component` const, `id?: string` in
the boundary's id grammar, closed `props`, declared `slots` as child
containers, `action?: string`),
`child = anyOf[string, node]`; `$id` is
`.../ui-spec/<schema-version>/<target>/<defs-content-hash>`, unique per
catalog, subset and target so two derivations never collide in one registry.
Targets transform per research D2 (`openai-strict`: all-required + null
unions, action names non-empty by `pattern` instead of `minLength`).

### Prompt artifact (public shape)

Deterministic text: version header → format rules → per-component blocks
(tag, description, whenToUse/whenNotToUse verbatim, props with enums
inline, slots, events) → one example spec that validates against the same
catalog.

### UiSpecTool (public, NEW)

`{ name: 'emit_ui', description, inputSchema }` where `inputSchema` equals
the schema artifact for identical options.

## Provider limits table (openai-strict, documentation read 2026-11-14)

Source: OpenAI "Structured Outputs" guide, "Supported schemas"
(<https://developers.openai.com/api/docs/guides/structured-outputs>).
`tests/provider-limits.spec.ts` measures the built artifact against every
row.

| Limit | Value | Check |
|---|---|---|
| Single enum above 250 values | 15000 chars | per enum prop; `provider-limit` naming component and prop |
| Supported string keywords | `pattern`, `format` | by construction; the test allowlists every keyword in the artifact |
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
