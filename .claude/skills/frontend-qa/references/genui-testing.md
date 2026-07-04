<!--
Kimen constitutional skill reference, vendored from the founder's frontend-qa
baseline (Marcela Gotta / MarsUI) with naming adapted to Kimen (ki- components,
Kimen catalog) and the Art. III auto-escalation note added. No third-party
content in this file.
-->

# Testing generative UI (LLM-driven output)

How to test a system where an LLM generates UI specs (json-render / Kimen catalog). The fundamental shift: you can't assert exact output, so you assert **properties of the output** at three layers.

## Layer 1 — Deterministic (CI, merge-blocking)

These never involve a live LLM. They are normal tests and run on every commit.

### Schema validation (the unit test of GenUI)

Every spec — golden, fixture, or captured from production — must validate against the catalog:

```ts
test('spec validates against catalog', () => {
  const result = validateSpec(spec, catalog);   // Zod-based
  expect(result.valid).toBe(true);
  expect(result.unknownComponents).toEqual([]);
  expect(result.unknownProps).toEqual([]);
});
```

### Renderer tests with hand-written specs

The renderer (spec → DOM) is deterministic code. Test it exhaustively with hand-written spec fixtures: every catalog component renders, data bindings resolve (`$state`, `$item`, two-way), visibility conditions apply, actions dispatch, streaming patches apply incrementally without tearing. Edge fixtures: empty spec, deeply nested, missing optional props, dangling children references, malformed patch mid-stream.

### Guardrail tests

Assert the safety contract independent of any model (Art. VIII: the guardrail is a security boundary):

- Spec with a component not in the catalog → rejected, never rendered.
- Spec with an undeclared action → rejected.
- Prop values outside enum/range → rejected or coerced per policy (pick one, test it).
- No code execution paths: spec content is data; verify nothing `eval`-like exists in the render path.

## Layer 2 — Golden specs (regression, merge-blocking with tolerance)

Maintain a set of (prompt, golden spec) pairs covering your real use cases (dashboards, forms, receipts…). On change to prompts/catalog/system instructions, regenerate and compare **structurally**, not textually:

- Compare component *trees* (types, nesting, bindings), ignore: element ids, ordering where order is free, copy text wording.
- Define per-golden tolerance explicitly: e.g. "must contain ≥1 Metric bound to /metrics/revenue inside a Card; Heading text may vary".
- Use seeds and temperature 0 where the provider supports it; document that this *reduces* variance but doesn't eliminate it across model versions.
- A golden that fails = investigate, then either fix the regression or consciously re-bless the golden (diff reviewed by a human, committed). Never auto-bless.

Write a small structural-diff helper once (`expectSpecShape(spec, shape)`) instead of ad-hoc assertions per test.

## Layer 3 — Stochastic evals (scheduled / pre-release, NOT merge-blocking)

Live-LLM tests measuring quality, run as a suite with pass-rate thresholds:

- N runs per prompt (e.g. 10–20); assert pass *rate*: "≥95% of generations validate against the catalog; ≥90% include the requested chart".
- Track over time — degradation across model versions is the thing you are detecting. A threshold breach automatically opens a prioritized issue assigned to the founder (Art. III): silent degradation is not an acceptable outcome.
- LLM-as-judge only for genuinely semantic questions ("is this layout a reasonable answer to the prompt?"), with a rubric, spot-checked by humans. Judges drift too; never let a judge gate a merge.
- Keep the eval set diverse and mutually exclusive (50–300 prompts is the practical range); refresh it when the product surface changes — a stale gold set tests yesterday's product.

## Failure triage

| Symptom | Layer at fault | Action |
|---|---|---|
| Invalid spec reaches renderer | Layer 1 guardrail gap | Add rejection test + fix validator |
| Golden drifts after prompt tweak | Expected | Review diff, re-bless consciously |
| Golden drifts after model update | Layer 2 | Assess: regression vs. acceptable variation; tighten tolerance if it keeps flapping |
| Pass-rate drop in evals | Layer 3 | Compare model/prompt versions; don't hotfix tests to green |
| Flaky golden | Tolerance too tight on free dimensions | Loosen ONLY the free dimension (e.g. copy text), never the structure |

## What never to do

- Exact-match snapshot of LLM text or full spec JSON → permanent red or meaningless tolerance.
- Live LLM calls inside the unit/component suite → slow, costly, flaky by construction.
- Auto-approving golden updates in CI → the regression net deletes itself.
- Testing the model instead of the contract ("generates exactly this dashboard") → you don't own the model; you own the catalog, the renderer, and the guardrails.
