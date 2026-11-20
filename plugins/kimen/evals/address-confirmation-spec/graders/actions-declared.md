---
# Both actions are listed in the top-level "actions" array.
type: regex
target:
  source: file
  path: spec.json
---
"actions"\s*:\s*\[(?=[^\]]*"use-address")(?=[^\]]*"edit-address")[^\]]*\]
