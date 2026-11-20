# Capability claims v1

Source: `docs/capabilities.json`.

```json
{
  "schemaVersion": 1,
  "capabilities": [
    {
      "id": "web-components-foundation",
      "state": "available",
      "evidence": ["build", "test-browser", "pack-consumer"],
      "destinations": ["readme-status", "site-status"],
      "availableText": "Machine-readable Web Components foundation",
      "plannedText": ""
    },
    {
      "id": "runtime-catalog",
      "state": "planned",
      "evidence": [],
      "destinations": ["readme-status", "site-status"],
      "availableText": "",
      "plannedText": "Neutral runtime catalog planned"
    }
  ]
}
```

Rules:

- IDs and destination block IDs are unique.
- `available` requires non-empty evidence whose IDs are mandatory gates.
- `hardening` requires evidence and wording that names incomplete hardening.
- `planned` has no availability text and uses future/planned wording.
- Generated marked blocks are byte-deterministic; manual drift fails sync.
- A final evidence validator runs after the declared gates and accepts an
  `available` claim only when every evidence ID is green for the same current
  SHA/worktree digest. Static membership alone is insufficient.
- Release validation runs the core gates and the browser gate's shards in
  separate jobs at the candidate SHA. The validator runs after all of them, on
  their composed current-run evidence, where `test-browser` is green only when
  every release engine reported every one of its shards green.
