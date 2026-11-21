---
# Each action is bound to a control with "action": by name, or as the action
# one event of a binding per event fires ({"<event>": "<action>"}).
type: regex
target:
  source: file
  path: spec.json
---
^(?=[\s\S]*"action"\s*:\s*(?:"use-address"|\{[^{}]*:\s*"use-address"))(?=[\s\S]*"action"\s*:\s*(?:"edit-address"|\{[^{}]*:\s*"edit-address"))
