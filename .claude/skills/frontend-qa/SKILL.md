---
name: frontend-qa
description: Complete QA discipline for Kimen frontend code — TDD, unit testing, component/browser testing, E2E, flaky-test policy, mutation and property-based testing, accessibility/visual/performance gates, S-ID traceability, and testing generative-UI (LLM-driven) output. Use this skill whenever writing tests, doing TDD, fixing flaky tests, setting up CI quality gates, reviewing test quality, or verifying AI-generated UI — even if the user just says "add tests" or "is this tested?". Pairs with gherkin-use-cases (specs) and frontend-best-practices (implementation).
---

<!--
Kimen constitutional skill, adapted from the founder's frontend-qa baseline
(Marcela Gotta / MarsUI), renamed and rewired for Kimen: ki- components,
scripts/gates/gates-suite.sh as the definition of done, the Art. III mutation
gate (>=70% on changed core code), S-ID traceability, Kimen catalog naming.

Section 9 (Rationalizations and red flags) is adapted from "Superpowers"
(https://github.com/obra/superpowers), skills/test-driven-development/SKILL.md
@ release v5.1.0 (commit f2cbfbefebbfef77321e4c9abc9e949826bea9d7),
Copyright (c) 2025 Jesse Vincent (Prime Radiant) - MIT License, rewritten so
"done" points at gates exit 0, never at reviewer or self approval.
See /NOTICE for full third-party attribution.
-->

# Frontend QA

Operating rules for testing frontend code. Tags: **[Always]** non-negotiable · **[Default]** deviate only with stated reason · **[Judgment]** think, don't pattern-match.

Core stance: a test suite exists to let you change code without fear. Every rule below serves that goal; any practice that doesn't (coverage worship, snapshot dumps, gherkinized unit tests) is cut. Specs come first — Gherkin use cases exist before behavior (Art. II, `gherkin-use-cases` skill), and tests derive from scenarios. In Kimen, "done" is never a judgment — yours, a reviewer's, or anyone's: only `scripts/gates/gates-suite.sh` exiting 0 closes work (Art. III/X).

## 1. Strategy: what to test where

- **[Always]** Layer 0 is static analysis: TypeScript `strict`, ESLint (with a11y plugins), Zod schemas at boundaries. A bug a type can catch must never need a test. (This layer runs first in the gates suite, Art. X.)
- **[Default]** Testing trophy: unit tests for pure logic → **component tests in a real browser as the bulk** → few E2E journeys. jsdom lies about focus, layout, and shadow DOM — for `ki-` web components, browser-mode tests (Vitest browser mode via `@stencil/vitest`, Playwright provider) are the rule, never jsdom-only (Art. III).
- **[Default]** Each behavior is tested at exactly one level — the lowest level that can observe it. Re-testing the same rule in unit + component + E2E triples maintenance for zero extra safety.
- **[Judgment]** Ask "what breaks if this is wrong, and who notices?" — test value is proportional to blast radius, not to ease of writing.

## 2. TDD — where it pays, honestly

The evidence for TDD-always is mixed; its reliable value is **design pressure** (testable = decoupled) and **a regression net built while context is fresh**. Apply it where that value is real:

- **[Always]** Bug fixes are TDD, no exceptions (Art. III): write the failing test that reproduces the bug BEFORE fixing. A bug without a regression test will return. (The `systematic-debugging` skill makes this Phase 1 of any debug session.)
- **[Default]** TDD for pure logic: validators, parsers, formatters, state machines, data transforms, token resolution, catalog/schema logic. Red → green → refactor with the test list written first.
- **[Default]** Classicist (Detroit) style by default: assert on state/output, use real collaborators. Mock only at process boundaries (network, time, storage, LLM calls). Mockist tests that mirror internal call graphs break on every refactor — the exact failure they're supposed to prevent.
- **[Judgment]** Don't TDD exploratory UI (layout, styling, visual iteration) — write the behavior contract first (Gherkin), iterate visually, then lock behavior in with component tests. Pretending to TDD CSS produces theater, not safety.
- **[Always]** In the red phase, see the test fail FOR THE RIGHT REASON (verified failing, Art. III). A test you never saw fail proves nothing — this is also the #1 defense against AI-generated tests that assert nothing.

## 3. Unit testing rules

- **[Always]** Test behavior through the public API, never internals (Art. III). If a refactor (same behavior) breaks the test, the test was wrong.
- **[Always]** AAA structure (Arrange-Act-Assert), one behavior per test, name = the rule: `rejects expired tokens`, not `test #3 works`.
- **[Always]** No logic in tests (no if/for/try). A test complex enough to need logic needs its own tests — extract builders instead.
- **[Always]** Determinism (Art. III): fake timers for time, seeded values for randomness, no real network, no shared mutable state between tests. A test that passes "most of the time" is a failing test.
- **[Default]** Test data builders with named intent (`aValidCatalog()`, `anExpiredSession()`) over copy-pasted fixture blobs. The test shows only the data that matters to the rule.
- **[Default]** Parameterized tests (`test.each`) for the same rule over many inputs; property-based tests (fast-check) for parsers/validators/serializers — properties like "parse(serialize(x)) === x" find the cases you didn't think of.
- **[Judgment]** One logical assertion per test as a default, not a religion — asserting three fields of one result object is one behavior.

## 4. Test quality — coverage lies

- **[Always]** Two numbers, two roles (Art. III): line/branch coverage is a diagnostic (a floor-finder for what's untested), never a target and never a gate. 100% coverage with assertion-free tests is worse than 70% honest — it buys false confidence.
- **[Always]** Mutation score IS the gate on core logic: **at least 70% on changed core code** (Stryker with the Vitest runner, `incremental` mode to keep CI fast; Art. III). If mutating the code doesn't fail a test, the test isn't testing. Don't run it on glue/presentation code — wrong tool.
- **[Default]** Review tests with the same rigor as code, plus one extra question: "what bug would this catch?" If the answer is none, delete it.

## 5. Component, E2E, and the flakiness war

- **[Always]** S-ID traceability (Art. II): every scenario ID (S1..Sn) from the approved `feature.feature` appears in at least one test, at the right level. This is a CI gate (`scripts/gates/check-traceability.sh`), and the test must assert the scenario's observable outcome — not merely name-drop the ID.
- **[Always]** Query like a user: by role/label/text first, `data-testid` as fallback, CSS/XPath only when nothing else fits. Role-based queries double as a continuous accessibility probe (Art. V: the accessibility tree is also how agents read our components).
- **[Always]** Web-first/auto-retrying assertions; never `waitForTimeout`/sleep — fixed waits are the #1 flake source and slow the suite even when green.
- **[Always]** Full isolation: fresh state per test, no execution-order dependence, parallel-safe (own data per worker). Mock external/third-party network in component tests and most E2E.
- **[Default]** E2E budget: a thin set of money-path journeys (form submits, generation flow renders, theme switches). Every E2E must justify why a component test can't catch the same failure.
- **[Default]** Flaky policy: retries are *detection*, not cure. A test that needs a retry gets quarantined (tagged, excluded from merge-blocking) with an owner and a deadline: fix or delete within a sprint. A suite people re-run "until green" is already dead. (A flaky gate is a bug fixed before the gate is trusted, Art. X.)
- **[Default]** Component test minimum per `ki-` component = the five scenario families of Art. II: core behavior, keyboard path, assistive-tech outcome (axe scan + semantics), form participation where applicable (ElementInternals), theming/token override.

## 6. CI quality gates (the pipeline IS the QA process)

The pipeline is executable, not aspirational: `scripts/gates/gates-suite.sh` runs constitution check → format → lint (code + styles) → typecheck → dead code → build → tests, ordered by speed, failing fast. Its exit 0 — and nothing else — is the definition of done (Art. III/X). Around the test gate: full suite in a REAL browser (engine matrix per Art. IV: Chromium on PR, all three engines pre-release), S-ID traceability, mutation score on changed core logic, axe with zero violations, visual regression only where layout is the contract (review diffs, never auto-approve), size-limit per-component budgets. A gate that can be skipped routinely isn't a gate — the only waiver path is break-glass: founder, per PR, written justification, restoration issue (Emergency Procedure).

## 7. Testing generative UI (LLM output) — different rules

LLM output is non-deterministic; exact-match assertions are the wrong tool. Read `references/genui-testing.md` before testing anything AI-generated. The contract:

- **[Always]** Schema-first: every generated spec validates against the Kimen catalog (Zod). Structural validity is deterministic and cheap — it's the unit test of GenUI.
- **[Always]** Test the guardrail, not the model (Art. VIII — the guardrail is a security boundary): "output contains only catalog components", "actions reference declared handlers", "no unknown props" — never "the AI generates exactly this UI".
- **[Default]** Golden specs with structural/fuzzy comparison for regression (does the dashboard still contain a Metric bound to revenue?), seeds/temperature-0 where the provider allows, tolerance documented per golden.
- **[Default]** Deterministic renderer tests use hand-written specs as fixtures (renderer is normal code — normal rules apply). LLM-in-the-loop tests run as a separate, non-blocking eval suite with pass-rate thresholds, never merge-blocking; a threshold breach auto-opens a prioritized issue for the founder (Art. III).

## 8. Anti-patterns to reject

| Cargo cult | Why it fails | Do instead |
|---|---|---|
| Coverage targets (100%, 90%…) | Breeds assertion-free tests | Mutation score on core logic (the Art. III gate) |
| Snapshot-test everything | Nobody reviews 400-line diffs; rubber-stamping | Targeted assertions; snapshots only for small, stable serialized output |
| Mock everything (London-everywhere) | Tests mirror implementation; refactors break green code | Mock process boundaries only |
| `waitForTimeout` / sleeps | #1 flake source; slow always | Web-first assertions, event-based waits |
| Retry-until-green CI | Hides real races; trust erodes to zero | Quarantine + fix-or-delete policy |
| Gherkinized unit tests | Glue-code tax, no conversation behind it | Gherkin for behavior contracts only |
| Testing AI output with exact match | Non-determinism = permanent red or useless tolerance | Schema + guardrail + golden with fuzzy match |
| E2E for every feature | Slow, flaky, duplicate coverage | Trophy: push down to component level |
| Asserting internal state/private methods | Couples tests to implementation | Public API + observable outcomes |
| Writing tests after, "to bump coverage" | Tests inherit the code's assumptions and bugs | TDD for logic; tests-from-spec (Gherkin) otherwise |

## 9. Rationalizations and red flags — the excuse table

Adapted from Superpowers' TDD discipline. These are the excuses that show up mid-task, especially under pressure, especially from AI writers. Catching yourself (or a subagent) saying one of these IS the signal.

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. The test takes 30 seconds; the regression takes an afternoon. |
| "I'll write tests after" | Tests written after pass immediately, and passing immediately proves nothing — you never saw them catch the bug. |
| "Tests-after achieve the same goals — it's spirit, not ritual" | Tests-after answer "what does this code do?"; tests-first answer "what should it do?". Tests-after inherit the implementation's blind spots. |
| "I already manually tested it" | Ad-hoc ≠ systematic: no record, can't re-run, and the gates can't see it. Manual verification closes nothing (Art. III). |
| "Deleting X hours of untested work is wasteful" | Sunk cost fallacy. Untested code you keep is debt; the time is already gone either way. |
| "I'll keep it as reference while writing tests first" | You'll adapt it — that's testing after with extra steps. Delete means delete. |
| "I need to explore first" | Fine. Exploration is legitimate — then throw the spike away and start red → green. |
| "This is hard to test, I'll mock more" | Hard to test = design problem. Listen to the test: decouple, inject the boundary, simplify the interface. |
| "TDD will slow me down" | Slower than what — debugging in CI? The red phase is where AI-written assertion-free tests get caught. |
| "The tests pass, so I'm done" | Locally green isn't done. Done = `scripts/gates/gates-suite.sh` exit 0: traceability, mutation on changed core code, axe, budgets — all of it (Art. III/X). |
| "The reviewer approved it, so it's done" | No reviewer closes work in Kimen — review catches what rules cannot, and merge is the founder's gate. Done is still gates exit 0. |
| "This is different because…" | The exception you're crafting is the rationalization. If the case is genuinely exceptional, it goes in the founder's question batch — it is not self-granted. |

**Red flags — STOP and restart the cycle** (any of these means: delete the untested code, go back to red):

- Production code written before its test
- A test that passed the first time you ran it
- You can't explain what the failing run looked like, or why it failed
- Tests added "later, to bump coverage"
- Assertions weakened until the suite went green
- A quarantined test with no owner or deadline
- "Just this once", "it's about spirit not ritual", "I'm being pragmatic"
- Declaring done from your own assessment, a subagent's, or a reviewer's — the only "done" is the gates suite exiting 0

## Definition of done (testing)

"Done" is not this checklist — done is `scripts/gates/gates-suite.sh` exiting 0 (Art. III/X). This checklist is what you verify BEFORE running the suite so it goes green on the first try:

1. Every scenario (S-ID) in the approved `feature.feature` has a corresponding test at the right level, asserting the scenario's observable outcome.
2. Bug fixes carry their regression test, and you watched it fail first.
3. Suite is deterministic: no retries needed locally, parallel-safe.
4. New/changed core logic: mutation-survivor check on changed files (Stryker incremental, ≥70%).
5. Component minimum covered per `ki-` component: core behavior, keyboard, axe + semantics, theming/token override, form participation where applicable.
6. No new quarantined tests without owner + deadline.

Then run the gates. If they're red, the work isn't done — no matter who says otherwise.
