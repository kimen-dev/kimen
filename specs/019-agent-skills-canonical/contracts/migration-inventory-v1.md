# Migration inventory v1

## Catalog summary

- Pre-migration canonical candidate: local `.agents/skills`
- Validated committed source: `main:.claude/skills`
- Migrated source evidence: reachable Git tree object for `.agents/skills`
- Skill directory union: 27
- Skill names unique to either catalog: 0
- Validated source artifacts: 70 files, preserved once under `.agents/skills`
- Conflicting artifacts: 8, resolved from validated `main`
- Approved omissions: 0

## Conflict resolutions

SHA-256 values prove which pre-migration bytes won. A different final hash is
expected only where T029 subsequently rewrote an obsolete canonical path.

| Canonical relative path | Candidate SHA-256 | Validated seed SHA-256 | Final SHA-256 |
|---|---|---|---|
| `agentic-actions-auditor/SKILL.md` | `1c4f5bdfa50b9633adcfb5ab78d5c8b9dd31173f92d653da85c82dca99d0f74e` | `d7bb81eb9c3739eb49b991193375ae0b4a8115cc5eae6074671118b5bc04de1a` | `d7bb81eb9c3739eb49b991193375ae0b4a8115cc5eae6074671118b5bc04de1a` |
| `create-mcp-app/SKILL.md` | `09a7ee170f24898a6562212a528588e7a73e731cc5cb07cf9a883d03dd532b1a` | `0fbf7d9189c0031774111a92a1957bfb0f75a16065beac2bb3452d33576a6807` | `0fbf7d9189c0031774111a92a1957bfb0f75a16065beac2bb3452d33576a6807` |
| `kimen-gates-pre-implement/SKILL.md` | `b77c035c4e47b936d65be4af0ba94ce89ba9d2ac7a6052a0dc4214f19db6f4a3` | `5bd0af5a863539cac1411d029879822572f1904112e7e11fff5d3861efa68b98` | `5bd0af5a863539cac1411d029879822572f1904112e7e11fff5d3861efa68b98` |
| `kimen-gates-pre-plan/SKILL.md` | `5019932ebbee39d99fa39dca16404750ffcfcee8a8eecf87ec9d1afe30faed24` | `57277266376c456b75d705251dcf36ee0a0764f6675bfc77b8e226d163c0f8a0` | `57277266376c456b75d705251dcf36ee0a0764f6675bfc77b8e226d163c0f8a0` |
| `requesting-code-review/SKILL.md` | `2cd6a54af30811d26fc27f9c1da70e5908dd5fae6935977db4911ed7816a5d0d` | `871e6a7bce800cbd1570673dfc271cbf4ac31f9a774e0753a45aa9c20b1ed25c` | `a92c35679948c130f9dc1ca75bfabd6f1ea1b2a546a3c6afab22ac2a563b0de8` |
| `requesting-code-review/scripts/review-package.sh` | `1f60f39b1b0cb463a3c3118da6eb025d17d48046cf01ca96cc53cfa05b453819` | `719f1004023d56c34e007f88debfce6602be9bd494b7490b7744fd2421ee47cb` | `1f1e2bf918a1dd41e3bc15cd82ab95d87cb97db4f9ae8c57c3c5a4a7702bea98` |
| `speckit-constitution/SKILL.md` | `b23911c848ec179f292140295cb52c7cfcde77fb3c107d0fe79dacfbf6275a22` | `ee3972318415a05559c6bf281dcbd2e8deda944e595d64ab5474abeacf558697` | `ee3972318415a05559c6bf281dcbd2e8deda944e595d64ab5474abeacf558697` |
| `systematic-debugging/SKILL.md` | `13fca57aa65a6f4dac76e0a4e11a2e1e5fd30e2141da06c083907ec900e20070` | `d5356e13d140f442d361860e5184bdfc8c27296a2c6e7da0d093ac28ca4a89f4` | `d5356e13d140f442d361860e5184bdfc8c27296a2c6e7da0d093ac28ca4a89f4` |

## Required preserved classes

- Every `SKILL.md` entrypoint.
- Every nested `scripts/`, `references/`, `reference/`, `examples/`, `assets/`
  or template resource.
- Every `LICENSE-NOTICE.md`, provenance header and root `NOTICE` attribution.
- Kimen-specific adaptations already committed on `main`.

## Verification

The machine-readable companion
`contracts/migration-inventory-v1.json` (SHA-256
`2b837f0ee55868a98f7b4e01a21aab30bb05b3a67fe4da8570285a0afb906bcb`)
binds the common 70-path source set, the eight approved conflict hashes and the
one declared post-migration rewrite. The `agent-skills` gate reads the actual
Git tree at validated source commit
`d4bd216090e3eb6515a59bee8db29760328108e6` and migrated subtree object
`dab40a007b09d898b61120e8f9fb9fc7191cbb7d`, proves that the latter remains
reachable from `HEAD` at `.agents/skills`, recomputes both path-set/tree digests
and verifies each declared validated and final conflict/rewrite hash. Missing
history, reachability, count, path or byte drift fails closed. Pinning the
migrated subtree rather than its branch commit preserves this evidence after
the repository's required squash merge.

The candidate tree digest is explicitly a founder-approved local
pre-migration capture because those bytes were never committed; the gate does
not misrepresent that capture as Git-reconstructable. Historical verification
is deliberately independent of the live canonical tree, so later one-edit
skill additions or updates remain compatible with SC-005.

Implementation evidence must enumerate both pre-migration trees, prove the
same 27 skill names, report exactly these eight conflicts, and show zero
unaccounted paths after migration. Any additional conflict or omission requires
founder review before implementation continues.

Final evidence: 27 skill directories, 70 regular artifacts, eight approved
conflicts, zero unique skill names, zero omissions, exact symlink target
`../.agents/skills`, and Git mode `120000`.
