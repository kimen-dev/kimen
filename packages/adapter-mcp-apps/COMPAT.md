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
| 0.3.0 | 2026-01-26 | supported |

Normative source: `specification/2026-01-26/apps.mdx` (status "Stable") in
[github.com/modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps)
at commit `19256f52cad5517ba8272581ed2e11d6a81273d5` (2026-11-04), where the
reference SDK `@modelcontextprotocol/ext-apps` is `2.0.4` and its
`LATEST_PROTOCOL_VERSION` is `2026-01-26` (`src/spec.types.ts:29`). The
`specification/draft/` revision is not implemented. Interoperability was
exercised against that SDK's `AppBridge` host (handshake, tool input/result,
`tools/call`, size, teardown); the relay of declared actions (spec 040) runs
against that same `AppBridge` in the real-browser suite on every change
(`browser-tests/relay.browser.spec.ts`, the SDK is a pinned development
dependency). No production host (Claude, ChatGPT, VS Code, Goose) has been
tested yet.

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
| Host → View | `McpUiInitializeResult` | version negotiated; `hostContext` kept; its `theme` (`light` or `dark`) becomes the document's color scheme; `hostCapabilities.message.text` present means the host accepts relayed actions |
| View → Host | `ui/notifications/initialized` | sent only after a supported result |
| Host → View | `ui/notifications/tool-input`, `tool-input-partial`, `tool-cancelled` | acknowledged, never rendered |
| Host → View | `ui/notifications/tool-result` (`CallToolResult`) | `structuredContent.kimenSurface = { spec, update? }` (spec 157): `spec` is judged by the guarded renderer; its `update` `{ baseRevision, batch }` is applied by the live surface only when `baseRevision` is the page revision, `spec` declares the surface's own actions and the batch is accepted; otherwise `spec` paints in full |
| Host → View | `ui/notifications/host-context-changed` | merged into the host context; a `theme` of `light` or `dark` switches the document's color scheme, any other value is ignored |
| View → Host | `tools/call` → `kimen_surface_action` `{ action, data, revision, id? }` | one per declared action; the tool name is fixed by the adapter; `revision` is the page revision at the gesture, `id` the bound node's stable id when the spec gave it one (spec 157) |
| Host → View | `CallToolResult` of `kimen_surface_action` | a surface it carries is handled as a `tool-result` (its update applies or its spec paints); `structuredContent.kimenAction = { action, relay: true }` for the exact action sent asks for its relay |
| View → Host | `ui/message` `{ role: "user", content: [one text block] }` | the relay (spec 040): at most one per acknowledgment that asks for it, only to a host advertising text messages; text `kimen-surface-action ` + `{ action, data }` as escaped JSON, one line, at most 8192 bytes, never retried |
| Host → View | `ui/message` result or error | success is silent; an error or `isError` is reported as `relay-failed` |
| View → Host | `ui/notifications/size-changed` | on content size change, after the handshake |
| Host → View | `ui/resource-teardown` request, `ping` | answered with `{}` |
| Host → View | any other request | JSON-RPC error `-32601` |

Not used in this release: `ui/update-model-context`, `ui/open-link`,
`ui/request-display-mode`, `resources/read`, `notifications/message`,
app-provided tools.

Two gaps between the 2026-01-26 prose and the reference SDK at the pinned
commit; the adapter follows the SDK on both:

- `ui/message` `content`: the prose (apps.mdx:1005-1011) shows one object;
  the SDK's type (`src/spec.types.ts:208-217`) and the schema its host
  validates (`src/generated/schema.ts:801-813`) require an array of content
  blocks. The surface sends an array of one text block.
- The prose defines no host capability for `ui/message`; the SDK's
  `McpUiHostCapabilities.message` (`src/spec.types.ts:523`) and the draft
  (`specification/draft/apps.mdx:776-777`) do. The surface relays only to a
  host whose `hostCapabilities.message` has a `text` member, and reports
  `relay-unsupported` otherwise.

## What the surface document contains

The `ui://` surface resource is one self-contained HTML document (MIME
`text/html;profile=mcp-app`). An MCP server can hand a host nothing but this
resource, so the document is the whole surface — a host that only speaks the
protocol displays operable, token-styled Kimen components:

| Part | Content | Size (raw / gzip) |
| --- | --- | --- |
| one inline `<style>` | the default theme's token stylesheet, light and dark (`@kimen/tokens/css`), and the page contract (`@kimen/tokens/css/base`), minified | 213 kB / 25 kB |
| one inline `<script>` | every catalog component definition, the stock `circle-check` glyph, the guarded renderer, catalog validator and live surface (`@kimen/catalog`, specs 028 and 035), and the host bridge | 1,296 kB / 344 kB |
| whole document | | 1,509 kB / 370 kB (280 kB brotli) |

Measured on 2026-11-21 (main `f79f91f1` plus spec 157, macOS zlib and brotli);
the limits that bind are the ones `tests/resource.spec.ts` derives, not these
figures.

- **The registered set is the catalog.** The generator reads the component
  list from `@kimen/catalog` at build time; nothing is hand-listed, so a
  component the guarded renderer may render always has its definition
  (scenario S18).
- **One stock glyph.** The stock document and server preflight both import
  `circle-check` and declare it as the only name a spec may use
  (`selectSpecIcons`). Every other name produces `unavailable-icon` on
  `ki-icon`'s `name` or a component's `icon-name`, including the glyphs the
  bundled components draw for themselves. Each custom surface selects its own
  per-icon imports.
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
- **Budgeted.** `tests/resource.spec.ts` enforces raw, gzip and brotli limits
  calculated from the component inventory by `scripts/lib/bundle-size-budget.mjs`.
- **Live, not repainted (spec 157).** The document paints through the live
  surface (spec 035). A full spec makes a new live surface; an update changes
  only the nodes its batch names, so the other elements keep their identity,
  focus, typed values and scroll. The page revision starts at 0, advances by
  one per full paint and per applied update, and never repeats. An update that
  is not applied is reported as `update-not-applied` (its value names why:
  `stale-revision`, `declared-actions`, `malformed-update` or the live
  surface's rule) and the full spec paints instead. An update batch may use the
  full spec's byte budget and the live surface's 64-op budget.
- **Waiting, not empty (spec 163).** Until a spec paints, the mount point shows
  a text-free `ki-skeleton` and carries `aria-busy="true"`; the first accepted
  full paint replaces it and clears `aria-busy`, a refused result leaves it.
  After 10 seconds without a result the skeleton stops shimmering (it never
  does under reduced motion). A host that re-creates the View and does not
  send its result again shows this placeholder instead of an empty page.

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
  leave. It decides, per action, whether the model hears of it: its answer
  built with `acknowledgeSurfaceAction(action, { relay: true })` asks the
  surface to relay that action; any other answer keeps the action between
  surface and server.
- **What a relay carries.** Exactly the dispatched action and its data (the
  bound control's spec properties and live state), never the server's
  answer or host data, and never the call's `id` or `revision`. A relay above
  8192 bytes is not sent and never cut (`relay-too-large`). Consent is the
  host's: the surface shows nothing when it relays.
- **The server computes updates.** The surface checks an update's revision,
  declared actions and batch, never that the batch turns the old content into
  `spec`: a server whose batch disagrees with its own full spec shows the
  batch's result. `spec` must always describe the whole surface. A server
  that never sends an update (such as `@kimen/mcp-server`) gets a full repaint
  per result, as before.
- **Strict schemas need the two new arguments.** `declareActionTool` declares
  `id` and `revision` as optional. A server that copied the older schema by
  hand with `additionalProperties: false` rejects every call from this
  document until it accepts them; a server that ignores them keeps working.
- **Removable chips wait for the server.** On a live surface a `ki-chip`'s
  removal request is prevented: its bound action still leaves, and the chip
  stays until a result removes it (an update or a full spec without it). The
  static renderer let the chip remove itself.
- The surface consumes already-delivered protocol messages; transport and
  iframe sandboxing are the host's obligation (the document stays safe by
  construction even if the host does not enforce its content policy). A host
  that rewrites the resource to inject its own inline script or style after
  the document's policy will see that injection refused by the digests.
- Verified in Chromium only; Firefox and WebKit have not run the real-browser
  suite, and no production host (Claude, ChatGPT, VS Code, Goose) has been
  tested yet. The live updates of spec 157 are exercised by the hand-written
  host double (`browser-tests/live-updates.browser.spec.ts`) and the
  reference `AppBridge` accepts the new call arguments
  (`browser-tests/relay.browser.spec.ts`); no production host has run them.
