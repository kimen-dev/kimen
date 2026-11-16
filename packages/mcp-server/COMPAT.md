# @kimen/mcp-server: protocol compatibility matrix

The exact protocol revisions this server serves (spec 038 FR-013). This file
is the human-readable projection of `src/protocol.ts`; `tests/protocol.spec.ts`
(scenario S19) fails if this file, that module or the running binary
disagree.

## Supported MCP revisions

The MCP base protocol is negotiated by the pinned SDK,
`@modelcontextprotocol/server@2.4.0`, bundled into the binary. Its stdio entry
(`serveStdio`) serves the modern era and, by default, every legacy-era
revision; the server keeps both because shipping hosts still open with
`initialize`.

| Revision | Era | Opening |
| --- | --- | --- |
| `2026-07-28` | modern | `server/discover`, then a `_meta` envelope on every request |
| `2025-11-25` | legacy | `initialize` handshake |
| `2025-06-18` | legacy | `initialize` handshake |
| `2025-03-26` | legacy | `initialize` handshake |
| `2024-11-05` | legacy | `initialize` handshake |
| `2024-10-07` | legacy | `initialize` handshake |

`2026-07-28` was the latest revision at
[modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2026-07-28)
when this release was verified (2026-11-16). The end-to-end suite connects
reference clients pinned to `2026-07-28` and `2025-11-25` (scenario S18) and
checks that the binary accepts every revision above.

Structured tool results (`structuredContent`) and tool output schemas exist
from `2025-06-18`. A client of an earlier revision still receives every
answer as text content.

## Supported MCP Apps revision

| Revision | Through |
| --- | --- |
| `2026-01-26` | `@kimen/adapter-mcp-apps` (its `COMPAT.md`) |

The render tool declares the `ui://kimen/surface` resource
(`_meta.ui.resourceUri`). That resource is the adapter's self-contained
surface document, and the guarded renderer is its only render path. The
app-only action tool is `kimen_surface_action` (`_meta.ui.visibility:
["app"]`). A host without MCP Apps support ignores both and shows the render
result's text outline.

## Declared v1 boundaries

- **stdio only.** No HTTP transport, no prompts, no completions, no
  subscriptions.
- **Relay through `ui/message` only.** Every acknowledged action asks the
  surface to relay it (spec 040); the surface sends one `ui/message` only to
  a host that advertises `hostCapabilities.message.text`, so a host without
  it receives no relay. `ui/update-model-context` is not used.
- **URL properties are refused.** The surface declares no network origin, so
  no URL could load or open there.
- **Real hosts are not exercised by CI.** Interoperability is proven against
  the SDK's reference client of both eras; the surface document is proven
  against the reference MCP Apps host bridge by spec 030's real-browser
  suite.
