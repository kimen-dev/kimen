# Agent skill topology contract v1

## Canonical paths

```text
.agents/skills/                     real versioned directory
.agents/skills/<skill>/SKILL.md     required skill entrypoint
.claude/skills                      Git symlink
```

The bytes stored for `.claude/skills` in Git are exactly:

```text
../.agents/skills
```

No trailing slash, absolute target, alternative relative spelling, directory
copy or generated mirror is equivalent.

## Required observations

1. `.agents/skills` exists, is a real directory and resolves inside the
   repository.
2. Every immediate skill directory has a regular `SKILL.md` entrypoint.
3. Canonical artifacts are visible to Git and no canonical path is ignored.
4. `.claude/skills` is stored by Git as a symbolic-link entry and is a symlink
   in the working tree.
5. Its stored target is exactly `../.agents/skills`.
6. Its resolved target is exactly the canonical directory.
7. Generic and Claude discovery enumerate the same 27 initial skills.
8. Repository-owned guidance names `.agents/skills` canonical and
   `.claude/skills` compatibility-only.

## Stable finding codes

| Code | Meaning |
|---|---|
| `AGENT_SKILLS_CANONICAL_MISSING` | `.agents/skills` does not exist. |
| `AGENT_SKILLS_CANONICAL_TYPE` | Canonical path is not a real directory. |
| `AGENT_SKILLS_ENTRY_MISSING` | A skill has no regular `SKILL.md`. |
| `AGENT_SKILLS_IGNORED` | A canonical artifact is ignored by Git. |
| `AGENT_SKILLS_UNTRACKED` | Required canonical content is not versioned. |
| `AGENT_SKILLS_COMPAT_MISSING` | `.claude/skills` is absent. |
| `AGENT_SKILLS_COMPAT_NOT_LINK` | Compatibility path is an independent directory/file. |
| `AGENT_SKILLS_COMPAT_ABSOLUTE` | Stored link target is absolute. |
| `AGENT_SKILLS_COMPAT_BROKEN` | Link target cannot be resolved. |
| `AGENT_SKILLS_COMPAT_ESCAPE` | Resolved target leaves the repository. |
| `AGENT_SKILLS_COMPAT_CYCLE` | Resolution encounters a link cycle. |
| `AGENT_SKILLS_COMPAT_TARGET` | Stored/resolved target is not the exact canonical target. |
| `AGENT_SKILLS_GIT_MODE` | Git does not store compatibility as mode `120000`. |
| `AGENT_SKILLS_GUIDANCE_DRIFT` | Repository guidance assigns the wrong ownership role. |
| `AGENT_SKILLS_MIGRATION_OMISSION` | A required pre-migration artifact is absent from the union. |
| `AGENT_SKILLS_MIGRATION_CONFLICT` | A byte conflict lacks explicit founder-approved resolution. |

The CLI prints findings sorted by path then code and exits non-zero when at
least one finding exists. It prints the canonical and compatibility paths plus
skill/artifact counts and exits zero only when all observations pass.

## Security properties

- Fact collection never follows a target outside the repository for content
  enumeration.
- Error output contains repository-relative paths, never credential or
  user-home contents.
- No network, credential or package-manager access is required.
- A byte-identical directory copy still fails `AGENT_SKILLS_COMPAT_NOT_LINK`.
