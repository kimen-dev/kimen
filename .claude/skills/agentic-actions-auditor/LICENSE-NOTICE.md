# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `agentic-actions-auditor`
- **Source**: https://github.com/trailofbits/skills — path `plugins/agentic-actions-auditor/skills/agentic-actions-auditor/`
- **Pinned commit**: `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` (branch `main`, last upstream commit 2026-06-30; fetched 2026-07-05)
- **Upstream author**: Trail of Bits (https://www.trailofbits.com/)
- **License**: CC-BY-SA-4.0 — Creative Commons Attribution-ShareAlike 4.0 International
  (https://creativecommons.org/licenses/by-sa/4.0/)

## Attribution (CC-BY)

This skill was made by Trail of Bits and is redistributed here with
modifications. Upstream: "Trail of Bits Skills"
(https://github.com/trailofbits/skills), © Trail of Bits, licensed under
CC-BY-SA-4.0.

## Share-alike note (CC-SA)

The contents of this directory (`SKILL.md`, `references/`), **including the
local modifications listed below**, remain licensed under **CC-BY-SA-4.0**,
independently of the Apache-2.0 license that covers the rest of the Kimen
repository. Any further redistribution or adaptation of these files must also
be under CC-BY-SA-4.0 with attribution to Trail of Bits.

## Supply-chain audit (Kimen constitution Art. X)

Reviewed in full on 2026-07-05 before vendoring (SKILL.md + all 12 reference
files). Markdown-only static-analysis methodology. Notable, and accepted:

- Remote analysis mode uses read-only `gh api` calls to fetch workflow YAML;
  the skill contains explicit "Bash Safety Rules" forbidding execution of any
  fetched content (never piped to shells/interpreters, never eval'd).
- No credential access beyond the ambient `gh` auth needed for its purpose,
  no telemetry, no destructive commands, no hidden instructions detected.
- The skill explicitly does not modify workflow files (report-only).

## Local modifications

- Replaced upstream `{baseDir}` plugin-path placeholders in all markdown links
  with plain relative `references/…` links, so the links resolve when the
  skill lives directly in `.claude/skills/` instead of a plugin install.
- No content changes otherwise.

## Omitted from upstream (intentionally)

- Plugin packaging (`.claude-plugin/`, plugin.json, plugin README.md) and the
  Codex sidecar tree. Only the skill markdown and its `references/` docs are
  vendored.
