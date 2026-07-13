---
name: "kimen-gates-pre-plan"
description: "Validate a synchronized, lint-green Kimen behavior contract before optional /speckit-plan"
compatibility: "Requires the Kimen repo layout (scripts/gates/, .specify/)"
metadata:
  author: "kimen"
  source: ".specify/extensions.yml → hooks.before_plan → kimen.gates.pre-plan"
user-invocable: true
disable-model-invocation: false
---

# Kimen gate: pre-plan

Use this hook only after Article II has justified a behavior contract and the
team has chosen the optional planning path. It checks that `spec.md` and
`feature.feature` are synchronized and lint green. Founder approval remains a
human judgment in the working conversation or PR; no hash marker is created.

Run from the repository root:

```sh
bash scripts/gates/pre-plan-check.sh
```

If it exits 0, report `GATE pre-plan: PASS` and continue. If it fails, show the
output and correct the contract before planning. Never edit a gate to hide
contract drift.
