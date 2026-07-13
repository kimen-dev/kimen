# Feature Specification: Project integrity hardening

> Historical contract. Constitution 2.0.0 retired repository approval hashes,
> blocking clean-context evidence and per-PR mutation; the code and current
> governance files are authoritative for the replacement 20/80 model.

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Arts. I–IV and IX–XI. -->

**Feature Branch**: `018-project-integrity-hardening`

**Created**: 2026-07-09

**Status**: Historical record of the founder's 2026-07-09 approval of S1–S13,
including S2, S4, S5 and S7 and preservation of `002-ki-button` S14. The
former hash marker is intentionally no longer present.

**Input**: User description: "Execute the accepted project-review findings:
make approved contracts tamper-evident, protect main, add mutation and token
integrity gates, contain unattended agents, validate all supported browsers,
separate release authority, prove packaged machine surfaces from a clean
consumer, complete generator wiring and make public claims match shipped
capability. Keep the GenUI catalog, renderer and adapters as later features."

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. Behavior enters the system exactly once here
(Art. II). Security-boundary scenarios S2, S4, S5 and S7 require explicit
standalone attention at human gate 1.

## Design-source analysis

Not applicable. This feature changes repository policy, build evidence,
packaging contracts and operational containment; it adds no visual component.
The governing sources are the constitution, approved feature contracts and
the public package formats.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The founder can trust what reaches main (Priority: P1)

As the sole founder, I can merge without manually reconstructing evidence:
the current revision must match its approved behavior contract, pass all
deterministic and security gates, and carry a clean-context review of that
same revision.

**Why this priority**: an unprotected default branch or stale approval makes
every downstream quality claim optional.

**Independent Test**: alter one approved contract file or target main with a
failing/stale check and verify that planning, implementation or merge remains
blocked with a specific reason.

**Acceptance Scenarios**: S1, S2 and S3.

---

### User Story 2 - Automation fails safely (Priority: P1)

As the founder running unattended agents or releases, I know they cannot read
durable production authority, escape declared network destinations or publish
an artifact that did not pass the complete prerelease evidence.

**Why this priority**: agent and publishing boundaries have the highest blast
radius in a one-person AI-first project.

**Independent Test**: exercise the sandbox with denied credentials and network
destinations, inject agent/gate failures, and inject a WebKit-only prerelease
failure; each boundary must fail closed and retain evidence.

**Acceptance Scenarios**: S4, S5, S6 and S7.

---

### User Story 3 - A clean consumer can use what Kimen advertises (Priority: P1)

As an external developer or coding agent, I can install packed artifacts,
follow `llms.txt`, inspect the manifest and classify an API change without
access to monorepo internals.

**Why this priority**: passing inside the workspace does not prove the package
contract consumers actually receive.

**Independent Test**: pack the packages into a clean fixture, compile every
advertised import and resolve every manifest path using only tarball contents.

**Acceptance Scenarios**: S8, S9 and S10.

---

### User Story 4 - New work inherits integrity by construction (Priority: P2)

As a maintainer or implementation agent, invalid tokens fail by name, a
generated component is registered everywhere without hand edits, and public
status pages cannot claim an unimplemented capability.

**Why this priority**: the factory must make the safe path the default rather
than relying on repeated reviewer memory.

**Independent Test**: run invalid token fixtures, scaffold a disposable
component in a clean checkout, and generate public status surfaces from the
current evidence inventory.

**Acceptance Scenarios**: S11, S12 and S13.

### Edge Cases

- A review or required check that passed on an older commit is stale and does
  not satisfy the current revision.
- A 70.00% mutation score passes; any value below 70% on changed core code
  fails. Files outside the declared core-logic scope are reported as not
  applicable rather than silently counted.
- An agent crash followed by green deterministic gates remains observable. An
  attempt whose gates never reach green is red and fetchable, never stranded
  in a disposable clone.
- DNS is part of the egress boundary; allowing arbitrary resolvers would make
  an HTTPS allowlist insufficient.
- A dry run exercises validation but receives no publishing identity and
  cannot mutate the repository.
- A manifest facet with an empty description is incomplete even when its name
  and type are present.
- A generated component name that already exists fails before writing files.
- Existing approved-contract drift is not grandfathered. The known S14 drift
  in `002-ki-button` must be explicitly reapproved or removed before the new
  contract-integrity gate can pass.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Project integrity is enforced from approval to publication
  Project policy is machine-enforced at every boundary so approved contracts,
  merge evidence, releases, package guidance and public claims describe
  exactly what Kimen can prove.

  Rule: Approved behavior remains one synchronized contract

    # S1
    Scenario: Changing either approved contract file invalidates approval
      Given the specification and extracted feature match and founder approval covers both hashes
      When either approved contract file changes
      Then the recorded approval becomes invalid
      And planning and implementation remain blocked until the matching pair is reapproved

  Rule: Main accepts only fully verified revisions

    # S2
    Scenario Outline: Missing merge evidence keeps the current revision out of main
      Given a change targets main and <evidence> does not cover its current revision
      When the founder attempts to merge the change
      Then merge remains unavailable
      And the repository identifies <requirement> as missing

      Examples:
        | evidence                                      | requirement             |
        | the required deterministic gates are failing  | green required checks   |
        | the clean-context review covers an older hash | current-revision review |

    # S3
    Scenario Outline: Changed core code respects the mutation threshold
      Given changed core code achieves a mutation score of <score> percent
      When the deterministic gates evaluate the change
      Then the mutation gate reports <decision>

      Examples:
        | score | decision |
        | 69    | blocked  |
        | 70    | passed   |

  Rule: Unattended execution remains contained and recoverable

    # S4
    Scenario: The unattended loop cannot read durable or publishing credentials
      Given an unattended loop has a dedicated short-lived model identity
      When the loop installs dependencies and executes its task
      Then no production, publishing or long-lived credential is readable
      And HTTPS and DNS traffic outside the declared destinations is denied

    # S5
    Scenario: Every unsuccessful unattended attempt leaves a red snapshot
      Given an unattended attempt changed its clone and reached no green gate verdict
      When the attempt terminates after an agent interruption or a gate failure
      Then the loop returns a red non-zero verdict
      And a fetchable snapshot records the changes and available exit evidence

  Rule: Release authority follows verified release state

    # S6
    Scenario: Failure in any supported browser blocks prerelease
      Given browser checks pass in Chromium and Firefox but fail in WebKit
      When prerelease validation evaluates the candidate
      Then the candidate is blocked from publication
      And the report records outcomes for Chromium, Firefox and WebKit

    # S7
    Scenario: Release phases receive only the authority they require
      Given a release candidate is awaiting validation
      When the release workflow evaluates the candidate
      Then validation has read-only source access and no publishing identity
      And publication accepts only the immutable artifact that passed validation
      And the publisher receives only short-lived OIDC authority scoped to the release

  Rule: Shipped machine contracts work for external consumers

    # S8
    Scenario: Every language-model example works from public package exports
      Given a clean consumer installs packed @kimen/elements and @kimen/tokens packages
      When the consumer follows every installation import and theming example in llms.txt
      Then the consumer build succeeds using only exported package paths
      And ki-button renders with the documented theme

    # S9
    Scenario: The packaged manifest completely describes a public component
      Given the packed elements package contains ki-dialog and its public contract
      When a consumer inspects the shipped custom-elements manifest
      Then every public facet and CSS custom property has a non-empty description
      And every referenced module and source path resolves inside the package

    # S10
    Scenario Outline: Public API compatibility determines the release class
      Given a candidate contains <change> relative to the previous public package
      When the compatibility gate evaluates the candidate
      Then it reports <release-class>
      And an undeclared breaking change is blocked

      Examples:
        | change                         | release-class |
        | a new optional public property | minor         |
        | a removed public property      | major         |

  Rule: Closed tokens and scaffolding are complete by construction

    # S11
    Scenario Outline: Invalid visual values fail closed-token validation
      Given a component stylesheet contains <violation>
      When closed-token validation evaluates the stylesheet
      Then validation fails and reports <offending-value>

      Examples:
        | violation                                               | offending-value           |
        | a reference to an undeclared token                       | the undeclared token name |
        | the literal transition duration 120ms                    | 120ms                     |
        | a primitive token consumed directly by component styles | the primitive token name  |

    # S12
    Scenario: A generated component is discovered by every required surface
      Given an approved component feature is ready for implementation
      When a contributor scaffolds ki-avatar
      Then source tests exports budgets token layers and machine surfaces are registered
      And clean build packaging and browser runs discover them without hand edits

  Rule: Public status never outruns verified capability

    # S13
    Scenario: Unimplemented GenUI capabilities are presented as planned
      Given the neutral catalog renderer guardrails and protocol adapters lack passing evidence
      When Kimen public status surfaces are produced
      Then the available product is described as a machine-readable Web Components foundation
      And absent capabilities are labelled planned rather than available
      And quality claims appear only when their corresponding evidence is green
```

### Scenario Family Coverage

This is an operational feature, not a UI component. Core behavior is covered;
the four interaction families are inapplicable.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S13 | |
| Keyboard path | | N/A — no interactive user surface is introduced |
| Assistive-tech outcome | | N/A — no rendered accessibility tree changes |
| Form participation | | N/A — no form control is introduced |
| Theming | | N/A — token contracts are validated but no appearance is specified |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The canonical Gherkin block in each `spec.md` MUST match its
  extracted `feature.feature`, and every feature file MUST pass the repository
  Gherkin shape and scenario-family gates.
- **FR-002**: Founder approval MUST record cryptographic hashes for both
  `spec.md` and `feature.feature`; changing either file invalidates approval.
  Pre-plan and pre-implement checks MUST reject missing, stale or mismatched
  approval evidence.
- **FR-003**: Existing contract drift MUST be resolved explicitly rather than
  grandfathered. In particular, `002-ki-button` S14 MUST either enter its
  approved spec through a new founder approval or be removed from behavior,
  tests and extracted Gherkin.
- **FR-004**: The effective `main` policy MUST target `refs/heads/main`, reject
  deletion, force-push and direct merge, require an up-to-date PR, allow only
  squash merge, require resolution of review threads and require the current
  revision's deterministic and security checks.
- **FR-005**: A clean-context agent review MUST produce revision-bound evidence
  that begins pending for each opened or updated PR and cannot pass for a
  different commit. Until such evidence exists as a real check, it MUST NOT be
  configured as an impossible required context.
- **FR-006**: Break-glass access MUST be limited to the founder through a PR,
  retain an audit trail and require the written justification and restoration
  issue prescribed by the constitution. No actor receives an unconditional
  bypass.
- **FR-007**: Changed core logic MUST run incremental mutation analysis and
  MUST reach at least 70%; the gate MUST fail at 69% and pass at 70%. Scope,
  cache and non-core exclusions MUST be explicit and deterministic.
- **FR-008**: The unattended environment MUST expose no production token,
  publishing right or long-lived secret to dependency installation or agent
  execution. Model access MUST use a dedicated, revocable, least-privilege
  identity whose usable lifetime is bounded to the attempt.
- **FR-009**: Agent egress MUST fail closed for both HTTPS and DNS, allowing
  only declared registries, model endpoints and build assets. Image bases,
  globally installed CLIs and other executable supply-chain inputs MUST be
  version- or digest-pinned.
- **FR-010**: An unattended attempt whose gates do not reach green MUST exit
  non-zero and leave a fetchable snapshot containing its changes plus every
  available agent and gate exit code. Expected non-zero commands MUST never be
  intercepted by shell fail-fast behavior before evidence capture.
- **FR-011**: Prerelease validation MUST execute the same candidate in current
  Chromium, Firefox and WebKit/Safari baselines and MUST block publication on
  any engine failure.
- **FR-012**: Release validation MUST have read-only repository access and no
  publishing identity. Publication MUST consume the immutable artifact that
  passed validation and receive only short-lived, release-scoped OIDC
  authority. Validation and publication MUST be separately auditable phases.
- **FR-013**: All `llms.txt` install, import and theme examples MUST work from
  packed public packages in a clean consumer with no workspace resolution or
  unpublished subpath access.
- **FR-014**: The shipped Custom Elements Manifest MUST describe every public
  property, attribute, event, method, slot, part and CSS custom property with
  a non-empty description. Every referenced path MUST exist in the packed
  package and use the manifest format's published-consumer semantics.
- **FR-015**: A package compatibility gate MUST compare the candidate public
  surface with the previous release, classify additive and breaking changes
  against SemVer, and block undeclared breaking changes across elements,
  tokens, manifests and package exports.
- **FR-016**: Closed-token validation MUST reject unresolved `--ki-*`
  references, hardcoded visual values including motion literals, direct
  primitive consumption by component styles and cross-layer references that
  violate primitive → semantic → component direction.
- **FR-017**: Current motion defects MUST be migrated to declared semantic or
  component motion tokens, and reset values MUST not expose primitives as a
  component contract. Published token leaves MUST carry descriptions suitable
  for machine consumers.
- **FR-018**: A single authoritative component registry or derivation rule MUST
  drive source exports, package exports, type/package checks, size budgets,
  token files, browser discovery and generated machine surfaces. The
  component generator MUST update that authority rather than a set of
  hand-maintained parallel lists.
- **FR-019**: Generator contract tests MUST prove that a disposable generated
  component is discovered by build, packaging, budgets and browser tests
  without follow-up manual edits.
- **FR-020**: TypeScript and deterministic analysis MUST include build, test
  and browser configuration files; duplicate or invalid configuration MUST
  fail before a browser process starts.
- **FR-021**: CI and local gates MUST use isolated, writable dependency caches
  and MUST NOT depend on a developer's global cache ownership or mutable
  machine state.
- **FR-022**: Public README, site, workshop and roadmap language MUST label the
  catalog, renderer, guardrail, adapters, mutation gate and other unavailable
  capabilities as planned or in hardening until their deterministic evidence
  is green.
- **FR-023**: Required security checks MUST be bound to their trusted GitHub
  integrations, not merely spoofable context strings. The initial protected
  set MUST cover deterministic gates, SAST, dependency review, dependency
  vulnerability/malicious-package scanning and secret scanning.
- **FR-024**: The pre-existing `@kimen/elements` root barrel MUST NOT receive
  new component exports. It MUST be deprecated in place with direct
  `@kimen/elements/ki-*` replacements and retained unchanged in public symbols
  for at least one MINOR; removal requires a separately approved MAJOR.

### Key Entities

- **Approved contract pair**: one `spec.md` and its exact extracted
  `feature.feature`, plus founder timestamp and both hashes.
- **Revision evidence**: required gate or clean-context-review result bound to
  one immutable commit hash.
- **Sandbox identity**: short-lived authority available to one contained
  attempt, with no production or publishing scope.
- **Validated release artifact**: immutable package bytes that passed every
  prerelease gate and are the only bytes publication may consume.
- **Public surface inventory**: package exports, component facets, tokens,
  manifest paths and machine guidance that participate in SemVer.
- **Capability evidence**: deterministic, current proof required before a
  capability is described as available.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive motion/component tokens and richer
  CEM descriptions become public; package/API diffing is added. The existing
  root barrel is deprecated without removing symbols and direct component
  subpaths are its replacements; actual removal is a later approved MAJOR. No
  existing component behavior is intentionally removed. SemVer classification
  is part of the feature rather than an afterthought.
- **Bundle budget** (Art. IV): zero intended runtime JavaScript cost. Stryker,
  pack-consumer fixtures and policy tooling are development-only; any runtime
  dependency is out of scope without a new written budget decision.
- **Accessibility** (Art. V): no new interaction. The known `ki-button` S14
  accessibility behavior is preserved only through explicit reapproval, not
  by silently tolerating spec drift.
- **Tokens** (Art. VI): introduces the minimum motion/component aliases needed
  to remove undefined/literal/primitive consumption; validates references and
  layer direction; requires public leaf descriptions.
- **Catalog/agent legibility** (Art. I): packed `llms.txt` and CEM become
  consumer-executable contracts. Runtime catalog/renderer behavior remains
  planned and out of scope.
- **Guardrail/security boundary** (Arts. VIII/X/XI): S2, S4, S5 and S7 touch
  merge authority, agent containment and publishing identity and therefore
  require explicit scenario approval. This feature does not implement the
  runtime UI-spec guardrail of Art. VIII.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: modifying one byte of either approved contract invalidates its
  approval; an intact synchronized pair with both recorded hashes passes.
- **SC-002**: a PR with any required failing check or stale review evidence is
  rejected by the effective `main` policy, while the same current revision
  with all evidence green can be squash-merged.
- **SC-003**: mutation fixtures at 69% and 70% deterministically fail and pass,
  respectively, and every changed core file is either evaluated or named as a
  documented exclusion.
- **SC-004**: the sandbox exposes zero durable production/publishing secrets
  and blocks one undeclared HTTPS destination plus one undeclared DNS query in
  automated tests.
- **SC-005**: simulated agent interruption and gate failure both leave a
  fetchable snapshot with exit evidence; every no-green attempt exits non-zero.
- **SC-006**: prerelease runs exactly Chromium, Firefox and WebKit, and an
  injected failure in any one prevents the publication phase from starting.
- **SC-007**: validation has neither `contents:write` nor `id-token:write`;
  only publication obtains OIDC after accepting the validated artifact digest.
- **SC-008**: every shipped `llms.txt` snippet compiles from tarballs in a
  fixture with no monorepo package linking.
- **SC-009**: 100% of manifest paths resolve inside the elements tarball and
  100% of public facets have non-empty descriptions.
- **SC-010**: the compatibility fixture classifies an added optional property
  as MINOR and blocks a removed property unless a MAJOR release is declared.
- **SC-011**: unresolved, literal-motion and primitive-consumption token
  fixtures each fail naming the offending file and value; production CSS has
  zero unresolved token references.
- **SC-012**: a disposable generated component requires zero manual edits
  after generation for build, packaging, budget and browser discovery.
- **SC-013**: every present-tense public capability claim has a current green
  evidence source; catalog, renderer, guardrail and adapters remain explicitly
  planned until their later feature gates pass.
- **SC-014**: every existing root-barrel symbol is marked deprecated with a
  direct-subpath replacement, its symbol set does not grow when `ki-avatar` is
  generated, and no symbol is removed before a later approved MAJOR.

## Assumptions

- Kimen remains a solo-founder repository. The branch policy therefore does
  not require another human approval, but it does require a PR, current checks,
  resolved conversations and revision-bound agent review evidence.
- The supported prerelease engines remain Chromium, Firefox and WebKit under
  the current/previous-stable policy in Art. IV.
- The 70% mutation threshold is constitutional and not configurable by this
  feature.
- The mechanical fixes already made to broken public imports, shell result
  capture, config typechecking, prerelease matrix wiring, CLI version pins and
  truthful documentation restore existing contracts; this feature supplies
  the missing systemic enforcement.
- The GenUI catalog/schema, deterministic renderer, runtime guardrail,
  streaming/state/actions and protocol adapters require separate approved
  features after this hardening work.
- Reducing or bypassing the constitutional Spec Kit workflow is out of scope;
  any simplification requires an explicit constitutional amendment.
