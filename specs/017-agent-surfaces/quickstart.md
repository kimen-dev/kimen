# Quickstart validation: Agent surfaces

Runnable checks that prove the feature end to end. Done is defined by the
gate suite, not by this guide (Art. III).

## Prerequisites (once per machine)

```bash
pnpm install --frozen-lockfile
```

## Full verdict (the only "done")

```bash
bash scripts/gates/gates-suite.sh   # every gate, including the new surfaces-sync, exits 0
```

Gates that specifically prove this feature: `traceability` (S1–S6 ↔
`packages/elements/scripts/agent-surfaces.spec.ts`), `build` (regenerates
docs.json normalized + custom-elements.json + both llms.txt), the new
`surfaces-sync` (committed surfaces byte-match the regeneration), `test`
(the node vitest project), plus format/lint/typecheck/deadcode staying green
over the new scripts.

## Focused runs while iterating

```bash
# Regenerate the surfaces and inspect what changed
pnpm exec nx run @kimen/elements:build
git diff --stat -- packages/elements/generated packages/elements/llms.txt llms.txt

# Generator tests only
pnpm --filter @kimen/elements exec vitest run --config vitest.node.config.ts

# Scenario spot-check
bash scripts/gates/check-traceability.sh specs/017-agent-surfaces
```

## Manual validation scenarios

1. **Manifest completeness (S1)** — open
   `packages/elements/generated/custom-elements.json`: the `ki-button`
   class declaration carries `tagName`, 7 attributes/members with types and
   defaults, 3 slots, 2 cssParts, and `whenToUse`/`whenNotToUse` fields.
   No `timestamp` key; no `/Users/` or other absolute path anywhere
   (`grep -c '"/' generated/custom-elements.json` finds none).
2. **Summary shape (S2)** — open `llms.txt` (root): H1 with the library
   name, blockquote description, an installation instruction, `## Components`
   with one `### ki-button` entry carrying both guidance lines.
   `cmp llms.txt packages/elements/llms.txt` exits 0 (byte-identical copies).
3. **Guidance verbatim (S3)** — copy the `@whenToUse` text from
   `ki-button.tsx`; `grep -F` it in BOTH `generated/custom-elements.json`
   and `llms.txt` — both must match exactly.
4. **Completeness enforcement (S4)** — temporarily delete the JSDoc block
   above `variant` in `ki-button.tsx`; run
   `pnpm exec nx run @kimen/elements:build --skip-nx-cache`: the build must
   FAIL naming `ki-button.variant`. Restore the JSDoc; while at it, delete
   only the `@whenNotToUse` tag: the build must fail naming the tag. Restore.
5. **Sync gate (S5)** — hand-edit one character in
   `packages/elements/generated/custom-elements.json`, commit nothing, run
   `bash scripts/gates/gates-suite.sh`: the `surfaces-sync` gate must FAIL
   with a diff pointing at the file (the build regenerates the honest
   content over the edit; the diff against HEAD exposes any committed
   staleness the same way). `git checkout -- packages/elements/generated`
   to clean up.
6. **Path independence (S6)** — copy the checkout elsewhere and regenerate:

   ```bash
   ORIGIN=$(pwd)
   cp -R . /tmp/kimen-elsewhere && cd /tmp/kimen-elsewhere
   pnpm install --frozen-lockfile --offline
   pnpm exec nx run @kimen/elements:build --skip-nx-cache
   cmp packages/elements/generated/custom-elements.json "$ORIGIN"/packages/elements/generated/custom-elements.json
   cmp packages/elements/generated/docs.json           "$ORIGIN"/packages/elements/generated/docs.json
   cmp llms.txt                                        "$ORIGIN"/llms.txt
   ```

   All three `cmp` calls exit 0 (byte-identical). CI re-proves this on
   every PR: its checkout path never matches a developer's.
7. **Generator inheritance (SC-004 / FR-007)** — scaffold a scratch
   component (`pnpm exec nx g @kimen/nx-plugin:component ki-scratch`),
   build: `ki-scratch` appears in both surfaces with its TODO(spec)
   guidance, with zero wiring. Delete the scratch component afterwards and
   rebuild (never commit it).
8. **Agent smoke (SC-001, scheduled eval — never merge-blocking)** — give
   an agent ONLY `llms.txt` + `generated/custom-elements.json` and ask it to
   compose a form using `ki-button`; check every tag/attribute/slot it
   produced exists in the manifest.

## Expected outcomes

- `gates-suite.sh` → `ALL GATES GREEN — done is done (Art. III)`.
- `git status` clean after any fresh build, from any checkout path.
- Stripping any public-member JSDoc or guidance tag → build failure naming
  the member (never a warning).
- The 003–016 tasks inherit a T019 line that names artifacts this pipeline
  actually produces (FR-009).
