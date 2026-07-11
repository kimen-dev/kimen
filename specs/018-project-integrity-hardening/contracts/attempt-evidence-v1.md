# Unattended attempt evidence v1

Path inside clone: `.kimen/attempts/<attempt-id>.json`.

```json
{
  "schemaVersion": 1,
  "attemptId": "20260709-200000-ab12",
  "baseSha": "<40-hex>",
  "taskSha256": "<64-hex>",
  "phases": {
    "bootstrapFirewall": { "status": "passed", "exitCode": 0 },
    "bootstrapProxy": { "status": "passed", "exitCode": 0 },
    "install": { "status": "passed", "exitCode": 0 },
    "browser": { "status": "passed", "exitCode": 0 },
    "leaseAcquire": { "status": "passed", "exitCode": 0 },
    "agentFirewall": { "status": "passed", "exitCode": 0 },
    "agentProxy": { "status": "passed", "exitCode": 0 },
    "agent": { "status": "failed", "exitCode": 42 },
    "agentDestroy": { "status": "passed", "exitCode": 0 },
    "leaseRevoke": { "status": "passed", "exitCode": 0 },
    "gates": { "status": "passed", "exitCode": 0 },
    "finalize": { "status": "passed", "exitCode": 0 }
  },
  "gateVerdict": "green",
  "verdict": "green",
  "snapshotSha": "<40-hex>"
}
```

Rules:

- Phase status is one of `not-run`, `running`, `passed`, `failed`,
  `interrupted`; exit code is null only while not run/running.
- The host first creates an allow-empty snapshot commit containing product
  changes. It then writes final evidence whose `snapshotSha` points to that
  parent and creates a second evidence commit. `loop/<attempt-id>` points to the
  evidence commit, so no commit contains its own SHA.
- Before any untrusted container starts, the host fsyncs the initial evidence
  and writes an adjacent `0600` lifecycle journal plus immutable anchor binding
  `attemptId`, canonical clone path, `baseSha` and `taskSha256`. The journal
  directory is host-only `0700`; its `0600` state records the image, all
  bootstrap/agent/gates container intents and IDs, lease intent/ID/secret state,
  conservative server-expiry bound and finalization state. The clone's evidence
  is mounted read-only into every container. Bootstrap and agent containers
  write their firewall, proxy and child-start milestones to a root-owned
  `0600` file outside the agent UID; the host copies and validates that file
  before verifying container destruction.
- Every container is labeled with the attempt, canonical repository and phase.
  The host fsyncs create intent plus a deterministic container name, uses
  `docker create --cidfile`, fsyncs the resulting identity, and only then uses
  `docker start --attach`. A non-zero `docker create` result leaves the durable
  state at `creating`; it never proves that creation failed. While that state
  remains, a CID-file value or empty point-in-time query cannot prove absence:
  recovery proceeds only after the exact persisted name or identity resolves to
  a verifiable labeled container and that container is destroyed. Otherwise it
  remains ambiguous and blocks. A signal is
  forwarded to the active child; a child that does not terminate is killed and
  reaped before any later privileged transition.
- A single adjacent global lock is acquired and fsynced before journal scanning.
  A durable external claim precedes the atomic canonical `mkdir`, so a crash
  before `owner.json` still distinguishes live and dead claimants. Adoption has
  its own non-empty `0700` directory and fsynced owner; a successor can reclaim
  it after an adopter dies. A canonical owner write interrupted after its
  fsynced temporary file is validated on restart: a live writer blocks, while
  a dead writer's bound temporary is removed and the lock is adopted. Owner
  PID/root binding blocks concurrent loops
  without touching Docker or lease authority. A successor may adopt a dead owner's lock, but keeps it while
  operational and Git recovery run; a live attempt releases it only after its
  adjacent proof and journal finalization are durable. Production attempt IDs
  combine timestamp, PID and a cryptographic nonce, so same-second launches do
  not share a clone, ref, journal or label namespace.
- Portable PID liveness is intentionally fail-closed: a rare OS PID reuse can
  conservatively block lock recovery, but cannot transfer lock, Docker, lease
  or Git authority to the unrelated process.
- Before launching a new attempt, the host uses the adjacent lifecycle journal
  as its source of truth and scans every journal, anchor and durable attempts
  entry without shell `find` error suppression. It rejects orphan, inaccessible,
  non-regular or symbolic-link entries and validates ownership, permissions,
  immutable binding, container labels, identity and ancestry. Operational
  recovery always destroys and verifies absence of bootstrap, agent and gates
  containers. For an identity already persisted as `created`/`running`, absence
  requires both failed inspection and an authoritative empty exact-ID
  `docker ps --no-trunc --filter id=...` result; labels or an inspection error
  alone are never absence proof. A `creating` identity must instead be observed
  and validated before destruction. Recovery then deletes the lease secret and
  confirms idempotent revocation
  before Git recovery or a new bootstrap. A prepared lease intent is cancellable;
  an acquiring lease without a recoverable ID blocks until its fsynced
  `leaseNotAfter` bound proves mandatory server expiry. That bound includes the
  helper's full 30-second synchronous timeout plus token TTL; the broker may not
  mint asynchronously after timeout. Corrupt metadata,
  unrelated history or an operational finalizer error blocks the new attempt. An absent
  ref is recovered only when the finalizer returns the expected red status and
  the resulting two-commit chain verifies. An existing ref is never accepted
  from clone-internal Git metadata: it must have the durable adjacent host proof,
  or a still-present host promotion journal must drive restoration/recovery.
  The adjacent proof file and parent directory are fsynced before promotion
  recovery state is removed. This closes process/host
  interruption after restart. Loss of the durable clone or storage device is
  outside the software boundary and is reported explicitly.
- The finalizer force-adds only `.kimen/attempts/<attempt-id>.json`; the path may
  remain ignored in ordinary product work and no other ignored file is added.
- The attempt clone is created with neither local hardlinks nor alternates. The
  host finalizer imports only native Git objects into a fresh isolated control
  directory and builds the snapshot through plumbing with an empty environment,
  fresh index and raw blobs. Agent-controlled config, hooks, filters, fsmonitor,
  signing, attributes, refs and `core.worktree` never execute on the host. Git
  control-directory promotion is journaled and recoverable across interruption.
- Gates decide `gateVerdict`: exit 0 is green; non-zero/not-run is red. Overall
  `verdict` is red when `gateVerdict` is red or a required containment,
  destruction, revocation or finalization phase fails. A green overall verdict
  requires `bootstrapFirewall`, `bootstrapProxy`, `install`, `browser`,
  `leaseAcquire`, `agentFirewall`, `agentProxy`, `agentDestroy`, `leaseRevoke`
  and `gates` all to pass, with a terminal agent result. Agent failure alone
  remains observable and does not override later green gates.
- Bootstrap uses a registry/build-only proxy without a lease. After agent exit,
  its container and secret are destroyed and revocation must succeed. Only then
  do authoritative gates run in a fresh container with no secret mount and no
  external network. Failed revocation is red and gates remain non-authoritative/
  not-run.
- Docker/BuildKit build work has no model lease, credential mount or writable
  attempt clone. A daemon-side BuildKit worker identity cannot be journaled by
  the Docker CLI and is a residual non-credential build resource; a build signal
  is still forwarded and no agent authority is acquired until build completion.
- No raw prompt, environment, credential, command output or file content is
  recorded.
