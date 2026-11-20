---
# A node names its component under "component", never "type" or "tag".
type: regex
target:
  source: file
  path: spec.json
match: not_contains
---
"(?:type|tag)"\s*:\s*"ki-
