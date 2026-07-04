# Gherkin authoring guide (reference)

Deeper material behind `../SKILL.md`. Kimen-normative rules live in
`/kimen-constitution.md` Art. II and the gates under `scripts/gates/`; this
guide explains the craft and cites its sources.

## Why Gherkin at Kimen

Gherkin's documented value is shared understanding written down before code —
discovering edge cases and disagreements while they are cheap. Its documented
failure mode: teams skip the conversation and use Gherkin as a verbose
test-scripting syntax, ending up maintaining a glue-code layer that adds
nothing (the Cucumber team's own warning). Kimen adapts this to a one-person,
AI-First operation:

- The "conversation" is human gate 1: the founder reads and approves the
  scenarios. They must be readable in minutes, hence BRIEF.
- The `.feature` is an agent contract: implementing agents derive tests from
  it, the clean-context reviewer judges the diff against it, and the
  traceability gate binds every S-ID to a test. Imperative or vague Gherkin
  poisons all three consumers.
- No Cucumber runner / glue code by default. Tests mirror scenarios by
  carrying the S-ID in the test title (`it("S2: Space toggles ...")`). A step
  runner is optional tooling that must earn its maintenance cost before
  adoption (Art. VII: complexity must justify itself).

## BRIEF, in full

Six principles by Gáspár Nagy & Seb Rose (*Formulation*, The BDD Books). The
first five spell BRIEF; being brief is the sixth. Three goals sit behind them:
scenarios are documentation rather than tests; scenarios enable collaboration;
scenarios support the evolution of the product rather than obstruct it.

| Principle | Meaning | Common anti-pattern (per Rose) |
|---|---|---|
| **B**usiness language | Vocabulary from the domain, unambiguous to business readers | terms meaning different things in different contexts (address, user, date, account) |
| **R**eal data | Concrete values that expose boundaries and assumptions | depending on actual production data existing (customer ID "1234" must exist in some DB) |
| **I**ntention revealing | Describe intent, not mechanics — starting with the title | UI terminology: click button, follow link |
| **E**ssential | Every line contributes to illustrating the rule; incidental detail out | including date & time when the rule doesn't depend on time |
| **F**ocused | One rule per scenario | a scenario fails although its rule didn't change |
| Brief | ≤5 lines per scenario | long scenarios the product owner never reads |

Kimen hardens two of these from advice into gates: one `When` per scenario
(Focused, mechanically lintable) and ≤5 step lines (Brief, checked at review).

Real data has a boundary: use concrete values when they matter to the rule
("value `on`", token `#7a1fa2`), but never rely on specific pre-existing
environment data. In Kimen tests are deterministic and hermetic (Art. III), so
all data in a scenario is data the test itself sets up.

## Declarative vs imperative

Cucumber's core question for every step: "Will this wording need to change if
the implementation does?" If yes, rework it. `When "Bob" logs in` is a
functional requirement; `Given I visit "/login" / When I enter "Bob" in the
"user name" field / And I press the "login" button` is a procedural reference
that belongs in implementation, breaks on redesign, and buries the intent.
Declarative scenarios read as living documentation, survive UI changes (even
modality changes — thumbprint login still "logs in"), and stay short.

Corollaries used in review:

- Third person ("the user"), present tense, no "I".
- `Given` = state (past), `When` = the one action, `Then` = observable
  outcome. Multiple When/Then cycles = multiple scenarios (Automation Panda's
  "cardinal rule of BDD": one scenario, one behavior).
- For a component library, events, form data, and the accessibility tree ARE
  business language — they are the public contract agents and consumers wire
  against. What is forbidden is implementation vocabulary below the contract:
  CSS classes, shadow DOM structure, internal state, method names.

## Example Mapping (discovery before formulation)

Matt Wynne's technique for decomposing a story before writing scenarios, using
four card types: **story** (yellow), **rules** (blue), **examples** (green,
each illustrating exactly one rule), **questions** (red, parked so the session
keeps moving). A rule without examples is ambiguous; an example without a rule
lacks context. Each green card becomes one scenario.

Kimen solo-founder adaptation, run during `/speckit-specify`/`/speckit-clarify`:

1. Agent drafts the map from the feature description: rules (candidate
   acceptance criteria), 1–3 concrete examples per rule, red-card questions.
2. Red cards become the batched question list for the founder — never idle
   waiting on answers (Workflow); ambiguity surfacing here is the point.
3. Green cards become scenarios with S-IDs; blue cards shape scenario titles
   (rule + outcome) and the spec's Functional Requirements.
4. A rule with too many examples to stay readable is a sign the rule should be
   split, not that the file should grow unbounded.

## Scenario Outline discipline

`Scenario Outline` + `Examples` is for the SAME rule across multiple data
points (boundary tables), nothing else. Documented failure modes (Cucumber
anti-patterns): outlines make adding "just another row" free, which explodes
scenario counts and slows suites — especially painful for browser-mode suites
like Kimen's; and outlines get abused to staple unrelated behaviors together
with parameterized steps nobody can read.

Kimen specifics: one outline carries ONE `# S<n>` ID covering all rows
(lint counts the outline as one scenario); prefer 2–4 rows that hit real
boundaries over exhaustive tables — exhaustive input coverage belongs in
property-based tests (fast-check, Art. III), not in the spec.

## Keeping features maintainable as living documentation

- One feature per file; the file mirrors the component/use-case
  (`specs/<feature>/feature.feature`). The scenario list should read as a
  behavior index.
- A scenario earns its place when a human or agent learns what the system
  must do without reading code. A scenario that only restates implementation
  is deleted (with its ID retired, never reused).
- Scenario-count discipline: specs illustrate rules with key examples; they
  are not the exhaustive test suite. Edge-case combinatorics live in tests
  under the same S-ID family.
- `Background` only for state genuinely shared by ALL scenarios in the file,
  ≤4 lines, never containing a `When`.
- A scenario that stops matching behavior is a bug in the spec or in the
  code — fix one of them; never delete or weaken the scenario to make CI
  green. Behavior changes go through a spec change (Art. II) first.
- Steps stay reusable-by-phrasing (consistent wording for the same state or
  action across files) but are never contorted into parameterized
  monsters to force reuse (conjunctive-step anti-pattern).

## Testing generative UI by contract

For GenUI flows (catalog + adapters, Art. VIII), scenarios assert the
guardrail boundary, never model output:

```gherkin
# S1
Scenario: Rendered specs contain only catalog components
  Given a catalog containing "ki-metric" and "ki-card"
  When the adapter renders a spec referencing "ki-metric" and "script"
  Then the UI renders "ki-metric" and rejects "script"
```

Deterministic in CI (schema validation, guardrails); live-LLM evals are
scheduled, never merge-blocking (Art. III).

## Sources

Normative (repo):

- `/kimen-constitution.md` Art. II (Specs Before Code), Art. III, V, VI, VIII
- `scripts/gates/lint-feature.sh`, `scripts/gates/check-traceability.sh`
- `.specify/templates/overrides/spec-template.md` (Gherkin section + family table)

External:

- Cucumber docs — Writing better Gherkin (declarative style, what-not-how):
  https://cucumber.io/docs/bdd/better-gherkin/
- Seb Rose — Keep your scenarios BRIEF (Cucumber blog, 2019):
  https://cucumber.io/blog/bdd/keep-your-scenarios-brief/
- Gáspár Nagy & Seb Rose — The BDD Books: Formulation (scenario writing):
  https://leanpub.com/bddbooks-formulation
- Gáspár Nagy — Clean up bad BDD scenarios:
  https://gasparnagy.com/2019/05/clean-up-bad-bdd-scenarios/
- Cucumber docs — Anti-patterns (feature-coupled steps, conjunction steps):
  https://cucumber.io/docs/guides/anti-patterns/
- Cucumber blog — Cucumber anti-patterns, parts one & two (no collaboration,
  scenarios as tests, incidental details, outline overuse):
  https://cucumber.io/blog/bdd/cucumber-antipatterns-part-one/
  https://cucumber.io/blog/bdd/cucumber-anti-patterns-part-two/
- Cucumber docs — Example Mapping:
  https://cucumber.io/docs/bdd/example-mapping
- Matt Wynne — Introducing Example Mapping:
  https://cucumber.io/blog/bdd/example-mapping-introduction/
- Automation Panda — BDD 101: Writing Good Gherkin (golden rule; one
  scenario, one behavior):
  https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/
- Thomas Sundberg — Cucumber Anti-Patterns:
  https://www.thinkcode.se/blog/2016/06/22/cucumber-antipatterns
- Cucumber docs — Gherkin reference (keywords, Background, Scenario Outline):
  https://cucumber.io/docs/gherkin/reference/
