# Release candidate v1

The validation job produces one deterministic archive containing:

```text
candidate.tar
├── manifest.json
├── SHA256SUMS
├── kimen-elements-X.Y.Z.tgz
└── kimen-tokens-X.Y.Z.tgz
```

`manifest.json`:

```json
{
  "schemaVersion": 1,
  "mode": "release",
  "sourceSha": "<40-hex>",
  "tag": "v1.2.3",
  "version": "1.2.3",
  "packages": [
    {
      "name": "@kimen/elements",
      "file": "kimen-elements-1.2.3.tgz",
      "sha256": "<64-hex>",
      "integrity": "sha512-<base64>",
      "size": 12345
    }
  ]
}
```

Rules:

- The 018 package set is exactly `@kimen/elements` and `@kimen/tokens`.
  `@kimen/catalog`, the unscoped placeholder and any extra tarball fail closed;
  catalog can enter only through its later approved capability/release change.
- In `release` mode source SHA is reachable from protected main and tag/version/
  package versions match exactly. In `dry-run` mode `tag` is null, current
  package versions are preserved, no ref/version is mutated and private
  packages are valid candidate inputs solely for validation.
- Package set is exact; no unexpected/missing tarball.
- Publish lifecycle scripts are forbidden in candidate package manifests.
- Canonical tar ordering, ownership and timestamps make `candidate.tar`
  deterministic. Its SHA-256 is an out-of-band workflow output because an
  archive cannot contain its own digest.
- Upload is immutable/non-overwriting and exposes artifact ID plus the Actions
  digest for audit. The authoritative byte gate is explicit recomputation of
  the out-of-band `candidate.tar` SHA-256; no warning text is treated as a gate.
  A separate `verify-candidate` job, with no OIDC, downloads by artifact ID and
  fails on candidate SHA, internal manifest/checksum, unexpected file or
  package-set drift.
- Each Chromium/Firefox/WebKit job downloads that same artifact ID, verifies
  the same candidate SHA, installs its elements/tokens tarballs without
  workspace linking and runs the browser harness against those bytes. Browser
  evidence records artifact ID and candidate SHA; rebuilding packages from the
  same source SHA does not qualify.
- Only after `verify-candidate` succeeds may the publisher receive
  `id-token: write`. It downloads the same artifact ID and repeats candidate,
  manifest and tarball verification before invoking npm.
- Publisher performs no checkout, install, build or repository script.
- Publisher requires preinstalled npm >=11.5.1 and exact repository metadata.
  Release-mode `private: true`, missing package/trusted-publisher configuration
  or ineligible first publication fail closed; no long-lived-token bootstrap is
  permitted in CI.
- Dry run stops after independent verification and never grants OIDC. Any
  publisher or partial-package failure is red, retains the candidate/evidence,
  and may retry only the identical digests; it never rebuilds or advances tags.
- Publication is idempotent per package: registry version absent publishes;
  existing `dist.integrity` equal to the manifest SHA-512 is already complete;
  existing version with any other integrity is a security failure. A retry after
  one package succeeded therefore publishes only the missing identical package.
