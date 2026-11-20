---
description: >-
  kimen-genui: the agent writes a UI spec with catalog components only,
  attribute-name props, declared and bound actions, and no markup or styling.
  Mirrors the validator's main rules without needing the kimen-mcp server.
tags: [kimen-genui, deterministic]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, WebFetch]
---

Our support agent should show the customer a card to confirm their shipping
address before an order ships: the address (Ana García, Calle Mayor 1, 28013
Madrid, Spain), a primary "Use this address" button and a secondary "Edit"
button. The buttons raise the actions `use-address` and `edit-address`. We
render agent output with Kimen's generative UI layer. Write the UI spec the
agent should emit to `spec.json`. Only write that one file.
