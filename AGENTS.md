# AGENTS.md

<!-- Constitution stamp: v1.4.2. Bootstrap file, maintained by hand until the
     Art. I generation pipeline exists (Fase 2); then it becomes a generated
     artifact like every other agent surface. -->

## What this is

Kimen is an open-source, AI-First generative UI library: StencilJS web
components (`ki-` prefix), a neutral schema-constrained catalog, and disposable
protocol adapters (A2UI, MCP Apps, AG-UI, json-render). One-person, AI-First
operation: agents implement, deterministic gates verify, a single founder
approves specs and merges.

## Law of the repo

1. **`/kimen-constitution.md` governs everything.** Read the operational digest
   at `.specify/memory/constitution.md` before working. On conflict, the root
   constitution wins and the conflict is escalated to the founder.
2. **No behavior without an approved spec** (Art. II). All work flows through
   Spec Kit: `/speckit-specify` → `/speckit-clarify` → Gherkin approval (human)
   → `/speckit-plan` → `/speckit-checklist` → `/speckit-tasks` →
   `/speckit-analyze` → `/speckit-implement` → `/speckit-converge` → review →
   merge (human). Templates are resolved via `.specify/templates/overrides/`.
3. **"Done" means gates exit 0** (Art. III/X). Never self-assessed. Tests
   first, verified failing. Coverage is a diagnostic; mutation score is the
   gate.
4. **Never hand-edit generated artifacts** (Art. I): manifests, catalog,
   llms.txt, wrappers and this file (once generated) are regenerated, not
   patched.
5. **Tokens only** (Art. VI): no hardcoded visual values, CSS logical
   properties only, no hardcoded user-visible strings.
6. **Containment** (Art. XI): unattended loops run sandboxed, least-privilege,
   no publishing credentials, no permission-bypass outside credential-free
   sandboxes.

## Repo map

- `/kimen-constitution.md`: normative governance (v1.4.2)
- `/docs/`: product strategy, build roadmap, Spec Kit harness design, and
  `kimen-onmars-spec.md` (the binding unattended-loop contract)
- `/.specify/`: Spec Kit (memory digest, templates + Kimen overrides, scripts, workflows)
- `/.claude/skills/`: Spec Kit skills + constitutional skills
  (`gherkin-use-cases`, `frontend-best-practices`, `frontend-qa`)
- `/specs/`: feature specs (created by `/speckit-specify`)
- `/tools/kimen-plugin/`: Nx generators (`component`, `feature-spec`,
  `adapter`): `pnpm exec nx g @kimen/nx-plugin:component ki-x --spec NNN-ki-x`
- `/sandbox/`: Art. XI unattended-loop sandbox (credential-free, egress
  allowlist); see `docs/kimen-sandbox.md`
- `packages/`: (Fase 0 pending) `tokens`, `elements`, `catalog`, `adapter-*`

## Conventions

- Components: `<ki-name>` tags, scaffolded via Nx generators, never by hand.
- Commits: conventional commits; external contributions carry DCO sign-off.
- Status: pre-v1, Fase 0 (factory setup). See `/docs/kimen-roadmap.md`.
