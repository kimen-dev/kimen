---
name: requesting-code-review
description: Optional single-pass clean-context review for large, security-sensitive, public-API, accessibility-pattern, or unfamiliar Kimen changes. It is advisory and never creates a required CI result.
---

<!--
Adapted from Superpowers requesting-code-review, release v5.1.0
(f2cbfbefebbfef77321e4c9abc9e949826bea9d7), MIT License.
Kimen 2.0 adaptation: optional, one pass and direct diff input, without bespoke
evidence infrastructure or a blocking CI result.
See /NOTICE.
-->

# Optional Clean-Context Review

Use this skill only when a second independent judgment is likely to pay for
itself:

- a large or generated-heavy diff;
- a public API or SemVer change;
- a security/guardrail boundary;
- a new accessibility interaction pattern;
- unfamiliar code where the writer has low confidence.

Routine component fixes, docs, dependency maintenance and mechanical refactors
do not require it.

## Preconditions

1. The fast quality workflow is green.
2. The change is stable enough to review once.
3. UI changes include screenshots when visual behavior matters.

## One-pass procedure

Dispatch one fresh agent with no writer-session history. Give it only:

- the PR or `git diff`;
- the relevant `feature.feature` when Article II required one;
- the focused test result;
- screenshots for visual changes.

Ask it to inspect spec compliance, public API shape, accessibility semantics,
security boundaries and unnecessary complexity. It must cite exact files and
lines and distinguish real defects from optional improvements.

## Handling the report

- Fix a confirmed Critical defect before proposing merge.
- Fix an Important defect when the failure impact is material to this change.
- Put suggestions, speculative hardening and possible new gates in the backlog.
- Do not dispatch a second pass. The founder decides whether the evidence is
  sufficient to merge.

Clean-context review is advisory. It never creates a required status result or
expands the current change merely because a reviewer can imagine another
control.
