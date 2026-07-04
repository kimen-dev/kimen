# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `supply-chain-risk-auditor`
- **Source**: https://github.com/trailofbits/skills — path `plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/`
- **Pinned commit**: `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` (branch `main`, last upstream commit 2026-06-30; fetched 2026-07-05)
- **Upstream author**: Trail of Bits — skill author credited upstream as Spencer Michaels
- **License**: CC-BY-SA-4.0 — Creative Commons Attribution-ShareAlike 4.0 International
  (https://creativecommons.org/licenses/by-sa/4.0/)

## Attribution (CC-BY)

Made by Trail of Bits and redistributed here with modifications. Upstream:
"Trail of Bits Skills" (https://github.com/trailofbits/skills), © Trail of Bits,
licensed under CC-BY-SA-4.0.

## Share-alike note (CC-SA)

The contents of this directory (`SKILL.md`, `results-template.md`), **including
the local modifications listed below**, remain licensed under **CC-BY-SA-4.0**,
independently of the Apache-2.0 license covering the rest of the Kimen repo.
Any further redistribution or adaptation must also be CC-BY-SA-4.0 with
attribution to Trail of Bits.

## Supply-chain audit (Kimen constitution Art. X)

Reviewed in full on 2026-07-05 before vendoring. Markdown-only methodology for
scoring dependency risk. Uses read-only `gh` queries only (stars, issues,
release dates); the skill explicitly does NOT scan source for CVEs/credentials.
No remote code fetch/execution, no telemetry, no destructive commands, no hidden
instructions detected. It writes a local `.supply-chain-risk-auditor/results.md`
report — benign, within the working directory.

## Local modifications

- Added a "Kimen note (local adaptation)" blockquote after the title tying the
  skill to the constitution supply-chain gate (Art. X) and the sandbox rule
  (Art. XI).
- **`results-template.md` is a reconstruction**, not the upstream file. The
  upstream `SKILL.md` references a `results-template.md` in the skill dir but
  that file returned 404 from raw.githubusercontent at the pinned commit on
  every attempted path. The reconstruction reproduces exactly the four sections
  the SKILL.md enumerates (Executive Summary, High-Risk Dependencies table with
  Suggested Alternative, Counts by Risk Factor table, Recommendations). If the
  upstream template is later obtained, replace this file with the original.

## Omitted from upstream (intentionally)

- Plugin packaging (`.claude-plugin/`, plugin.json, plugin README.md) and the
  Codex sidecar tree. Only the skill markdown is vendored.
