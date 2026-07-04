# CLAUDE.md

Read `AGENTS.md` first: it is the agent entry point and lists the law of the
repo. This file only adds Claude-specific notes.

- Constitution digest: `.specify/memory/constitution.md` (normative source:
  `/kimen-constitution.md`, v1.4.2). If the version stamps differ, the digest
  is stale: stop and regenerate it before any `/speckit-*` command.
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
  (Art. XI). Never commit directly to main. Never hand-edit generated
  artifacts.
