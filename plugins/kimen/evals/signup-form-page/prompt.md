---
description: >-
  kimen-components: an ordinary sign-up page. The agent reads the published
  contracts and writes only real ki-* tags and attributes, loads the tokens
  and registers the components.
tags: [kimen-components, deterministic]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, WebFetch]
---

My Vite app already has `@kimen/elements` and `@kimen/tokens` installed.
Write `index.html` for a sign-up page: a form with full name, email and
password fields, a country picker (Spain, France, Portugal), a checkbox to
accept the terms, and a "Create account" submit button. Use Kimen components
for the controls and put the setup code in an inline module script in the same
file. Only write that one file.
