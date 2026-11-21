# @kimen/mcp-server

The Kimen MCP server (spec 038): one stdio binary, `kimen-mcp`, through which
an agent — Claude Code, Claude Desktop or any MCP client — can do three
things with Kimen:

1. **Learn the catalog.** It lists the components and describes one
   component's props, slots, events, design tokens and parts. Everything is
   read from the generated artifacts: the catalog of `@kimen/catalog` and the
   committed component manifest. No component is named in the server's
   source, so a component added to the catalog appears after a rebuild.
2. **Validate a UI spec.** The server judges the spec as the guarded renderer
   would and reports every defect with its code, location and offending
   value, so a model can fix the spec and validate again.
3. **Render it.** In an MCP Apps host the spec appears as real Kimen
   components, inside the self-contained `ui://` surface of
   [`@kimen/adapter-mcp-apps`](../adapter-mcp-apps/README.md), whose only
   render path is the guarded renderer. Any other host shows a plain-text
   outline of the same spec. The server itself never paints and never
   produces HTML.

The exact MCP and MCP Apps revisions it serves are in [`COMPAT.md`](./COMPAT.md).

## Install from npm

Available from the first release, `v0.1.0`. With Node.js 22 or later, use
this command to install and start the stdio server:

```bash
npx -y -p @kimen/mcp-server@0.1.2 kimen-mcp
```

## Run from the repository

Build the server locally and point your host at the binary.

```bash
pnpm exec nx run @kimen/mcp-server:build
```

```bash
claude mcp add kimen -- node --permission --allow-fs-read=/absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs /absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs
```

For Claude Desktop, the same command goes in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kimen": {
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs",
        "/absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs"
      ]
    }
  }
}
```

Codex, Antigravity, OpenCode, Gemini CLI, VS Code and Cursor take the same
command in their own config formats: see
[Connect your agent](https://kimen.dev/docs/guides/connect-agents/).

`--permission` with read access to the binary alone is optional, and
recommended: the binary embeds everything it serves, so Node's permission
model can deny it every other file, child processes and — from Node 25 on —
the network, and it keeps working (the end-to-end suite runs it that way).
The binary takes no arguments.

## Tools

| Tool | Use it to | Answer |
| --- | --- | --- |
| `kimen_list_components` | choose components | every catalog component with its description and when to use it, and when not |
| `kimen_describe_component` | write a node for one component | `{ tag }` → its props (types, allowed values, defaults, required), slots, events, `--ki-*` tokens and parts; the text is the emitter's authoring block for it |
| `kimen_validate_spec` | draft and correct a spec | `{ spec }` → `{ ok, issueCount, issues[] }`, each issue `{ code, path, message, value? }`; at most 50 issues listed, values cut to 256 characters |
| `kimen_render_spec` | show the spec to the person | `{ spec }` → the MCP Apps surface result and a text outline; an invalid spec is never rendered, the issues come back instead |
| `kimen_surface_action` | — (app-only) | the surface's declared actions (with the node `id` and page `revision` the surface adds, accepted and ignored); acknowledged only when a surface rendered on the same connection declared them; each acknowledgment asks the surface to relay the action to the model |

`spec` is a UI spec object, or the same JSON as text. The catalog, the
spec-authoring guide and the spec JSON Schema are also resources:
`kimen://catalog`, `kimen://guide/ui-spec` and `kimen://schema/ui-spec`;
the surface document is `ui://kimen/surface`.

## Why it is safe

- **"Valid" means "the guarded renderer will paint it".** Validation and
  render run `preflightUiSpec` from `@kimen/catalog`: the renderer's own
  preparation step without a DOM, with its 262,144-byte, 32-level and
  512-component budgets. A spec that does not pass is never rendered.
- **Only catalog components, only declared actions.** Components outside the
  catalog are refused by name. An action reaches the server only if a surface
  it rendered declared it. The server then asks the surface to relay it, and
  a host that advertises text messages receives one user message,
  `kimen-surface-action {"action":…,"data":…}`, a single line of at most
  8192 bytes that the surface builds from what it sent (spec 040). The
  render tool's description tells the model how to read it.
- **URL properties are refused.** The surface declares no network origin, so
  no URL could load or open there.
- **Bounded input.** A stdio message over 4 MiB is discarded before it is
  parsed and reported on stderr; the server keeps serving.
- **Plain-text fallback.** The text outline sits in a code fence no spec
  string can close, so a host that renders tool text as Markdown still shows
  it as text.
- **No dependencies at run time.** One ESM file bundles the server, the MCP
  SDK (`@modelcontextprotocol/server@2.4.0`), the catalog and the surface
  document. A fresh build is byte-identical to the shipped file.

## When to use

Use it when an agent should compose Kimen UI in a conversation: explore the
catalog, draft a spec, validate it, and show it to the person. If you are
building your own MCP server that returns Kimen surfaces from your own tools,
use [`@kimen/adapter-mcp-apps`](../adapter-mcp-apps/README.md) directly. If
you control the rendering page, use [`@kimen/catalog`](../catalog/README.md).
