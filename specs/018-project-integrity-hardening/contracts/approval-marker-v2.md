# Approval marker v2 contract

> Retired by Constitution 2.0.0. Kept only as historical design evidence.

Path: `specs/<NNN-feature>/.approved`

```text
approval-version: 2
approved-at: 2026-07-09T20:00:00Z
spec-sha256: <64 lowercase hexadecimal characters>
feature-sha256: <64 lowercase hexadecimal characters>
```

Rules:

1. Exactly these four required keys appear once; unknown/duplicate keys fail.
2. Hashes cover exact file bytes after synchronized feature extraction.
3. Recording refuses missing, mismatched or lint-red contracts.
4. Either hash mismatch means stale approval.
5. A safe legacy migration preserves `approved-at` and adds the sole optional
   key `migrated-from-version: 1`. That key is valid only on a marker emitted by
   the migration command, and migration is allowed only when the old spec hash
   still matches and the feature is exact derived content.

Exit contract:

- `0`: marker valid for current pair.
- non-zero: diagnostic names missing/stale/invalid file and key.
