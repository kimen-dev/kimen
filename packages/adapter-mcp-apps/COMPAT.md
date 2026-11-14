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
| Host → View | `McpUiInitializeResult` | version negotiated; `hostContext` kept; its `theme` (`light` or `dark`) becomes the document's color scheme |
| View → Host | `ui/notifications/initialized` | sent only after a supported result |
| Host → View | `ui/notifications/tool-input`, `tool-input-partial`, `tool-cancelled` | acknowledged, never rendered |
| Host → View | `ui/notifications/tool-result` (`CallToolResult`) | `structuredContent.kimenSurface.spec` rendered through the guarded renderer |
| Host → View | `ui/notifications/host-context-changed` | merged into the host context; a `theme` of `light` or `dark` switches the document's color scheme, any other value is ignored |
| View → Host | `tools/call` → `kimen_surface_action` `{ action, data }` | one per declared action; the tool name is fixed by the adapter |
| View → Host | `ui/notifications/size-changed` | on content size change, after the handshake |
| Host → View | `ui/resource-teardown` request, `ping` | answered with `{}` |
| Host → View | any other request | JSON-RPC error `-32601` |

Not used in this release: `ui/message`, `ui/update-model-context`,
`ui/open-link`, `ui/request-display-mode`, `resources/read`,
`notifications/message`, app-provided tools.

## What the surface document contains

The `ui://` surface resource is one self-contained HTML document (MIME
`text/html;profile=mcp-app`). An MCP server can hand a host nothing but this
resource, so the document is the whole surface — a host that only speaks the
protocol displays operable, token-styled Kimen components:

| Part | Content | Size (raw / gzip) |
| --- | --- | --- |
| one inline `<style>` | the default theme's token stylesheet, light and dark (`@kimen/tokens/css`), and the page contract (`@kimen/tokens/css/base`), minified | 142 kB / 14 kB |
| one inline `<script>` | the definition of every catalog component (29 `ki-*` elements from `@kimen/elements` and their runtime), the guarded renderer and the catalog validator (`@kimen/catalog`, spec 028), and the host bridge | 428 kB / 113 kB |
| whole document | | 571 kB / 128 kB (106 kB brotli) |

- **The registered set is the catalog.** The generator reads the component
  list from `@kimen/catalog` at build time; nothing is hand-listed, so a
  component the guarded renderer may render always has its definition
  (scenario S18).
- **Content policy by digest.** The document's own policy is
  `default-src 'none'; script-src 'sha256-…'; style-src 'sha256-…'; img-src
  data:; base-uri 'none'; form-action 'none'`: the two digests are the inline
  script and the inline stylesheet, and no other inline script, inline style,
  inline handler or evaluated code is admitted (scenario S21). It references
  no external origin, and neither does the declared `_meta.ui.csp` (scenario
  S2). The document works inside that policy without raising a violation.
- **Color scheme from the host.** The host's `theme` selects the token color
  scheme (`data-ki-color-scheme` on the root element); without one the
  document follows the viewer's preference (scenarios S19, S20).
- **Reproducible.** Regeneration is byte-identical — no date, randomness or
  machine path reaches the document — so a host's cached audit stays valid.
  `node scripts/generate-surface.mjs --check` verifies it.
- **Budgeted.** `tests/resource.spec.ts` fails above 600 kB raw, 135 kB gzip
  or 112 kB brotli.

Host↔surface traffic follows the wire vocabulary above, mediated by the
host's audit path. The real-browser suite (`browser-tests/`, Chromium) loads
the packaged document in a sandboxed frame (`allow-scripts allow-same-origin`,
and `allow-scripts` alone) and drives it only through `postMessage`.

## Declared v1 boundaries

- **Theme, not host styling.** Only the host's light/dark `theme` is applied.
  Host style variables and fonts (`hostContext.styles`) are kept in the host
  context and not mapped onto `--ki-*` tokens: the document always renders
  the default Kimen theme.
- **No webfont.** The document embeds no font file; the token font stacks
  resolve to their system fallbacks (`system-ui`, `ui-monospace`).
- **No network, including media.** The document declares no network origin,
  so a component whose content is a network resource — an avatar image, a
  video source — does not load it and shows its own fallback.
- The integrating server registers the app-only action tool
  (`declareActionTool`, `visibility: ["app"]`) and validates each `action`
  it receives; the surface only guarantees that undeclared actions never
  leave.
- The surface consumes already-delivered protocol messages; transport and
  iframe sandboxing are the host's obligation (the document stays safe by
  construction even if the host does not enforce its content policy). A host
  that rewrites the resource to inject its own inline script or style after
  the document's policy will see that injection refused by the digests.
- Verified in Chromium only; Firefox and WebKit have not run the real-browser
  suite, and no production host (Claude, ChatGPT, VS Code, Goose) has been
  tested yet.
