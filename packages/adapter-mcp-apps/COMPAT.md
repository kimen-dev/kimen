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

A host announcing any other protocol version is refused at negotiation,
naming the supported set (scenario S8) — no surface renders under an
undeclared version.

## What the surface document contains

The `ui://` surface resource is one self-contained HTML document (MIME
`text/html;profile=mcp-app`): the guarded renderer (spec 028) and the neutral
catalog validator are bundled inline, and the document's content policy
references no external origin (scenario S2). Host↔surface traffic uses the
JSON-RPC base protocol: `ui/toolResult` in, `ui/action` out, mediated by the
host's audit path.

## Declared v1 boundaries

- Registering the `ki-*` custom-element definitions (loading `@kimen/elements`)
  is the consuming MCP server's step, kept out of the bundled document to
  preserve its determinism and size budget. The document embeds the guarded
  render path; element registration and theming are integrator concerns.
- Mapping host theme/style context onto `--ki-*` tokens is out of scope for
  v1 (spec Assumptions); appearance stays token-driven at the host.
- The surface consumes already-delivered protocol messages; transport and
  iframe sandboxing are the host's obligation (the document stays safe by
  construction even if the host does not enforce its content policy).
