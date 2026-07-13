---
name: "kimen-gates-pre-implement"
description: "Validate a selected Kimen behavior contract and constitution sync before /speckit-implement"
compatibility: "Requires the Kimen repo layout (scripts/gates/, .specify/)"
metadata:
  author: "kimen"
  source: ".specify/extensions.yml → hooks.before_implement → kimen.gates.pre-implement"
user-invocable: true
disable-model-invocation: false
---

# Kimen gate: pre-implement

When Article II requires a behavior contract, this hook verifies the
synchronized lint-green contract and the constitution version before the
optional Spec Kit implementation command. It does not encode founder judgment
as a file or hash.

Run from the repository root:

```sh
bash scripts/gates/pre-implement-check.sh
```

If it exits 0, report `GATE pre-implement: PASS` and continue. If it fails,
show the output and fix the concrete drift. Never fabricate approval artifacts
or edit a gate simply to make it pass.
