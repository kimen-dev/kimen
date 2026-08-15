# Quickstart: Emitter kit (spec 033)

Proves the feature end-to-end from the public API. Signatures in
[contracts/emitter-api.md](contracts/emitter-api.md).

## 1. Derive the three guidance artifacts (S1, S7, S9)

```ts
import { catalogData, createCatalog } from '@kimen/catalog';
import { catalogPrompt, uiSpecJsonSchema, uiSpecTool } from '@kimen/emitter';

const registered = createCatalog(acmeDefinition, { extend: catalogData });
if (!registered.ok) throw new Error('fixture');
const catalog = registered.catalog;

const prompt = catalogPrompt(catalog);                                  // system-prompt block
const schema = uiSpecJsonSchema(catalog, { target: 'openai-strict' });  // structured outputs
const tool = uiSpecTool(catalog, { target: 'openai-strict' });          // tool/function calling
// each: { ok: true, artifact } — acme-kpi-card present in all three
```

Wire whichever your provider supports: prompt-only works everywhere;
schema for structured outputs; tool for function calling. For providers
without recursive-schema support use `{ target: 'anthropic-strict' }`.

## 2. Close the reliability loop (S13, S14)

```ts
import { validateUiSpec } from '@kimen/catalog';
import { normalizeEmission, repairPrompt } from '@kimen/emitter';

const spec = normalizeEmission(JSON.parse(modelOutput)); // strict-mode nulls stripped
const report = validateUiSpec(spec, { catalog });
if (!report.ok) {
  const repair = repairPrompt(report); // ONE corrective message…
  // …send to the model once, re-validate, then fail closed.
}
```

## 3. Run the feature's own proof

```bash
pnpm --filter @kimen/emitter test     # S1–S15 traced (ajv as independent schema oracle)
bash scripts/gates/gates-suite.sh     # definition of done
```
