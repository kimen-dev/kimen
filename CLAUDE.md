# CLAUDE.md

Read `AGENTS.md` first: it is the agent entry point and lists the law of the
repo. This file only adds Claude-specific notes.

- Governance: the constitution digest at `.specify/memory/constitution.md`
  (v2.0.0) is the operative text for every agent working in this repo. The
  normative master is maintained by the founder outside the repository; on
  founder machines a copy may exist under `internal/` (gitignored) and
  `scripts/gates/constitution-check.sh` verifies the stamps match.
- Spec Kit runs in skills mode: invoke commands as `/speckit-specify`,
  `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, etc. Templates
  resolve through `.specify/templates/overrides/`. Use the full Spec Kit path
  only when Article II or genuine complexity justifies it.
- Repository skills live canonically in `.agents/skills/`; `.claude/skills`
  is Claude's compatibility view of the same catalog. Use
  `gherkin-use-cases` for required behavior contracts,
  `frontend-best-practices` for component code, and `frontend-qa` for tests.
- Founder intent and merge are human judgments. They are never represented by
  repository hashes or generated approval markers.
- Never run with permission bypass outside a credential-free sandbox
  (Art. XI; see `sandbox/`). Never commit directly to main. Never hand-edit
  generated artifacts.
