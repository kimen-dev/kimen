---
# Strings are text: no HTML inside them.
type: regex
target:
  source: file
  path: spec.json
match: not_contains
---
"[^"\n]*</?[a-zA-Z][^"\n]*"
