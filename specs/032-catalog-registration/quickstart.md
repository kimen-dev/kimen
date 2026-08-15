# Quickstart: Consumer catalog registration (spec 032)

End-to-end validation guide — proves the feature works from the public API
alone. See [contracts/registration-api.md](contracts/registration-api.md)
for signatures and [data-model.md](data-model.md) for entities.

## Prerequisites

```bash
pnpm install
pnpm exec nx run @kimen/catalog:build
```

## 1. Register your components and validate a spec (S1, S2)

```ts
import { catalogData, createCatalog, validateUiSpec } from '@kimen/catalog';

const result = createCatalog(
  {
    components: {
      'acme-kpi-card': {
        tag: 'acme-kpi-card',
        description: 'A KPI card for Acme dashboards.',
        whenToUse: 'Show one operational metric with its trend.',
        whenNotToUse: 'Tabular breakdowns (use a table component).',
        props: {
          tone: {
            type: 'enum',
            values: ['ok', 'warn', 'critical'],
            description: 'Semantic severity of the metric.',
          },
        },
        slots: { '': 'The metric label.' },
        events: {},
      },
    },
  },
  { extend: catalogData }, // omit for a standalone catalog (S12)
);

if (!result.ok) throw new Error(result.issues[0].message);

const report = validateUiSpec(
  { version: 1, root: { component: 'acme-kpi-card', props: { tone: 'warn' } } },
  { catalog: result.catalog },
);
// report.ok === true
```

## 2. Render through the guarded renderer (S13)

```ts
import { renderUiSpec } from '@kimen/catalog';

renderUiSpec(spec, { surface, catalog: result.catalog, onAction: console.log });
// surface now contains <acme-kpi-card tone="warn">…  (attributes projected)
```

Your components must be defined separately
(`customElements.define('acme-kpi-card', …)`) — the catalog carries
contracts, never implementations.

## 3. Verify the guardrail still bites (S4–S12, S14)

```ts
createCatalog({ components: { 'ki-button': …ki-button entry… } }, { extend: catalogData });
// → { ok: false, issues: [{ code: 'collision', value: 'ki-button', … }] }

validateUiSpec(specUsingAcme); // no catalog option
// → rejected: "acme-kpi-card" outside the catalog (S3 — default stays closed)

renderUiSpec(
  { version: 1, root: { component: 'acme-logo', props: { src: 'javascript:alert(1)' } } },
  { surface, catalog },
);
// → { ok: false, diagnostics: [{ rule: 'url-scheme', … }] }; surface untouched (S14)
```

## 4. Run the feature's own proof

```bash
pnpm --filter @kimen/catalog test          # includes register.spec.ts + render-registered.spec.ts (S1–S16 traced)
bash scripts/gates/gates-suite.sh          # consolidated fast quality suite (definition of done)
```

Expected: all S-IDs of `specs/032-catalog-registration/feature.feature`
appear in passing tests (`check-traceability.sh` green); pre-existing
`validate.spec.ts` / `render.spec.ts` / `catalog.spec.ts` pass unmodified
(SC-003).
