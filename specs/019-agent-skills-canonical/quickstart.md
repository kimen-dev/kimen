# Quickstart: Validate canonical agent skills

## Prerequisites

- Fresh or clean Git checkout with symbolic links enabled.
- Repository Node and pnpm versions installed.
- No user-level skill directory is required.

## 1. Verify the topology gate

```sh
node scripts/gates/check-agent-skills.mjs
```

Expected: exit 0, 27 skills reported, canonical path `.agents/skills`,
compatibility path `.claude/skills`, zero findings.

## 2. Verify the stored link

```sh
readlink .claude/skills
git ls-files --stage .claude/skills
```

Expected: target `../.agents/skills`; Git mode `120000`.

## 3. Verify scenario tests and traceability

```sh
node --test scripts/tests/agent-skills.test.mjs
bash scripts/gates/check-traceability.sh specs/019-agent-skills-canonical
```

Expected: all S1–S9 tests pass and traceability reports every scenario.

## 4. Verify mutation quality

```sh
pnpm run test:mutation
```

Expected: changed node core logic includes the agent-skill validator and meets
the repository mutation threshold of 70%.

## 5. Exercise negative fixtures

The scenario test suite must cover:

- independent `.claude/skills` directory, including byte-identical content;
- missing, broken, absolute, escaping, cyclic and wrong-target links;
- missing canonical catalog and missing `SKILL.md`;
- ignored or untracked canonical content;
- stale ownership guidance;
- a tool write through `.claude/skills` landing in `.agents/skills`.

Every fixture must exit non-zero with its stable contract code. No fixture may
read outside its temporary repository.

## 6. Run full definition of done

```sh
bash scripts/gates/gates-suite.sh
```

Expected: exit 0. This is the only completion signal.

## Implementation evidence (2026-07-12)

- RED before implementation: `node --test scripts/tests/agent-skills.test.mjs`
  registered 16 tests and failed 16 because the validator and topology gate did
  not exist.
- Focused GREEN after implementation: 18/18 Node scenario/integration tests;
  the affected review-packet suite also remained green.
- Real topology: `canonical=.agents/skills compatibility=.claude/skills
  target=../.agents/skills skills=27 artifacts=70`; Git stores the compatibility
  entry as mode `120000`.
- Traceability: nine scenarios, unique S-IDs, exactly one `When` each, and every
  S1–S9 ID referenced by its own feature tests.
- Mutation: pure logic scored `91.62%`; the authoritative combined CLI + logic
  scope detected 336 of 403 valid mutants for `83.37%`, threshold `70%`.
- Negative fixtures: missing entrypoint; independent directory; missing,
  broken, absolute, escaping, cyclic and wrong targets; stale guidance; and
  migration omission/conflict all fail with stable codes.
- Reference audit: remaining `.claude/skills` strings are compatibility
  declarations/tests, spec 019 contracts, approved historical spec 018 text,
  or `.specify/integrations/claude.manifest.json` compatibility metadata.
