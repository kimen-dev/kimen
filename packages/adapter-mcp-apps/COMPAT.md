# @kimen/adapter-mcp-apps: protocol compatibility matrix

Constitution Art. VIII: each adapter declares the exact protocol version(s) it
supports, versioned with the adapter. A protocol's breaking release is
absorbed here and never forces a core change; an adapter that cannot absorb it
is retired.

This file is the human-readable projection of the machine-readable matrix in
`src/protocol.ts` (`MCP_APPS_PROTOCOL_VERSIONS`). The `protocol.spec.ts` suite
(scenario S9) fails if this table and the code drift or if any placeholder row
remains.

## Supported MCP Apps protocol versions

MCP Apps (SEP-1865) shipped as the first official MCP extension on 2026-01-26,
unifying the community mcp-ui project and OpenAI's Apps SDK. This adapter
release pins that revision:

| Adapter version | MCP Apps protocol version(s) | Status |
| --- | --- | --- |
| 0.0.0 | 2026-01-26 | supported |

Normative source: `specification/2026-01-26/apps.mdx` (status "Stable") in
[github.com/modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps)
at commit `19256f52cad5517ba8272581ed2e11d6a81273d5` (2026-11-04), where the
reference SDK `@modelcontextprotocol/ext-apps` is `2.0.4` and its
`LATEST_PROTOCOL_VERSION` is `2026-01-26` (`src/spec.types.ts:29`). The
`specification/draft/` revision is not implemented. Interoperability was
exercised against that SDK's `AppBridge` host (handshake, tool input/result,
`tools/call`, size, teardown); no production host (Claude, ChatGPT, VS Code,
Goose) has been tested yet.

The surface states its version in its `ui/initialize` request; a host whose
`McpUiInitializeResult` negotiates any other protocol version is refused,
naming the supported set (scenario S8): the surface never sends
`ui/notifications/initialized`, so no surface renders under an undeclared
version.

## Wire vocabulary (2026-01-26)

JSON-RPC 2.0 over `postMessage`, View = this surface document:

| Direction | Message | Kimen behavior |
| --- | --- | --- |
| View → Host | `ui/initialize` request (`appInfo`, `appCapabilities: {}`, `protocolVersion`) | sent once on load; the only message before the host answers |
| Host → View | `McpUiInitializeResult` | version negotiated; `hostContext` kept |
| View → Host | `ui/notifications/initialized` | sent only after a supported result |
| Host → View | `ui/notifications/tool-input`, `tool-input-partial`, `tool-cancelled` | acknowledged, never rendered |
| Host → View | `ui/notifications/tool-result` (`CallToolResult`) | `structuredContent.kimenSurface.spec` rendered through the guarded renderer |
| Host → View | `ui/notifications/host-context-changed` | merged into the host context (not mapped to tokens in v1) |
| View → Host | `tools/call` → `kimen_surface_action` `{ action, data }` | one per declared action; the tool name is fixed by the adapter |
| View → Host | `ui/notifications/size-changed` | on content size change, after the handshake |
| Host → View | `ui/resource-teardown` request, `ping` | answered with `{}` |
| Host → View | any other request | JSON-RPC error `-32601` |

Not used in this release: `ui/message`, `ui/update-model-context`,
`ui/open-link`, `ui/request-display-mode`, `resources/read`,
`notifications/message`, app-provided tools.

## What the surface document contains

The `ui://` surface resource is one self-contained HTML document (MIME
`text/html;profile=mcp-app`): the guarded renderer (spec 028) and the neutral
catalog validator are bundled inline, and the document's content policy
references no external origin (scenario S2). Host↔surface traffic follows the
wire vocabulary above, mediated by the host's audit path.

## Declared v1 boundaries

- Registering the `ki-*` custom-element definitions (loading `@kimen/elements`)
  is the consuming MCP server's step, kept out of the bundled document to
  preserve its determinism and size budget. The document embeds the guarded
  render path; element registration and theming are integrator concerns.
- Mapping host theme/style context onto `--ki-*` tokens is out of scope for
  v1 (spec Assumptions); appearance stays token-driven at the host.
- The integrating server registers the app-only action tool
  (`declareActionTool`, `visibility: ["app"]`) and validates each `action`
  it receives; the surface only guarantees that undeclared actions never
  leave.
- The surface consumes already-delivered protocol messages; transport and
  iframe sandboxing are the host's obligation (the document stays safe by
  construction even if the host does not enforce its content policy).
