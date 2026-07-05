# CLAUDE.md

Read `AGENTS.md` first: it is the agent entry point and lists the law of the
repo. This file only adds Claude-specific notes.

- Governance: the constitution digest at `.specify/memory/constitution.md`
  (v1.4.2) is the operative text for every agent working in this repo. The
  normative master is maintained by the founder outside the repository; on
  founder machines a copy may exist under `internal/` (gitignored) and
  `scripts/gates/constitution-check.sh` verifies the stamps match.
- Spec Kit runs in skills mode: invoke commands as `/speckit-specify`,
  `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, etc. Templates
  resolve through `.specify/templates/overrides/` (Kimen versions with
  mandatory Gherkin section and RED→GREEN→gates task structure).
- Constitutional skills live in `.claude/skills/`: use `gherkin-use-cases`
  when writing `.feature` files, `frontend-best-practices` when writing or
  reviewing component code, `frontend-qa` when writing tests or CI gates.
- Two human gates only: spec/Gherkin approval and merge. Do not idle waiting
  on them; batch questions for the founder.
- Never run with permission bypass outside a credential-free sandbox
  (Art. XI; see `sandbox/`). Never commit directly to main. Never hand-edit
  generated artifacts.
