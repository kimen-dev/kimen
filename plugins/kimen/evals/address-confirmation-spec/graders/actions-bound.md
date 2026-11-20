---
# Each action is bound to a control with "action".
type: regex
target:
  source: file
  path: spec.json
---
^(?=[\s\S]*"action"\s*:\s*"use-address")(?=[\s\S]*"action"\s*:\s*"edit-address")
