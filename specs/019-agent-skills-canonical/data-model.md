# Data model: Canonical agent skills

## CanonicalSkillCatalog

Represents the sole versioned owner of repository skill content.

| Field | Rule |
|---|---|
| path | Exactly `.agents/skills` |
| type | Real in-repository directory, not a symlink |
| skills | 27 initial `Skill` directories |
| trackedArtifacts | Every nested artifact intended to ship with a skill |
| ignoredArtifacts | Empty; canonical artifacts must remain visible to Git |

Validation states: `valid`, `missing`, `wrong-type`, `ignored-content`,
`untracked-content`, `invalid-skill-entry`.

## Skill

One named directory immediately below the canonical catalog.

| Field | Rule |
|---|---|
| name | Stable directory name, unique within the catalog |
| entrypoint | Required regular file `SKILL.md` |
| artifacts | Optional helpers, references, assets, templates and notices |
| provenance | License/provenance files retained when supplied upstream |

## CompatibilityView

Claude-compatible discovery without content ownership.

| Field | Rule |
|---|---|
| path | Exactly `.claude/skills` |
| filesystemType | Symbolic link |
| storedTarget | Exactly `../.agents/skills` |
| resolvedTarget | Exactly the canonical catalog inside repository root |
| contentOwner | `CanonicalSkillCatalog` only |

Validation states: `valid`, `missing`, `not-symlink`, `broken`, `absolute`,
`escaping`, `cyclic`, `wrong-target`.

## SkillArtifact

Any file or nested directory below a skill.

| Field | Rule |
|---|---|
| relativePath | Unique canonical path below `.agents/skills/<skill>/` |
| bytes | Preserved from the approved migration source |
| tracked | Required for repository-owned content |
| licenseClass | Project, MIT, Apache-2.0, CC-BY-SA-4.0 or recorded upstream class |

## MigrationInventory

Auditable mapping from the two pre-migration catalogs to the canonical result.

| Field | Rule |
|---|---|
| skillNames | Exactly the union of pre-migration skill names |
| sourcePaths | Every pre-migration artifact accounted for |
| conflicts | Eight initial byte-conflict records |
| validatedSource | Immutable Git commit plus complete path/tree digest |
| candidateCapture | Validated source with every conflict `candidateHash` applied |
| migratedSource | Validated source with every conflict/rewrite `finalHash` applied |
| derivation | Exactly `validated-source-plus-declared-final-hashes` |
| resolution | `main-validated`, `identical`, `unique-preserved`, or explicit founder exception |
| omissions | Empty unless separately founder-approved |

## ValidationFinding

Stable failure emitted by pure validation and rendered by the gate CLI.

| Field | Rule |
|---|---|
| code | Stable code from the topology contract |
| path | Repository-relative offending path |

The CLI renders each finding with the code and a sanitized path, then derives
the invariant and exact expected canonical/compatibility topology from its
closed diagnostic catalog. Findings intentionally contain no raw observed
filesystem values or free-form remediation text, keeping output bounded and
preventing host-path or credential disclosure.

Findings sort deterministically by path then code. Any finding makes the gate
red; zero findings makes it green.

## Relationships

```text
CanonicalSkillCatalog 1 ── owns ── * Skill
Skill                 1 ── owns ── * SkillArtifact
CompatibilityView    1 ── resolves to ── 1 CanonicalSkillCatalog
MigrationInventory   1 ── accounts for ── * SkillArtifact
ValidationFinding    * ── refers to ── 1 repository path/invariant
```

## State transitions

```text
two catalogs inventoried
  → conflicts resolved from validated main
  → canonical catalog versioned
  → compatibility directory removed
  → exact relative symlink created
  → guidance and tests updated
  → deterministic validation green
  → full gates green
```

Any unaccounted artifact, unsafe link or independent compatibility directory
transitions validation to red and blocks merge.
