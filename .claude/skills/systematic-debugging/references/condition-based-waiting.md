<!--
Vendored from Superpowers (https://github.com/obra/superpowers)
Source: skills/systematic-debugging/condition-based-waiting.md @ release v5.1.0
(commit f2cbfbefebbfef77321e4c9abc9e949826bea9d7)
Copyright (c) 2025 Jesse Vincent (Prime Radiant) - MIT License
Adapted for Kimen: added the precedence note below (framework web-first
assertions before hand-rolled polling, per the frontend-qa skill); dropped
upstream's condition-based-waiting-example.ts (session-specific Node example
not vendored). See /NOTICE for full third-party attribution.
-->

# Condition-Based Waiting

> **Kimen precedence note.** In browser-mode component tests and Playwright
> E2E, the framework already ships auto-retrying, web-first assertions
> (`expect(locator).toBeVisible()`, `expect.poll`, `vi.waitFor`). Those come
> FIRST — they are the [Always] rule in `frontend-qa` ("never
> `waitForTimeout`/sleep"). Hand-roll the `waitFor` pattern below only where
> no framework primitive can observe the condition (pure-logic async code,
> Node-side tooling, custom event buses).

## Overview

Flaky tests often guess at timing with arbitrary delays. This creates race
conditions where tests pass on fast machines but fail under load or in CI.

**Core principle:** Wait for the actual condition you care about, not a guess
about how long it takes.

## When to Use

**Use when:**
- Tests have arbitrary delays (`setTimeout`, `sleep`, `waitForTimeout`)
- Tests are flaky (pass sometimes, fail under load)
- Tests time out when run in parallel
- Waiting for async operations to complete

**Don't use when:**
- Testing actual timing behavior (debounce, throttle intervals) — and in
  Kimen those use fake timers anyway (Art. III: determinism)
- Always document WHY if an arbitrary timeout survives review

## Core Pattern

```typescript
// ❌ BEFORE: Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: Waiting for the condition
await waitFor(() => getResult() !== undefined, 'result available');
const result = getResult();
expect(result).toBeDefined();
```

## Quick Patterns

| Scenario | Pattern |
|----------|---------|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'), 'DONE event')` |
| Wait for state | `waitFor(() => machine.state === 'ready', 'machine ready')` |
| Wait for count | `waitFor(() => items.length >= 5, '5 items')` |
| Wait for file | `waitFor(() => fs.existsSync(path), 'file exists')` |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10, 'obj ready')` |

## Implementation

Generic polling function:
```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

## Common Mistakes

**❌ Polling too fast:** `setTimeout(check, 1)` — wastes CPU
**✅ Fix:** Poll every 10ms

**❌ No timeout:** Loop forever if the condition is never met
**✅ Fix:** Always include a timeout with a clear error

**❌ Stale data:** Caching state before the loop
**✅ Fix:** Call the getter inside the loop for fresh data

## When an Arbitrary Timeout IS Correct

```typescript
// Tool ticks every 100ms — need 2 ticks to verify partial output
await waitFor(() => started, 'tool started'); // First: wait for the condition
await new Promise(r => setTimeout(r, 200));   // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals — documented and justified
```

**Requirements:**
1. First wait for the triggering condition
2. Based on known timing (not guessing)
3. Comment explaining WHY

## Real-World Impact

From an upstream debugging session (2025-10-03):
- Fixed 15 flaky tests across 3 files
- Pass rate: 60% → 100%
- Execution time: 40% faster
- No more race conditions

Kimen's flaky-test policy still applies afterwards (`frontend-qa`): a test
that needed this fix was a failing test all along; quarantine rules and the
fix-or-delete deadline govern the interim.
