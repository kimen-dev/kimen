---
# Props are keyed by attribute name (line-numbers), never camelCase.
type: regex
target:
  source: file
  path: spec.json
match: not_contains
---
"props"\s*:\s*\{[^{}]*"[a-z]+[A-Z][A-Za-z0-9]*"\s*:
