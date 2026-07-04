---
name: "kimen-gates-pre-plan"
description: "Kimen mandatory pre-plan gate: verify the Gherkin behavior contract exists and lints green before /speckit-plan is allowed to run"
compatibility: "Requires the Kimen repo layout (scripts/gates/, .specify/)"
metadata:
  author: "kimen"
  source: ".specify/extensions.yml → hooks.before_plan → kimen.gates.pre-plan"
user-invocable: true
disable-model-invocation: false
---

# Kimen gate: pre-plan (mandatory extension hook)

This skill is the mandatory `before_plan` hook registered in
`.specify/extensions.yml`. It enforces constitution Art. II (Specs Before
Code) when `/speckit-plan` is invoked directly, outside the kimen workflow
runner. It is a deterministic gate: the script decides, not you (Art. X).

## Steps

1. From the repository root, run:

   ```sh
   bash scripts/gates/pre-plan-check.sh
   ```

2. Show the script's output verbatim.

3. **If the exit code is 0**: report `GATE pre-plan: PASS` and let the calling
   command (`/speckit-plan`) proceed.

4. **If the exit code is non-zero**: **HARD STOP**. Do NOT proceed with
   planning, do NOT create or modify plan.md, and do NOT attempt to satisfy
   the gate by writing feature.feature yourself. Report the failure output to
   the user and stop. Typical remediations (for the user/spec phase, not for
   this hook): complete the spec's Gherkin section, run
   `bash scripts/gates/extract-feature.sh`, fix lint findings, fill the
   Scenario Family Coverage table.

## Never

- Never skip or soften this gate ("the spec looks fine" is self-assessment,
  forbidden by Art. III).
- Never edit `scripts/gates/*` to make it pass.
