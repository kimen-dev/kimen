---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, BEFORE proposing fixes. Four-phase root-cause methodology; in Kimen the reproduction IS a failing test (Art. III), and only gates exiting 0 closes the fix.
---

<!--
Vendored from Superpowers (https://github.com/obra/superpowers)
Source: skills/systematic-debugging/SKILL.md @ release v5.1.0
(commit f2cbfbefebbfef77321e4c9abc9e949826bea9d7)
Copyright (c) 2025 Jesse Vincent (Prime Radiant) - MIT License
Adapted for Kimen: references to other Superpowers skills/workflows removed;
reproduction step now REQUIRES a failing test first (constitution Art. III);
mid-loop "human partner" interaction replaced with batched founder escalation
(CLAUDE.md); "done" redefined as scripts/gates/gates-suite.sh exit 0
(Art. III/X). See /NOTICE for full third-party attribution.
-->

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

Kimen framing (constitution): a bug fix starts with a failing test reproducing
the bug — no exceptions (Art. III). A fix is "done" only when
`scripts/gates/gates-suite.sh` exits 0 — never when you, or a reviewer, judge
it fixed (Art. III/X). Questions this process cannot answer are batched for
the founder; the loop never idles waiting on a human (Workflow).

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Gate failures you don't immediately understand
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- The fix "must land NOW" (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce as a Failing Test — FIRST (Art. III, NON-NEGOTIABLE)**
   - In Kimen, "reproduce" means: write the failing test that reproduces the
     bug BEFORE anything else. Not manual steps, not a scratch script you
     throw away — a test that enters the suite and stays as the regression net.
   - Verify it fails FOR THE RIGHT REASON (the bug), not for a typo or setup
     error. A reproduction you never saw fail proves nothing.
   - Write it at the lowest level that can observe the bug (unit for pure
     logic, browser-mode component test for `ki-` component behavior — see the
     `frontend-qa` skill).
   - If you cannot reproduce it deterministically → gather more data, don't
     guess. Fake timers, seeded randomness, no live network (Art. III).

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN the system has multiple components (CI → build → publish, agent →
   adapter → renderer, token source → Style Dictionary → CSS variable):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters the component
     - Log what data exits the component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify the failing component
   THEN investigate that specific component
   ```

   This reveals which layer fails (e.g. spec → validator OK, validator →
   renderer NOT OK) instead of guessing.

5. **Trace Data Flow**

   **WHEN the error is deep in the call stack:**

   See `references/root-cause-tracing.md` for the complete backward tracing
   technique.

   **Quick version:**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in the same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing a pattern (APG interaction pattern, Stencil lifecycle,
     ElementInternals wiring), read the reference implementation COMPLETELY
   - Don't skim — read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test the hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X" — in writing, in the work log
   - Don't pretend to know
   - Record the open question in the batch for the founder; keep
     investigating other angles instead of idling (Workflow)

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Confirm the Failing Test Still Captures the Root Cause**
   - The failing test exists since Phase 1, step 2 — that is the entry ticket
     for any bug fix (Art. III)
   - Now that you know the root cause, refine it to the simplest reproduction
     at the right level, and verify it still fails for the right reason
   - Test-writing rules live in the `frontend-qa` skill

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - The Phase 1 test passes now?
   - No other tests broken?
   - `scripts/gates/gates-suite.sh` exits 0? Only that closes the work —
     never your own assessment (Art. III/X)

4. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with the new information
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
   - DON'T attempt Fix #4 without an architectural decision

5. **If 3+ Fixes Failed: Question the Architecture**

   **Pattern indicating an architectural problem:**
   - Each fix reveals new shared state/coupling/problem in a different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we sticking with it through sheer inertia?
   - Should we refactor the architecture vs. continue fixing symptoms?

   This is NOT a failed hypothesis — this is a wrong architecture, and
   architecture changes exceed a bug fix's mandate (Art. II: behavior change
   needs a spec). **Escalate to the founder** — see Escalation below.

## Escalation (Kimen)

There is no human in the loop to chat with mid-debug. Escalation is batched
and explicit (CLAUDE.md, Workflow):

- **What escalates:** 3+ failed fix attempts (architectural doubt), a fix that
  would change specified behavior (needs a spec change, Art. II), a fix
  touching the guardrail/security boundary (Art. VIII), or a root cause in a
  dependency pillar (compiler, test runner) whose replacement is
  constitutional.
- **How:** write the question into the batch for the founder with the
  evidence gathered (hypotheses tried, instrumentation output, the failing
  test). Then either continue on independent work or, in an unattended loop,
  treat it as the stuck-threshold and terminate the iteration per the loop
  contract (Art. XI); never idle waiting for the answer.
- **Never:** keep attempting fixes past the threshold to avoid escalating.

## Red Flags — STOP and Follow the Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the failing test, I'll manually verify" (violates Art. III directly)
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals a new problem in a different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** question the architecture (Phase 4, step 5) and
escalate to the founder.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. The process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | The first fix sets the pattern. Do it right from the start. |
| "I'll write the test after confirming the fix works" | Untested fixes don't stick, and Art. III forbids it: failing test first, no exceptions. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question the pattern and escalate; don't fix again. |
| "It works now, I'm done" | "Done" is `gates-suite.sh` exit 0, nothing else (Art. III/X). |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, write the failing test, check changes, gather evidence | Bug reproduced by a failing test; understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Fix root cause, one change | Phase 1 test green, gates exit 0 |

## When the Process Reveals "No Root Cause"

If systematic investigation reveals the issue is truly environmental,
timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message) — with its
   own failing-test-first cycle
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation. And a
flaky gate is a bug fixed before the gate is trusted (Art. X) — "environment"
is not a resting state.

## Supporting Techniques

Available in `references/` in this skill directory:

- **`references/root-cause-tracing.md`** — trace bugs backward through the
  call stack to find the original trigger
- **`references/defense-in-depth.md`** — add validation at multiple layers
  after finding the root cause
- **`references/condition-based-waiting.md`** — replace arbitrary timeouts
  with condition polling (read the Kimen note there: web-first assertions
  come first)

Related Kimen skills: `frontend-qa` (how to write the failing test, flaky
policy, mutation gate), `frontend-best-practices` (component code criteria).

## Real-World Impact

From upstream debugging sessions:
- Systematic approach: 15–30 minutes to fix
- Random-fixes approach: 2–3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: near zero vs common
