<!--
Vendored from Superpowers (https://github.com/obra/superpowers)
Source: skills/systematic-debugging/defense-in-depth.md @ release v5.1.0
(commit f2cbfbefebbfef77321e4c9abc9e949826bea9d7)
Copyright (c) 2025 Jesse Vincent (Prime Radiant) - MIT License
Adapted for Kimen: unchanged except this header and a closing note tying the
pattern to the guardrail boundary (Art. VIII) and the incident-to-gate rule.
See /NOTICE for full third-party attribution.
-->

# Defense-in-Depth Validation

## Overview

When you fix a bug caused by invalid data, adding validation at one place
feels sufficient. But that single check can be bypassed by different code
paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug
structurally impossible.

## Why Multiple Layers

Single validation: "We fixed the bug"
Multiple layers: "We made the bug impossible"

Different layers catch different cases:
- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

## The Four Layers

### Layer 1: Entry Point Validation
**Purpose:** Reject obviously invalid input at the API boundary

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2: Business Logic Validation
**Purpose:** Ensure data makes sense for this operation

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### Layer 3: Environment Guards
**Purpose:** Prevent dangerous operations in specific contexts

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### Layer 4: Debug Instrumentation
**Purpose:** Capture context for forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## Applying the Pattern

When you find a bug:

1. **Trace the data flow** — Where does the bad value originate? Where used?
2. **Map all checkpoints** — List every point the data passes through
3. **Add validation at each layer** — Entry, business, environment, debug
4. **Test each layer** — Try to bypass layer 1, verify layer 2 catches it

## Example from an Upstream Session

Bug: Empty `projectDir` caused `git init` in source code

**Data flow:**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` runs in `process.cwd()`

**Four layers added:**
- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** All 1847 tests passed, bug impossible to reproduce

## Key Insight

All four layers were necessary. During testing, each layer caught bugs the
others missed:
- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Edge cases on different platforms needed environment guards
- Debug logging identified structural misuse

**Don't stop at one validation point.** Add checks at every layer.

## Kimen Note

This pattern is constitutional at the guardrail boundary (Art. VIII): specs
render only catalog components, only declared actions dispatch, unknown props
are rejected — each of those is a layer, and each layer is tested as a
security boundary. And when a defect escaped the gates, the incident procedure
requires at least one new deterministic gate or test that would have caught it
(Emergency and Incident Procedure): defense-in-depth layers you add after a
root-cause fix are exactly that receipt.
