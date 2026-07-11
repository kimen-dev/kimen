# Ephemeral model lease v1

The unattended loop receives the path to a host executable in
`KIMEN_MODEL_LEASE_HELPER`. No static token environment variable or persistent
auth volume is accepted. The helper returns a gateway lease, never a provider
API key. Its compact JWT is verified on the host against a root-owned pinned
public key before any secret reaches the container.

The host verifier requires the fsynced absolute deadline on every acquisition.
It accepts either the explicit flag or the environment form; if both are
present they MUST resolve to the same safe-integer epoch millisecond:

```sh
sandbox/model-lease.sh acquire --output /host/run/kimen/model-lease.json \
  --not-after-ms 1783630860000

KIMEN_LEASE_NOT_AFTER_MS=1783630860000 \
  sandbox/model-lease.sh acquire --output /host/run/kimen/model-lease.json
```

The verifier normalizes that value and supplies it to the external broker in
both argv and `KIMEN_LEASE_NOT_AFTER_MS`:

```sh
"$KIMEN_MODEL_LEASE_HELPER" acquire --ttl 3660 \
  --not-after-ms 1783630860000 \
  --audience kimen-sandbox --project kimen
```

stdout is one JSON object and nothing else:

```json
{
  "schemaVersion": 1,
  "leaseId": "opaque-id",
  "provider": "openai",
  "endpoint": "https://gateway.example.invalid/v1",
  "tokenFormat": "jwt",
  "token": "<signed compact JWT>",
  "issuer": "https://broker.example.invalid",
  "audience": "kimen-sandbox",
  "issuedAt": "2026-07-09T20:00:00Z",
  "expiresAt": "2026-07-09T21:01:00Z",
  "scope": {
    "project": "kimen",
    "modelClass": "implementation-agent",
    "maxCostUsd": 25,
    "maxRequests": 1000
  }
}
```

Revoke:

```sh
"$KIMEN_MODEL_LEASE_HELPER" revoke opaque-id
```

Rules:

- Helper runs outside the container; its minting authority and provider
  credential are never mounted. The model gateway enforces the signed lease and
  keeps any upstream provider credential outside the sandbox.
- Agent timeout is at most 3,600 seconds and grace is exactly 60 seconds.
  Requested TTL, JWT `exp - iat` and returned timestamps cannot exceed 3,660
  seconds; shorter configured attempts reduce that bound to timeout + 60.
- Acquisition is synchronous and has a hard 30-second helper timeout. Before
  starting it, the host fsyncs a conservative absolute `leaseNotAfter` equal to
  helper start + 30 seconds + requested TTL. The resulting unidentified-mint
  bound is therefore timeout + 90 seconds, at most 3,690 seconds. Missing,
  malformed, conflicting, already-expired or overlong deadlines are rejected
  before broker invocation, and the deadline is checked again when the broker
  returns. A conforming broker treats `not-after-ms` as a hard server-side mint
  deadline, completes minting before its synchronous response and guarantees
  that a killed/timed-out request or a lost response cannot mint later in a
  descendant or queued job. Asynchronous fire-and-forget minting is
  non-conforming.
- The helper runs in its own process group under an asynchronous supervisor.
  At the 30-second timer the host sends `SIGTERM`, allows at most one second for
  orderly shutdown, then sends `SIGKILL` to any surviving group and waits for
  both the child close/reap event and process-group disappearance. An early
  leader exit cannot cancel the group kill while a descendant remains, and a
  nominally successful leader result is rejected if its process group is still
  populated. The supervisor handles host `SIGINT`/`SIGTERM`, performs the same
  group cleanup, and removes its handlers only after that cleanup. A timed-out,
  signaled, over-output or non-zero helper result is always rejected; neither
  acquisition nor revocation proceeds while that supervised group remains live.
  Post-`SIGKILL` group polling is deliberately fail-closed: a persistent zombie
  or rare process-group-ID reuse can block availability, but cannot make a live
  privileged descendant look quiescent or authorize the next phase.
- Signed JWT `exp` and the identical envelope `expiresAt` MUST be at or before
  `leaseNotAfter`. A response whose signed or copied expiry exceeds the durable
  absolute bound is deleted and rejected even when its relative TTL is valid.
- JWT header is exactly `typ: JWT`, `alg: EdDSA` and a `kid` present in the
  root-owned keyring. `none`, symmetric/alternate algorithms, unknown keys and
  key-confusion are rejected. Rotation may overlap only explicitly configured
  current/next Ed25519 public keys.
- The host verifies signature, issuer, audience, `iat`, `nbf`, `exp`,
  `jti == leaseId`, equality with the envelope, project `kimen`, approved model
  class, numeric `maxCostUsd` in `(0, 25]` and integer `maxRequests` in
  `[1, 1000]`. Self-asserted envelope dates never establish expiry.
- Endpoint host must exist in the versioned proxy allowlist.
- Token is written mode 0600, mounted read-only only for the agent container,
  never logged/committed/evidenced, deleted with that container and revoked
  before any authoritative gate container starts.
- Revoke is idempotent; server-side expiry is mandatory even if host dies.
- Test-only host clock overrides are rejected unless explicit loop test mode is
  active; production expiry decisions use the host clock and signed broker TTL.
- Missing helper/public key/deadline, invalid schema/signature/claims,
  excessive TTL, expiry beyond the absolute deadline, failed acquisition,
  failed revocation or an endpoint outside the allowlist aborts/fails the
  attempt and yields red evidence. A real broker remains disabled until it
  passes the same conformance command with its pinned key.
