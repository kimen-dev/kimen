# Kimen unattended sandbox

The unattended loop is split across disposable containers and controlled by
the host. Bootstrap has registry/build-only egress and no model authority. One
agent container receives a verified short-lived gateway lease. The host then
destroys that container and lease file, revokes the lease, and starts the
authoritative gates in a fresh container with `--network none`.

No npm/GitHub token, static provider key, ChatGPT login state, OAuth refresh
token or persistent authentication volume is accepted. Permission-bypass agent
execution is confined to the leased disposable agent container.

## External model-lease prerequisite

Kimen cannot mint short-lived model authority. Before a real unattended run,
the founder must configure an external gateway helper that implements
[`model-lease-v1`](../specs/018-project-integrity-hardening/contracts/model-lease-v1.md)
and export these host-only paths:

```sh
export KIMEN_MODEL_LEASE_HELPER=/root-owned/bin/kimen-model-broker
export KIMEN_MODEL_LEASE_KEYRING=/root-owned/etc/kimen/model-keyring.json
export KIMEN_MODEL_LEASE_REVOCATIONS=/root-owned/etc/kimen/revocations.json
```

The keyring contains only pinned Ed25519 public JWKs with explicit `current` or
`next` status. The helper's minting/provider credential stays outside this
repository and every container. `sandbox/model-lease.sh acquire` requests at
most 3,660 seconds, verifies the compact JWT plus envelope, writes one mode-0600
lease, and prints only its opaque ID. Revocation is mandatory before gates.

`sandbox/egress-allowlist.txt` is versioned and root-owned in the image. Its
`gateway.example.invalid` entry is intentionally non-routable: unattended model
execution remains disabled until an approved change replaces it with the real
gateway host and the same host is present in the verifier allowlist. The proxy
accepts only exact port-443 CONNECT targets whose bounded TLS ClientHello SNI
matches that target; the agent UID has no direct DNS or network route.

## Run

```sh
bash sandbox/loop.sh <feature-branch> "the approved task"
```

`sandbox/run.sh` is only a compatibility alias for the same split-phase loop;
it no longer opens an interactive credential-bearing container. Every attempt
leaves a local `loop/<attempt-id>` evidence ref with a product snapshot parent
and exact non-secret evidence commit. A green overall result requires both
successful revocation and green fresh-container gates; agent exit remains
observable but is not the verdict.

## Verification

The deterministic lease, proxy and recovery fixtures require no credential or
network:

```sh
node --test scripts/tests/model-lease.test.mjs
node --test sandbox/tests/proxy.test.mjs
bash sandbox/tests/loop-entry.test.sh
bash sandbox/tests/loop-host.test.sh
```

The UID firewall boundary requires Linux plus Docker and is mandatory in CI:

```sh
KIMEN_REQUIRE_DOCKER_CONTAINMENT=1 bash sandbox/tests/containment.test.sh
```

Local machines without a Docker daemon report an explicit skip; that skip is
not release evidence.
