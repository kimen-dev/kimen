# AGENTS.md

<!-- Constitution stamp: v2.0.0. Bootstrap file, maintained by hand until the
     Art. I generation pipeline exists (Fase 2); then it becomes a generated
     artifact like every other agent surface. -->

## What this is

Kimen is an open-source, AI-First generative UI library: StencilJS web
components (`ki-` prefix), a neutral schema-constrained catalog, and disposable
protocol adapters (A2UI, MCP Apps, AG-UI, json-render). One-person, AI-First
operation: agents implement, deterministic gates verify, and a single founder
merges.

## Law of the repo

1. **The constitution digest governs everything.** Read
   `.specify/memory/constitution.md` before working: it is the operative
   governance text of this repository (11 articles, workflow, human gates).
   On conflict, escalate to the founder.
2. **Use specs proportionately** (Art. II). A concise Gherkin contract is
   required for public component behavior/API, new interaction patterns and
   guardrail/security boundaries. Bug fixes need a failing regression test.
   Internal refactors, tooling, dependencies and docs do not need Spec Kit.
   Plans/checklists/tasks are optional tools for genuinely complex changes.
3. **One fast quality result defines ordinary PR readiness** (Art. III/X).
   Run `bash scripts/gates/gates-suite.sh`. Mutation runs once daily, packaging
   and three-browser verification run at release, and path-specific controls
   run only when their surface changes.
4. **Never hand-edit generated artifacts** (Art. I): manifests, catalog,
   llms.txt, wrappers and this file (once generated) are regenerated, not
   patched. `@kimen/elements` build normalizes `generated/docs.json`, emits
   `generated/custom-elements.json` plus package/root `llms.txt`, and the
   `surfaces-sync` gate verifies they match source.
5. **Tokens only** (Art. VI): no hardcoded visual values, CSS logical
   properties only, no hardcoded user-visible strings.
6. **Containment** (Art. XI): unattended loops run sandboxed (`sandbox/`),
   least-privilege, no publishing credentials, no permission-bypass outside
   credential-free sandboxes.

## Repo map

- `/.specify/`: Spec Kit (constitution digest, templates + Kimen overrides,
  scripts, workflows)
- `/.agents/skills/`: canonical Spec Kit and constitutional skills
  (`gherkin-use-cases`, `frontend-best-practices`, `frontend-qa`);
  `/.claude/skills` is Claude's compatibility symlink
- `/specs/`: feature specs (created by `/speckit-specify`)
- `/tools/kimen-plugin/`: Nx generators (`component`, `feature-spec`,
  `adapter`): `pnpm exec nx g @kimen/nx-plugin:component ki-x --spec NNN-ki-x`
- `/sandbox/`: Art. XI unattended-loop sandbox (credential-free, egress
  allowlist); see `sandbox/README.md`
- `/scripts/gates/`: the deterministic gate suite (Art. X)
- `packages/`: `tokens`, `elements`, `catalog`, `kimen` (placeholder),
  `adapter-*` (future)
- `/docs/`: public documentation (`roadmap.md`)

## Conventions

- Components: `<ki-name>` tags, scaffolded via Nx generators, never by hand.
- Clean-context review is optional, advisory and one-pass for high-risk or
  unfamiliar changes; it never creates a required Check Run.
- Commits: conventional commits; external contributions carry DCO sign-off.
- Status: pre-v1, factory phase. See `/docs/roadmap.md`.
