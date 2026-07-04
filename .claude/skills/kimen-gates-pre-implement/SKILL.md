---
name: "kimen-gates-pre-implement"
description: "Kimen mandatory pre-implement gate: verify founder approval (human gate 1) and constitutional preconditions before /speckit-implement is allowed to run"
compatibility: "Requires the Kimen repo layout (scripts/gates/, .specify/)"
metadata:
  author: "kimen"
  source: ".specify/extensions.yml → hooks.before_implement → kimen.gates.pre-implement"
user-invocable: true
disable-model-invocation: false
---

# Kimen gate: pre-implement (mandatory extension hook)

This skill is the mandatory `before_implement` hook registered in
`.specify/extensions.yml`. It enforces HUMAN GATE 1 (founder spec approval,
constitution Workflow) outside the workflow runner: invoking
`/speckit-implement` directly must not bypass founder approval. It is a
deterministic gate: the script decides, not you (Art. X).

The gate verifies, in order: feature.feature exists and spec lint is green
(pre-plan gate), the founder approval marker `specs/<feature>/.approved`
exists AND its recorded sha256 matches the current spec.md, and the
constitution digest is in sync.

## Steps

1. From the repository root, run:

   ```sh
   bash scripts/gates/pre-implement-check.sh
   ```

2. Show the script's output verbatim.

3. **If the exit code is 0**: report `GATE pre-implement: PASS` and let the
   calling command (`/speckit-implement`) proceed.

4. **If the exit code is non-zero**: **HARD STOP**. Do NOT proceed with
   implementation and do NOT write any code, tests, or tasks progress. In
   particular, NEVER create or edit `specs/<feature>/.approved` yourself —
   only the founder approves (via the kimen workflow's record-approval step,
   or by running `bash scripts/gates/record-approval.sh` after approving).
   Report the failure output, batch a question for the founder if approval is
   what is missing, and stop.

## Never

- Never fabricate the `.approved` marker or re-run record-approval.sh to
  unblock yourself — that is forging human gate 1.
- Never skip or soften this gate; agent self-assessment never closes work
  (Art. III).
- Never edit `scripts/gates/*` to make it pass.
