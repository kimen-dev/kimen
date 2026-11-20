---
description: >-
  kimen-components: theming. The agent forces the colour scheme the Kimen way
  and lets the tokens paint the page, with no hard-coded colours or
  !important.
tags: [kimen-components, deterministic]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, WebFetch]
---

My Vite app uses Kimen components and `@kimen/tokens`. Write `index.html`
for a small settings page whose header has a control that switches the whole
page between light and dark, overriding the OS preference. The page background
and text colour must follow the theme too. Put the setup code in an inline
module script in the same file. Only write that one file.
