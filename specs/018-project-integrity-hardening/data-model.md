# Data model: Project integrity hardening

The feature has no application database. These records are files, CI objects
or short-lived runtime values with deterministic validation rules.

## ApprovedContract

Represents one behavior contract pair.

| Field | Type | Rules |
|---|---|---|
| `featureDirectory` | repository-relative path | Exactly one `specs/NNN-name` directory |
| `specPath` | path | `<featureDirectory>/spec.md` |
| `featurePath` | path | `<featureDirectory>/feature.feature` |
| `extractedFeatureBytes` | bytes | First `gherkin` fenced block from spec, final LF normalized by extractor |
| `specSha256` | lowercase hex | SHA-256 of exact `spec.md` bytes |
| `featureSha256` | lowercase hex | SHA-256 of exact `feature.feature` bytes |
| `approvedAt` | UTC timestamp | Preserved during a safe v1→v2 marker migration |
| `approvalVersion` | integer | `2` |
| `migratedFromVersion` | integer/null | Sole optional key; exactly `1` only on safe migration |

### Invariants

- Extracted and committed feature bytes are identical.
- Both files lint green before approval can be recorded.
- The marker contains exactly one value for each required key.
- Changing either file moves `approved → stale`; only founder approval can
  return it to `approved`.

### States

```text
missing → synchronized-unapproved → approved → stale
             ^                         |
             └──── founder reapproval ─┘
```

Legacy `spec-only` approval may move directly to `approved` only through the
one-time safe migration predicate documented in the approval contract.

## RevisionEvidence

Represents evidence that may satisfy a protected-branch requirement.

| Field | Type | Rules |
|---|---|---|
| `repository` | owner/name | Must be `kimen-dev/kimen` for production use |
| `pullRequest` | positive integer | PR currently targeting main |
| `headSha` | 40-character Git SHA | Must equal the PR's current head |
| `baseSha` | 40-character Git SHA | Merge base/review packet base |
| `kind` | enum | deterministic gate, security gate, clean-context review |
| `context` | string | Exact GitHub check context |
| `integrationId` | integer | Expected trusted GitHub App |
| `status` | enum | pending, success, failure |
| `packetDigest` | SHA-256 | Required for clean-context review |
| `reportDigest` | SHA-256 | Required for clean-context review |
| `round` | integer | 1 or 2 |
| `reviewer` | identifier | Trusted review actor/model, not PR code |

### Invariants

- Evidence for SHA A never satisfies SHA B.
- A PR update creates pending review evidence for the new SHA.
- Clean-context success requires current deterministic gates and a valid report.
- Required contexts are added to the ruleset only after a real check exists.

## MutationScope

Describes the exact changed-code mutation decision.

| Field | Type | Rules |
|---|---|---|
| `baseSha` | Git SHA | Explicit CI base or deterministic local fallback |
| `candidate` | working tree / SHA | Includes committed and local changed files |
| `files` | sorted array | Every executable changed file appears exactly once |
| `classification` | enum | `core`, `excluded` |
| `runner` | enum | `node`, `elements`; required for core |
| `reason` | string | Required for exclusions |
| `scopeHash` | SHA-256 | Hash of files + policy + config + lockfile |
| `incrementalFile` | path | Contains runner and scope hash |
| `score` | number | Stryker score for this runner group |
| `decision` | enum | N/A, pass, fail |

### Invariants

- Unclassified executable code fails before Stryker starts.
- Each nonempty runner group independently requires score ≥70.
- Exactly 70 passes; any lower score fails.

## BreakGlassRollbackEvidence

Durable recovery authority for one bounded founder-performed emergency merge.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | string | `kimen-break-glass-rollback-v1` |
| `repository/rulesetName/rulesetId` | exact identity | Binds `kimen-dev/kimen` and its repository ruleset |
| `payload` | ruleset payload | Exact active policy with zero bypass actors |
| `expectedForwardPayload` | ruleset payload | Differs only by one founder `User` actor in `pull_request` mode |
| `pullRequest/headSha` | positive integer/Git SHA | Exact live founder PR and revision |
| `founderLogin/founderUserId` | canonical login/positive integer | Both observed from the authenticated GitHub user |
| `restorationIssueNumber/Url` | issue identity | Existing open same-repository issue, never a PR |
| `requestPayloadSha256` | SHA-256 | Exact parsed policy/event/request bytes that validated label, justification and restoration link |
| `openedAtEpochSeconds/deadlineEpochSeconds` | integer epochs | Positive window, hard-capped at 600 seconds |
| `integritySha256` | SHA-256 | Canonical record without this field |

The record and sidecar are private, fsynced and frozen before remote mutation.
The session holds the exclusive writer lock while polling and never calls the
merge API. Exact rollback is idempotent; drift retains `recovery-ready` state
rather than broadening or silently abandoning the grant.

## ModelLease

Short-lived authority for one unattended agent attempt.

| Field | Type | Rules |
|---|---|---|
| `leaseId` | opaque string | Unique and revocable |
| `provider` | enum | `openai`, `anthropic`, or approved gateway |
| `endpoint` | HTTPS URL | Host must be present in versioned egress allowlist |
| `token` | EdDSA JWT | Gateway lease; never an upstream provider API key |
| `issuer/audience/kid` | JWT identity | Pinned issuer, `kimen-sandbox` audience and current/next Ed25519 key |
| `issuedAt` | UTC timestamp | Host validation time |
| `expiresAt` | UTC timestamp | Signed `exp`; no later than attempt timeout + 60 seconds, absolute max 3,660 seconds |
| `leaseNotAfter` | host epoch milliseconds | Fsynced before acquisition starts; helper start + 30-second synchronous helper timeout + token TTL, maximum timeout + 90 seconds |
| `scope` | object | project kimen, approved model class, maxCostUsd <=25, maxRequests <=1000 |
| `helper` | executable path | Runs on host, never inside agent container |
| `state` | enum | prepared, acquiring, acquired, mounted, revoking, revoked, cancelled, expired |

### Invariants

- Bootstrap/install runs before `acquired`.
- The secret is mounted only into the agent phase.
- The helper's privileged minting credential never enters the container.
- `EXIT`, `INT` and `TERM` request revocation; server expiry is the backstop.
- Broker acquisition is synchronous: it either completes minting in its
  response within 30 seconds or guarantees that timeout/termination cannot mint
  later. Fire-and-forget descendants and queued asynchronous mints are invalid.
- Header is exactly JWT/EdDSA/known kid; signature/envelope claims match;
  alternate/none/symmetric algorithms and self-asserted timestamps are invalid.
  Static API keys and persistent OAuth refresh tokens are invalid leases.

## EgressPolicy

| Field | Type | Rules |
|---|---|---|
| `allowedHosts` | sorted list | Root-owned, versioned, exact hostnames |
| `allowedPort` | integer | 443 only |
| `connectAuthority` | hostname:port | Exact normalized allowlist member |
| `tlsSni` | hostname | Parsed ClientHello SNI; must equal CONNECT authority |
| `agentUid` | OS identity | Loopback only; no direct DNS/network |
| `proxyUid` | OS identity | May resolve and connect for validated hosts only |
| `proxyAddress` | URL | Loopback CONNECT proxy |
| `decision` | enum | allow, deny |

IP literals, undeclared ports/hosts, direct agent connections, plaintext,
missing/mismatched SNI, ECH and malformed/oversized/timed-out ClientHello always
resolve to `deny`. The proxy opens the upstream socket only after that decision.

## AttemptEvidence

Non-secret progressive record stored inside the disposable clone.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | integer | `1` |
| `attemptId` | timestamp/nonce | Matches local branch/ref name |
| `baseSha` | Git SHA | Attempt starting point |
| `taskSha256` | SHA-256 | Digest only; raw task stays outside evidence if sensitive |
| `phases` | map | bootstrapFirewall, bootstrapProxy, install, browser, leaseAcquire, agentFirewall, agentProxy, agent, agentDestroy, leaseRevoke, gates, finalize |
| `phase.status` | enum | not-run, running, passed, failed, interrupted |
| `phase.exitCode` | integer/null | Null only for not-run/running |
| `gateVerdict` | enum | green only when gates exit 0; otherwise red |
| `verdict` | enum | green only when gates and required containment/finalization phases pass |
| `snapshotSha` | Git SHA | Parent snapshot commit, never the evidence commit itself |
| `evidenceRef` | Git ref | `loop/<attempt-id>` resolving to the final evidence commit |

### State transition

```text
created → bootstrap → agent → gates → finalized
    └──────── any interruption/failure ───────┘
```

The host finalizer is authoritative. Bootstrap has registry/build-only network
and no lease. After agent exit the host destroys its container/secret and must
revoke before authoritative gates start in a fresh networkless, secretless
container. It then makes an allow-empty snapshot commit,
then a second commit containing final evidence that points to the snapshot;
the ref points to the second commit. Gates exit 0 yields green gate evidence,
but any containment/revocation/finalization failure makes the overall attempt
red. Agent non-zero remains evidence and does not by itself override later
green gates. Before any new attempt, every journal state without a verified
final marker/ref is operationally cleaned and recovered into a red two-commit
snapshot; recovery is not limited to a `running` value. Total loss of durable
host storage is an explicit boundary, not silently reported green.

## GlobalLoopLock

Single host-owned exclusion record adjacent to all loop clones and journals.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | integer | `1` |
| `pid` | positive integer | Current exclusive host orchestrator owner |
| `rootPath` | canonical absolute path | Exact Kimen source root |
| `acquiredAt` | epoch milliseconds | Diagnostic only; PID liveness controls contention |

Before the canonical lock directory is created atomically, each claimant writes
and fsyncs an external `0700` claim with `0600 owner.json`. Therefore a crash
between canonical `mkdir` and its owner write is attributable: any live claim
blocks, while dead claims can be reclaimed. Adoption is itself a non-empty,
fsynced owner directory; a later process can reclaim it if the adopter dies.
If either canonical owner publication crashes after fsync but before rename, a
successor validates the bound temporary file, blocks on a live writer, and
removes a dead writer's temporary before adoption.
A live owner causes a contender to exit without Docker, lease, Git or bootstrap
activity. A dead owner's lock remains held throughout operational and Git
recovery and is released only after adjacent final proof and lifecycle
finalization are durable. Real attempt IDs combine timestamp, owner PID and a
cryptographic nonce.

PID liveness is a portable fail-closed availability boundary: an OS PID reused
after a crash may conservatively keep the lock blocked because schema v1 does
not claim a cross-platform boot/start identity. It never grants authority to
the unrelated process.

## AttemptLifecycleJournal

Host-only crash-recovery authority stored adjacent to, never inside, the
agent-writable clone.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | integer | `1` |
| `attemptId` | timestamp/nonce | Matches evidence, adjacent anchor and `loop/<attempt-id>` |
| `repoPath` | canonical absolute path | Bound to one `kimen-loop-*` clone |
| `baseSha` | Git SHA | Immutable; equals evidence and anchor |
| `taskSha256` | SHA-256 | Immutable; equals evidence and anchor |
| `imageId` | Docker image ID/null | Persisted after successful image inspection |
| `containers.<phase>.state` | enum | none, creating, created, running, destroyed; phases are bootstrap, agent and gates |
| `containers.<phase>.id` | container ID/null | Fsynced before `docker start --attach` |
| `containers.<phase>.cidFile` | confined path/null | Host-only file inside this journal directory |
| `containers.<phase>.name` | deterministic Docker name/null | Fsynced before create; identifies a late create when CID persistence did not complete |
| `lease.state` | enum | none, prepared, acquiring, acquired, revoking, revoked, cancelled, expired |
| `lease.leaseId` | opaque string/null | Recovered from state, durable ID output or signed envelope |
| `lease.secretState` | enum | absent, pending, present |
| `lease.acquireStartedAt` | epoch milliseconds/null | Set with `leaseNotAfter` immediately before helper start |
| `lease.leaseNotAfter` | epoch milliseconds/null | Mandatory-expiry upper bound; never inferred from an untrusted envelope |
| `finalization` | enum | pending, complete |

### Invariants

- Journal root/attempt directories are host-owned `0700`; state, anchor, CID,
  lease and copied milestone files are regular host-owned `0600` files.
- Initial evidence, immutable anchor and journal state are fsynced before any
  container or lease exposure. Container intent and exact labels are durable
  before `docker create`; the CID is durable before `docker start --attach`.
- Startup scans journals, adjacent anchors and clone evidence as one bijection.
  Missing, corrupt, orphan, symlinked, inaccessible or binding-mismatched state
  blocks both Git recovery and a new bootstrap.
- Startup recovery first destroys and verifies absence of all containers. A CID
  persisted in `created`/`running` requires authoritative exact-ID
  `docker ps --no-trunc` exit zero and empty output when inspect fails. A generic
  create error leaves `creating`; in that state neither a CID-file value nor an
  empty point-in-time query proves destruction. An exact deterministic-name or
  identity result must resolve to a label-validated container that the host then
  destroys, otherwise recovery blocks. Recovery then deletes the secret and confirms idempotent lease
  revocation, updates evidence, and only then invokes the Git finalizer.
- `prepared` proves the helper never started and can be cancelled immediately.
  Unidentified `acquiring` state blocks until broker lookup/revocation succeeds
  or the durable `leaseNotAfter` bound proves mandatory server expiry. That
  host bound includes the helper's full 30-second synchronous timeout plus the
  requested timeout + 60 token TTL (absolute maximum 3,690 seconds).
- A published attempt ref is trusted only with its adjacent host proof. The
  proof file and parent directory are fsynced before the host removes promotion
  recovery state; clone-internal control markers never substitute for it.
- `KIMEN_JOURNAL_NOW_MS_TEST` is invalid unless explicit loop test mode is set.
  Docker/BuildKit build work remains a documented non-credential residual: it
  receives no model lease or writable attempt clone, although the Docker CLI
  cannot journal a daemon-internal BuildKit worker identity.

## ReleaseCandidate

| Field | Type | Rules |
|---|---|---|
| `sourceSha` | Git SHA | Exact checkout; protected-main reachability required in release mode |
| `mode` | enum | dry-run or release |
| `tag` | SemVer tag/null | Required/reachable in release; null in non-mutating dry-run |
| `packages` | sorted list | Exactly @kimen/elements and @kimen/tokens for contract 018 |
| `tarballs` | path + SHA-256 + SHA-512 SRI | Built once by read-only validation |
| `manifest` | canonical JSON | Names, versions, file sizes and digests |
| `candidateArchive` | bytes | Single immutable upload artifact |
| `candidateSha256` | SHA-256 | Out-of-band digest of canonical candidate.tar |
| `artifactId` | GitHub integer | Output of upload action |
| `artifactDigest` | SHA-256 | GitHub artifact digest |
| `coreStatus` | enum | success required |
| `browserStatuses` | map | All engines success against same artifactId/candidateSha256 |
| `verificationStatus` | enum | Separate no-OIDC job success required |
| `publishStatus` | enum | blocked, eligible, published |

### Invariants

- Candidate bytes are produced once, after core gates. Dry-run permits current
  private packages for validation but never grants OIDC; release mode rejects
  private packages and requires exact tag/version/repository metadata.
- Publication rebuilds nothing and executes no repository code.
- Digest mismatch, tag/version mismatch, lifecycle publish script or missing
  browser result moves candidate to `blocked`.
- Catalog/placeholder/extra packages, mutable package sets and first-release
  trust gaps move the candidate to `blocked`.
- Only the publish job, after independent verification, can request OIDC.
- Registry reconciliation is idempotent: missing version publishes, identical
  SHA-512 integrity skips, and a conflicting existing version fails.

## TokenRecord

| Field | Type | Rules |
|---|---|---|
| `path` | DTCG path | Unique within each composition |
| `cssName` | custom property | Deterministically derived |
| `layer` | enum | primitive, theme, semantic, component |
| `component` | tag/null | Required for component layer |
| `value` | literal/reference/composite | Literal visual leaves only in primitive; higher layers alias same/lower layers and terminate in primitives |
| `references` | paths | All resolve, acyclic, correct layer direction |
| `description` | string | Non-empty for published semantic/component leaves |
| `theme/scheme` | enum | onmars/material3 × light/dark |
| `consumers` | CSS file list | Used to derive component CEM CSS properties |

Composition order is fixed: onmars light base; that base plus onmars dark;
material3 light as base fallback followed by material3 theme/semantic/component
overrides; and material3 light plus material3 dark. Within a layer aliases are
valid only when acyclic and eventually lower; a reference to a higher layer or
a visual literal in theme/semantic/component is not. A small versioned grammar
allowlist may contain non-visual reset/control keywords such as `none` and
unitless zero, never colors, dimensions, motion, typography or shadows.

## PublicApiSnapshot

Canonical, sorted representation used for API diffing.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | integer | Versioned snapshot grammar |
| `surface.packages` | map | Per package: version, exports/rootSymbols with deprecation+replacement, publish metadata, components or tokens |
| `surface.browserBaseline` | ordered set | Current supported policy |
| `surfaceSha256` | SHA-256 | Canonical `surface` bytes only; no self-reference |

`ApiChangeDeclaration` records affected packages, expected release class
(`patch|minor|major`), baseline version/hash, candidate hash and a non-empty
rationale. Unknown API deltas classify as major. An actual class higher than
declared, stale digest, missing baseline, or removal without deprecation shipped
for at least one prior MINOR is blocked.

## ComponentInventoryEntry

Derived from `packages/elements/src/components/ki-*/ki-*.tsx`, never manually
registered.

| Field | Type |
|---|---|
| `tag` | `ki-*` |
| `className` | PascalCase |
| `sourceModule` | repository path |
| `unitSpec` | repository path |
| `browserSpec` | repository path |
| `distModule` | package path |
| `publicSubpath` | `./ki-*` |
| `moduleExports` | names | Derived from that component's direct module, including adjacent public types |
| `tokenSources` | base plus optional theme override |
| `budgetGroup` | default component or named composite exception |

All entries are sorted by tag; missing required derived files fail inventory
validation. New components are exported through direct package subpaths. The
existing root barrel is a deprecated, frozen legacy compatibility surface: it
is neither a registry nor extended by generation, every symbol names its direct
subpath replacement, and the API snapshot prevents accidental loss until it
has shipped for at least one MINOR and a separately approved MAJOR removes it.

## CapabilityClaim

| Field | Type | Rules |
|---|---|---|
| `id` | stable slug | Unique |
| `state` | enum | available, hardening, planned |
| `evidence` | gate IDs | Required for available/hardening |
| `destinations` | doc block IDs | Generated surfaces |
| `availableText` | string | Present tense allowed only for available |
| `plannedText` | string | Future/planned wording |

A claim is available only when every evidence ID exists as a mandatory gate.
The final suite also emits a current-run evidence record keyed by commit SHA or
canonical worktree digest. Available text is valid only when every referenced
gate is green in that same record; mandatory-gate membership alone is
insufficient.
