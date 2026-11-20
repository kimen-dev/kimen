---
# A spec carries no styling: appearance belongs to the host's tokens.
type: regex
target:
  source: file
  path: spec.json
match: not_contains
---
"(?:style|class|className|css)"\s*:
