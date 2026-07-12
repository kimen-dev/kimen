# Integrity Requirements Checklist: Project integrity hardening

**Purpose**: Unit-test the completeness, clarity and consistency of the
approval-to-publication requirements before tasks and implementation
**Created**: 2026-07-09
**Feature**: [spec.md](../spec.md)

**Audience/timing**: formal reviewer checklist at spec/plan review and again
before the clean-context review packet is built.

## Requirement Completeness

- [x] CHK001 Are the canonical contract bytes, both approved hashes, exact marker keys and stale-approval behavior all specified? [Completeness, Spec §FR-001–FR-003, Contract approval-marker-v2]
- [x] CHK002 Are requirements present for every transition from unapproved through approved, stale and reapproved states? [Completeness, Data model §ApprovedContract]
- [x] CHK003 Does the protected-main requirement enumerate target ref, merge method, history, review-thread, update, deletion, force-push and break-glass policy? [Completeness, Spec §FR-004–FR-006]
- [x] CHK004 Are both phases of revision-bound review rollout documented, including the period before a real required context exists? [Completeness, Spec §FR-005, Research §3]
- [x] CHK005 Are all changed executable-file outcomes documented: mutation scope, justified exclusion and unclassified failure? [Completeness, Spec §FR-007, Data model §MutationScope]
- [x] CHK006 Are acquisition, validation, mount, revocation, expiry and unavailable-broker outcomes specified for the model lease? [Completeness, Spec §FR-008, Contract model-lease-v1]
- [x] CHK007 Are firewall, install, browser, agent, gates, host interruption and clean-tree snapshot paths all covered by attempt evidence requirements? [Completeness, Spec §FR-010, Contract attempt-evidence-v1]
- [x] CHK008 Are first release, dry run, tag/version mismatch, artifact tampering and publisher failure requirements present? [Completeness, Spec §FR-011–FR-012, Contract release-candidate-v1]
- [x] CHK009 Does the public API inventory include package exports, every CEM facet, tokens and browser baseline rather than only TypeScript declarations? [Completeness, Spec §FR-014–FR-015, Contract public-api-snapshot-v1]
- [x] CHK010 Are token requirements defined for all four theme/scheme compositions, references, cycles, collisions, layer direction, literals and descriptions? [Completeness, Spec §FR-016–FR-017, Research §12]
- [x] CHK011 Are every generator consumer and every permitted composite-budget exception named rather than hidden behind “all surfaces”? [Completeness, Spec §FR-018–FR-019, Plan §Project Structure]
- [x] CHK012 Are every public status destination and every availability evidence source represented in the capability contract? [Completeness, Spec §FR-022, Contract capability-claims-v1]

## Requirement Clarity

- [x] CHK013 Is “matching contract pair” defined byte-for-byte, including final-newline normalization and no gate-side mutation? [Clarity, Contract approval-marker-v2, Research §1]
- [x] CHK014 Is the mutation score explicitly per changed-core runner group so a historic/project aggregate cannot satisfy 70%? [Clarity, Spec §SC-003, Research §2]
- [x] CHK015 Is “short-lived” bounded by a concrete attempt timeout plus fixed grace, with static OAuth/API keys explicitly invalid? [Clarity, Contract model-lease-v1]
- [x] CHK016 Is “declared destination” defined as an exact hostname and port decision rather than a shared destination IP? [Clarity, Spec §FR-009, Data model §EgressPolicy]
- [x] CHK017 Is the green/red attempt rule unambiguous when agent and gate exit codes disagree? [Clarity, Spec Edge Cases, Contract attempt-evidence-v1]
- [x] CHK018 Is “same artifact” defined through source SHA, artifact ID, archive digest and per-tarball digests? [Clarity, Contract release-candidate-v1]
- [x] CHK019 Are patch, minor, major and unknown API deltas classified with enough precision to decide defaults, requiredness and type narrowing? [Clarity, Contract public-api-snapshot-v1]
- [x] CHK020 Is “zero manual edits” scoped to the exact generated-component outputs and downstream discovery commands? [Clarity, Spec §SC-012, Quickstart §6]

## Requirement Consistency

- [x] CHK021 Does the gates-only verdict in S5 remain consistent with observable agent interruption and host-finalizer requirements? [Consistency, Spec S5/Edge Cases, Research §7]
- [x] CHK022 Does S7’s no-publishing-identity validation rule remain consistent with artifact upload and browser evidence collection? [Consistency, Spec S7/FR-012, Research §9]
- [x] CHK023 Is the additive 018 token/API promise consistent with deferring removal or internalization of the existing 694 component tokens? [Consistency, Spec Constitutional Surface, Research §12]
- [x] CHK024 Are catalog, renderer, guardrail and adapter terms consistently marked planned across functional requirements, assumptions and capability claims? [Consistency, Spec §FR-022/Assumptions, Contract capability-claims-v1]
- [x] CHK025 Do the tracked gate-skill update requirements align with the repository rule not to modify the user-owned untracked `.agents/` mirror? [Consistency, Plan §Constraints/Post-Design]
- [x] CHK041 Is the existing root barrel deprecated with direct replacements, frozen for new components, retained for at least one MINOR and removable only by a separately approved MAJOR? [Consistency, Spec §FR-024, Constitution Arts. IV/IX]

## Acceptance Criteria Quality

- [x] CHK026 Can every SC-001–SC-014 outcome be decided with an exact count, threshold, hash, context or zero-tolerance rule? [Measurability, Spec §Success Criteria]
- [x] CHK027 Do 69% and 70% fixtures exercise the same threshold policy used by Stryker rather than a disconnected textual assertion? [Acceptance Criteria, Spec §SC-003]
- [x] CHK028 Does the clean-consumer criterion require compilation and real component/theme rendering, not only string or tarball inspection? [Acceptance Criteria, Spec §SC-008, Quickstart §5]
- [x] CHK029 Does the generated-component criterion define a clean environment and exact build, packaging, budget and browser discovery evidence? [Acceptance Criteria, Spec §SC-012]
- [x] CHK030 Does protected-main success include a negative stale-SHA case and a positive current all-green squash case? [Acceptance Criteria, Spec §SC-002, Quickstart §9]

## Exception, Recovery and Edge-Case Coverage

- [x] CHK031 Are no-core-change, no-baseline/first-release and no-real-review-check states intentionally specified rather than silently skipped? [Coverage, Research §§2, 3, 11]
- [x] CHK032 Are recovery requirements defined when lease revocation fails but server expiry remains the backstop? [Recovery, Contract model-lease-v1]
- [x] CHK033 Are SIGINT/SIGTERM/container death and the host’s inability to run cleanup distinguished from recoverable finalization? [Coverage, Spec §SC-005, Research §7]
- [x] CHK034 Are CDN rotation/proxy failure requirements fail-closed without weakening the exact-host allowlist? [Edge Case, Research §5]
- [x] CHK035 Are artifact digest mismatch, missing package, extra package and lifecycle-script cases all specified as publication blockers? [Coverage, Contract release-candidate-v1]
- [x] CHK036 Is existing spec drift explicitly handled through migration/reapproval rules instead of grandfathering? [Recovery, Spec Edge Cases/FR-003]

## Non-Functional Requirements and Dependencies

- [x] CHK037 Is the mutation/three-browser cost bounded by named CI timing and parallelization expectations? [Non-Functional, Plan §Technical Context]
- [x] CHK038 Is zero runtime dependency impact stated consistently for every new validator, proxy and test tool? [Non-Functional, Spec Constitutional Surface, Plan §Constitution Check]
- [x] CHK039 Are base-image, CLI, lockfile, action and trusted-integration supply-chain requirements all represented? [Security, Spec §FR-009/FR-023]
- [x] CHK040 Are external prerequisites—lease broker, npm trusted publisher/environment and repository-admin authentication—documented with fail-closed local behavior? [Dependency, Plan §Post-Design]

## Notes

- Check items off as the requirements review is completed; findings change the
  spec/plan only through the constitutional approval rules.
- These items assess requirement quality. Implementation verification belongs
  to scenario tests, tasks and deterministic gates.
