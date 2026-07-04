---
name: requesting-code-review
description: Use after gates are green and before the founder's merge gate, to dispatch a clean-context reviewer agent with a pre-baked review packet (diff, spec, feature.feature, constitutional surface, gates output). Review catches ONLY what gates cannot; the verdict never closes work.
---

<!--
Vendored from Superpowers (https://github.com/obra/superpowers)
Source: skills/requesting-code-review/SKILL.md @ release v5.1.0
(commit f2cbfbefebbfef77321e4c9abc9e949826bea9d7)
Copyright (c) 2025 Jesse Vincent (Prime Radiant) - MIT License
Adapted for Kimen: rebuilt around Kimen's Workflow — review runs only after
scripts/gates/gates-suite.sh exits 0; the reviewer is a clean-context agent
(different model vendor preferred) fed a pre-baked packet assembled by
scripts/review-package.sh (Kimen-original); scope restricted to what gates
cannot decide (Art. X); the reviewer's verdict never closes work — merge stays
a human gate. Upstream's subagent-driven-development / executing-plans
integrations removed. See /NOTICE for full third-party attribution.
-->

# Requesting Code Review

Dispatch a clean-context reviewer agent to catch what deterministic gates
cannot. The reviewer gets a precisely crafted packet — never the writer's
session history. This keeps the reviewer focused on the work product, not the
writer's thought process, and is what makes the review a genuine second pair
of eyes (Workflow: no shared context with the writer; a different model
vendor preferred).

**Core principle:** gates decide everything a script can decide (Art. X);
review exists to catch what rules cannot. The reviewer's verdict NEVER closes
work — "done" is `scripts/gates/gates-suite.sh` exit 0, and merge is always
the founder's gate.

## Where This Sits in the Workflow

```
/speckit-implement → /speckit-converge → gates exit 0 → REVIEW (this skill) → merge (human)
```

## Preconditions — all mandatory

1. **Gates are green.** `scripts/gates/gates-suite.sh` exits 0 on the branch.
   A red gate means the work is not reviewable — review never substitutes for
   gates, and a reviewer must never be asked to "check whether it's probably
   fine".
2. **Approved spec exists.** `specs/<feature>/spec.md` and
   `specs/<feature>/feature.feature` with stable S-IDs (Art. II). No spec, no
   review — there is nothing to review against.
3. **UI-affecting change → rendered evidence.** Screenshots of each affected
   component state, plus the visual-regression diff where layout is the
   contract (Workflow). Agents reason poorly about pixels from code alone.

## The Review Packet

Assemble it with the audited, network-free script in this skill:

```bash
.claude/skills/requesting-code-review/scripts/review-package.sh \
  specs/<feature-dir> [<base-ref>] [<head-ref>]
```

| Packet file | Contents |
|---|---|
| `diff.stat`, `diff.patch` | The exact change under review (base..head) |
| `spec.md` | The approved spec |
| `feature.feature` | The Gherkin behavior contract with S-IDs |
| `scenario-ids.txt` | Extracted S-IDs, the reviewer's compliance checklist |
| `constitutional-surface.md` | The spec's Constitutional Surface section — which articles this feature touches |
| `gates-output.txt` | Proof the deterministic layer already passed |
| `evidence/` | Rendered evidence for UI-affecting changes (screenshots, VR diffs) |
| `MANIFEST.md` | Inventory + reviewer scope reminder |

The script refuses to build a packet from a red gates run or an empty diff.
Pass `GATES_LOG=<path>` to reuse an existing green run instead of re-running
the suite; pass `EVIDENCE_DIR=<path>` to include rendered evidence.

## How to Dispatch

1. Run `review-package.sh` (above).
2. Dispatch a **fresh agent** — clean context, zero shared history with the
   writer, different model vendor when available — using the template in
   `code-reviewer.md` in this skill directory. Fill in `{PACKET_DIR}` and
   `{DESCRIPTION}`.
3. **Act on feedback:**
   - Fix Critical issues immediately (failing-test-first if behavior is
     wrong — see `systematic-debugging`)
   - Fix Important issues before requesting round 2
   - Note Minor issues for later
   - Push back if the reviewer is wrong — with technical reasoning, in the
     round-2 packet notes; never silently ignore a finding
4. **Max 2 review rounds** (Workflow). Still unresolved after round 2 →
   escalate to the founder with both review reports, batched; do not idle.

## Review Scope — Only What Gates Cannot Catch

The reviewer judges exactly four things:

- **Spec compliance per scenario (Art. II):** for each S-ID, does the diff
  actually implement the specified observable behavior — not a drifted
  approximation of it? Traceability (every S-ID appears in a test) is already
  a gate; the reviewer judges whether the test asserts the right behavior.
- **API design (Art. IX, Art. I):** prop/event/part/slot/token surface
  naming and shape, SemVer impact honestly declared, JSDoc when-to-use
  guidance an agent could actually act on, no accidental public surface.
- **Accessibility semantics (Art. V):** axe-zero is a gate; the reviewer
  judges what axe cannot — the right APG pattern (complete, or no ARIA at
  all), sensible accessible names, focus order, announcement semantics,
  keyboard path matching the pattern, using `evidence/` for rendered states.
- **Simplicity (Art. VII):** speculative props, premature generality,
  wrapper components that don't earn their registration, abstraction before
  the third occurrence.

**Out of scope — gate territory (Art. X):** formatting, lint findings, type
errors, coverage or mutation numbers, bundle budgets, token-allowlist
violations, boundary leaks, secrets, dependency risk. A finding a rule can
produce is never left to review. If the reviewer spots something mechanically
decidable that slipped through, that is a **gate gap**: it gets reported
separately and produces a new/extended gate (incident-to-gate rule), not just
a review comment.

## Red Flags

**Never:**
- Skip review because "it's a simple change" (simple changes drift too)
- Dispatch review while gates are red ("the reviewer can confirm it's fine")
- Treat reviewer approval as done — done is gates exit 0; merge is the
  founder's
- Share the writer's session, plan chatter, or reasoning with the reviewer
- Run more than 2 rounds without escalating to the founder
- Ignore Critical issues or argue past valid technical feedback

**If the reviewer is wrong:** push back with reasoning and evidence (code,
tests, spec lines). Reviewers hallucinate too — that is why the verdict
closes nothing.

See the dispatch template at: `code-reviewer.md` in this skill directory.
