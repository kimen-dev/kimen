---
description: >-
  Negative case: a request with nothing to do with Kimen must not load either
  Kimen skill.
tags: [trigger, deterministic]
max_turns: 5
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a Python function `celsius_to_fahrenheit(celsius: float) -> float` with
a docstring and show it in your reply. Don't create any files.
