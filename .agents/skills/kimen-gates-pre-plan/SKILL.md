---
name: "kimen-gates-pre-plan"
description: "Kimen mandatory pre-plan gate: verify a synchronized lint-green contract pair and current dual-hash founder approval before /speckit-plan"
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
Code) and HUMAN GATE 1 when `/speckit-plan` is invoked directly, outside the
kimen workflow runner. It requires byte-identical spec/feature behavior,
lint-green Gherkin and marker v2 matching both SHA-256 hashes. It is a
deterministic gate: the script decides, not you (Art. X).

## Steps

1. From the repository root, run:

   ```sh
   bash scripts/gates/pre-plan-check.sh
   ```

2. Show the script's output verbatim.

3. **If the exit code is 0**: report `GATE pre-plan: PASS` and let the calling
   command (`/speckit-plan`) proceed.

4. **If the exit code is non-zero**: **HARD STOP**. Do NOT proceed with
   planning and do NOT create or modify plan.md. Report the failure output to
   the user and stop. Contract drift is corrected in the spec phase by
   deterministic extraction; stale approval requires explicit founder
   reapproval and `record-approval.sh`, never an agent-authored marker.

## Never

- Never skip or soften this gate ("the spec looks fine" is self-assessment,
  forbidden by Art. III).
- Never edit `scripts/gates/*` to make it pass.
- Never create, migrate or refresh `.approved` to unblock planning; only the
  founder's explicit approval authorizes `record-approval.sh`.
