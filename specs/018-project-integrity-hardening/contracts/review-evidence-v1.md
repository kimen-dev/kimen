# Clean-context review evidence v1

> Retired by Constitution 2.0.0. Clean-context review is now optional,
> advisory and direct-diff only.

The protected context is `clean-context-review`, implemented as a GitHub Check
Run on the exact PR head SHA.

Attestation payload:

```json
{
  "schemaVersion": 1,
  "repository": "kimen-dev/kimen",
  "pullRequest": 42,
  "headSha": "<40-hex>",
  "baseSha": "<40-hex>",
  "packetSha256": "<64-hex>",
  "reportSha256": "<64-hex>",
  "reviewer": "<trusted actor/model>",
  "round": 1,
  "verdict": "pass",
  "openCritical": 0,
  "openImportant": 0
}
```

`packetSha256` is not a free-form digest. It is the SHA-256 of the exact bytes
of the packet's `packet-manifest.json`. That manifest is a canonical commitment
to every other regular file in the frozen review packet:

```json
{"schemaVersion":1,"baseSha":"<40-hex>","headSha":"<40-hex>","files":[{"path":"MANIFEST.md","size":1234,"sha256":"<lowercase-64-hex>"}]}
```

Canonical packet-manifest rules:

- the root object has exactly `schemaVersion`, `baseSha`, `headSha`, `files`,
  in that order; `schemaVersion` equals `1`;
- each file object has exactly `path`, `size`, `sha256`, in that order;
- `files` lists every other regular packet file exactly once, excludes
  `packet-manifest.json` to avoid self-reference, and is strictly sorted by its
  canonical ASCII relative path;
- each path is 1–512 characters, contains only `A-Z a-z 0-9 . _ / -`, has no
  empty, `.` or `..` segment, and is neither absolute nor directory-shaped;
- `size` is the exact encoded byte length from `0` through 32 MiB and
  `sha256` is the lowercase SHA-256 of those exact bytes;
- the manifest binds 1–256 regular files, at most 128 MiB aggregate, and MUST
  contain `MANIFEST.md`, `constitutional-surface.md`, `diff.patch`,
  `diff.stat`, `feature.feature`, `gates-output.txt`,
  `review-metadata.json`, `scenario-ids.txt`, and `spec.md`;
- canonical bytes are compact UTF-8 JSON in the key order above followed by
  exactly one LF, with a maximum decoded length of 45,000 bytes.

The founder dispatches those exact canonical bytes as standard base64 in the
required `packet_manifest_base64` workflow input (at most 60,000 characters).
That cap leaves room for the other required fields below GitHub's documented
65,535-character total [`workflow_dispatch` input
payload](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs).
The trusted controller reads the input only from `GITHUB_EVENT_PATH`, decodes
it strictly, validates the closed schema and minimum inventory, compares
`baseSha`/`headSha` with the live PR, reconstructs the canonical bytes, and
recomputes SHA-256 before comparing it with `attestation.packetSha256`. The
manifest is a content commitment, not an archive transport: the trusted
reviewer attests that the directory reviewed matches its inventory, while the
workflow independently proves that the exact commitment dispatched by the
founder is current and is the one named by the attestation. It never fetches,
checks out, or executes untrusted PR packet code.

Rules:

- PR open/reopen/synchronize/ready creates pending evidence for current head.
- Success may be recorded only by the founder-controlled workflow after current
  deterministic gates and payload hashes validate.
- `headSha` must equal current PR head; later pushes invalidate evidence.
- The frozen `baseSha` must be an ancestor of `headSha`; descendant and
  unrelated ranges are rejected before packet assembly.
- Review packet includes diff, spec, feature, constitutional surface and gate
  output; UI work additionally includes rendered evidence.
- `review-metadata.json` schema v1 contains the packet's frozen `baseSha` and
  `headSha`. Reviewer attestation derives those fields from this metadata and
  binds them to the canonical manifest digest in `packetSha256`. The
  founder-controlled workflow remains the trust boundary: it compares the
  attested SHAs and manifest SHAs with the live PR refs and independently
  recomputes the packet-manifest digest; packet-contained metadata is not
  self-authenticating.
- No untrusted PR code is checked out or executed by the evidence workflow.
- The context becomes required only after a real check run has been observed.

## Rendered evidence manifest schema v1

UI-affecting changes MUST provide `review-evidence.json` as a regular file in
`EVIDENCE_DIR`. The schema is closed: every object has exactly the keys shown
and unknown keys are rejected.

```json
{
  "schemaVersion": 1,
  "baseSha": "<40-hex frozen review base>",
  "headSha": "<40-hex frozen review head>",
  "surfaces": [
    {
      "id": "component:ki-button",
      "paths": ["packages/elements/src/components/ki-button/ki-button.css"],
      "states": [
        {
          "name": "default",
          "image": "ki-button-default.png",
          "sha256": "<64-hex>"
        },
        {
          "name": "dark",
          "image": "ki-button-dark.png",
          "sha256": "<64-hex>"
        },
        {
          "name": "rtl",
          "image": "ki-button-rtl.png",
          "sha256": "<64-hex>"
        }
      ]
    }
  ]
}
```

The changed-path classifier derives the surface identifiers; the evidence
producer does not choose them:

| Changed path | Derived surface ID |
|---|---|
| `packages/elements/src/components/<name>/*` | `component:<name>` |
| `packages/elements/stencil.config.*` | `elements-config` |
| `packages/tokens/style-dictionary.config.*` | `tokens` |
| `packages/tokens/*` | `tokens` |
| `tools/kimen-plugin/src/generators/component/files/*` | `component-generator` |
| `tools/kimen-plugin/src/generators/component/files-token/*` | `component-generator` |
| `tools/kimen-plugin/src/generators/component/generator.js` | `component-generator` |
| `site/*` | `site` |
| Any other UI-classified path | `path:<changed-path>` |

The equivalent Vitest and TypeScript configuration files were reviewed but are
excluded from this classifier: they affect verification/typechecking rather
than the production render or token-generation pipeline.

For every derived surface, schema v1 requires this exact minimum state set:

| Surface ID | Required states |
|---|---|
| `component:*` | `default`, `dark`, `rtl` |
| `component-generator` | `default`, `dark`, `rtl` |
| `elements-config` | `default`, `dark`, `rtl` |
| `tokens` | `light`, `dark` |
| `site` | `wide`, `narrow` |
| `path:*` | `default` |

Missing baseline state names are invalid. Additional states with stable names,
unique image mappings and valid hashes are allowed. This lets feature-specific
review require more evidence without replacing or omitting the schema-v1
baseline.

Validation rules:

- `baseSha` and `headSha` equal the SHAs frozen by the packet assembler.
- `surfaces` is the exact set derived from the diff, and each `paths` array is
  the exact set of affected UI paths assigned to that surface.
- State names are unique within a surface. Each state has exactly `name`,
  `image`, and `sha256`; image paths are canonical relative paths without
  traversal and hashes bind the actual bytes. Every state within one surface
  has a distinct SHA-256 digest; byte-identical files cannot claim two states.
  Digest diversity proves integrity and non-reuse only, not that the image is
  an authentic or visually correct rendering of the named state.
- Every regular image in `EVIDENCE_DIR` is bound by the manifest. Images may be
  shared across different surfaces, but not reused for two states of one
  surface. Symlinks, special files, unbound images, and non-image files fail.
- Schema v1 fails closed to PNG because the network-free validator includes a
  real PNG decoder path but no equivalent JPEG/WebP decoder. It checks chunk
  framing, CRCs, IHDR encoding, IDAT inflation, decoded scanline lengths and
  filters. Indexed-color PNG (`colorType: 3`) is rejected because schema v1
  does not decode and validate palette samples; supported color types are 0,
  2, 4 and 6.
- Before reading payloads, validation caps the manifest at 1 MiB, tree depth at
  8, filesystem entries at 512, each encoded image at 64 MiB, and aggregate
  encoded image bytes at 32 MiB. A manifest has at most 128 surfaces and 32
  states per surface.
- PNG width and height are each capped at 32768 and each decoded scanline at 1
  MiB before row metadata is calculated. Decoded data is capped at 128 MiB per
  PNG and 512 MiB per evidence set. Validation first records bounded
  metadata/hash/layout, then re-reads each image under those caps to prove
  inflation; image buffers are not retained across the evidence set.
- Manifest and image reads open the discovered path with `O_NOFOLLOW`, bind the
  descriptor to the discovered device/inode/size with `fstat`, read exactly the
  bounded byte count, probe for one forbidden extra byte, and re-`fstat` before
  close. A path swap, early EOF, growth or trailing byte therefore fails.
- `EVIDENCE_DIR` is frozen once into `PACKET_BUILD/evidence` by the same
  descriptor-based, exclusive, capped tree publisher used for final packets;
  recursive `cp` is forbidden. All manifest/image validation after that point
  reads only the frozen snapshot. Growth, aggregate overflow and source
  symlink substitution during freezing fail before an unbounded temporary copy
  can be produced.

## Packet publication boundary

The dispatchable packet is subject to the tighter canonical-manifest transport
limit above (256 regular files and 45,000 manifest bytes). Therefore an
evidence tree that is valid under the standalone 512-entry rendered-evidence
cap can still be rejected during packet assembly if the complete packet cannot
be committed within the founder-controlled workflow input limit.

Publication uses atomic no-clobber `mkdir`, immediately holds the destination
open, checks its device/inode around every exclusive child create, and accepts
only an exact final type/mode/size/hash inventory. Regular files are streamed
from a held source descriptor into a newly created `O_EXCL | O_NOFOLLOW`
descriptor; mode changes, size checks and `fsync` operate on that held
descriptor via `fchmod`/`fstat`, never on the pathname. Directories are created
once with mode `0700` under a private umask and are never chmodded by path.
Publication failure never recursively deletes `PACKET_DIR`, because its path
may have been replaced by a foreign directory.

The complete prepared packet is limited to depth 12, 1024 filesystem entries,
32 MiB per regular file and 128 MiB aggregate file bytes. Inventory hashes and
publication copies use fixed-size streaming buffers; they do not load complete
files into memory. Packet assembly applies tighter streaming limits before data
reaches the temporary packet: `diff.stat` 1 MiB, `diff.patch` 16 MiB, changed
paths/spec/feature 4 MiB each, and gates output/log 16 MiB. Child-command exit
status is preserved, so a partial Git stream can never become accepted input.

The gate-status TSV and adjacent capability JSON are each frozen through the
bounded descriptor-copy helper at a 1 MiB limit before `check-capabilities`
runs. Validation uses only those copies. The capability JSON regenerated from
the frozen TSV and current revision must be byte-identical to the frozen
capability JSON, binding both evidence files rather than trusting two unrelated
valid-looking inputs.

Portable Node on macOS/Linux does not expose a combined mkdir-returning-fd or
cross-platform rename-noreplace primitive. Therefore a malicious process with
the same UID can replace an entirely empty directory in the micro-window
between `mkdir` and `open`; such an actor can also mutate any completed local
artifact. The tested guarantee at that boundary is that a replacement carrying
any entry cannot be reported successful, no existing entry is overwritten, and
no replacement is deleted during failure cleanup.

The same portability limit applies below the held root: Node does not expose
`openat`-style creation relative to the verified directory descriptor. A
same-UID actor can race a descendant directory into a symlink after confinement
checks. Descriptor-based `O_EXCL|O_NOFOLLOW` creation prevents overwriting an
existing target, and exact final inventory prevents a false success, while the
no-cleanup rule preserves foreign
paths; however, the race can create a previously absent filename outside
`PACKET_DIR`. Schema v1 documents and tests this boundary rather than claiming
containment that portable path-based APIs cannot provide.
