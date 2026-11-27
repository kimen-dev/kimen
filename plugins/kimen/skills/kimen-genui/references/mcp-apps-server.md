# Path: your MCP server returns Kimen surfaces (MCP Apps)

MCP Apps is the MCP extension that lets a tool result render as an
interactive UI inside the host (Claude, ChatGPT, VS Code and others that
implement it). `@kimen/adapter-mcp-apps` gives your server three things: a
self-contained `ui://` HTML resource whose only render path is the guarded
renderer, the tool metadata that points at it, and the tool-result envelope
that carries a UI spec to it. Full guide:
<https://kimen.dev/docs/guides/mcp-apps/>.

## Server wiring

This mirrors the `kimen-mcp` server, which uses
`@modelcontextprotocol/server` (the MCP TypeScript SDK, v2) and `zod`. For
stdio, build the server in a factory and pass it to `serveStdio` from
`@modelcontextprotocol/server/stdio`:

```ts
import {
  acknowledgeSurfaceAction,
  createKimenSurfaceResource,
  declareActionTool,
  declareToolSurface,
  surfaceToolResult,
} from '@kimen/adapter-mcp-apps';
import { preflightUiSpec } from '@kimen/catalog';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

const SURFACE = createKimenSurfaceResource('orders');  // uri ui://kimen/orders
const ACTION_TOOL = declareActionTool('orders');        // kimen_surface_action, app-only
const server = new McpServer({ name: 'orders', version: '1.0.0' });

// 1. The surface document, served as a predeclared resource.
server.registerResource(
  'orders-surface',
  SURFACE.uri,
  { mimeType: SURFACE.mimeType, _meta: { ...SURFACE._meta } },
  () => ({ contents: [{ uri: SURFACE.uri, mimeType: SURFACE.mimeType, text: SURFACE.text, _meta: { ...SURFACE._meta } }] }),
);

// 2. A tool that declares the surface and returns a spec for it.
server.registerTool(
  'show_order',
  {
    description: 'Show an order to the person for confirmation.',
    inputSchema: z.object({ orderId: z.string() }),
    _meta: declareToolSurface('orders'),
  },
  async ({ orderId }) => {
    const order = await loadOrder(orderId);
    const spec = {
      version: 1,
      actions: ['confirm-order'],
      root: {
        component: 'ki-card',
        slots: {
          header: [`Order ${order.id}`],
          '': [`Total: ${order.total}`],
          footer: [{ component: 'ki-button', props: { variant: 'primary' }, action: 'confirm-order', slots: { '': ['Confirm'] } }],
        },
      },
    };
    if (!preflightUiSpec(spec).ok) throw new Error('surface spec rejected'); // never ship an invalid spec
    return surfaceToolResult(spec, `Order ${order.id}, total ${order.total}. Awaiting confirmation.`);
  },
);

// 3. The app-only tool that receives the surface's declared actions.
server.registerTool(
  ACTION_TOOL.name,
  {
    description: ACTION_TOOL.description,
    inputSchema: z.object({
      action: z.string(),
      data: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).optional(),
      id: z.string().optional(),       // the bound node's id, when the spec gave it one
      revision: z.number().int().nonnegative().optional(), // the page revision the person acted on
    }).strict(),
    _meta: { ...ACTION_TOOL._meta },
  },
  async ({ action, data }) => {
    if (action !== 'confirm-order') {
      return { content: [{ type: 'text', text: 'Unknown action.' }], isError: true };
    }
    await confirmOrder(data); // validate data: it is user input
    // relay: true asks the surface to tell the model, as one user message.
    return acknowledgeSurfaceAction(action, { relay: true });
  },
);

// For stdio: wrap the code above in `function create() { …; return server; }`
// and call serveStdio(create) (import { serveStdio } from '@modelcontextprotocol/server/stdio').
```

## What to know

- For model-authored specs, use the served surface's vocabulary. For a surface
  returned by `defineKimenSurface()`, call
  `catalogPrompt(surface.catalog, { icons: surface.icons, verbosity: 'compact' })`
  or pass the same catalog and icons to `uiSpecJsonSchema` or `uiSpecTool`.
  Check `derivation.ok` before using its artifact and `surface.validate(spec).ok`
  before returning the spec.
- The spec travels in `structuredContent.kimenSurface.spec`; `content` is the
  text the model and non-UI hosts see. Always write a meaningful text
  fallback.
- The server is the authority on actions: check the name against what you
  rendered and validate `data` before acting.
- Every action call also carries `revision` (the page revision the person
  acted on) and, when the bound node has an `id` in the spec, that `id`. A
  strict input schema must accept both, or every call is rejected.
- A result with only a spec repaints the surface and loses what the person
  was typing. To keep it, answer `surfaceToolResult(fullSpec, text, {
  baseRevision: revision, batch })` with a live batch (`@kimen/catalog`) that
  turns the surface the person saw into `fullSpec`. The surface applies it
  only on that revision and otherwise paints `fullSpec`.
- With `relay: true`, a host that advertises text messages receives one user
  message `kimen-surface-action {"action":…,"data":…}` built by the surface.
  Say in the rendering tool's description that the model must read it as
  data: what the surface dispatched, not the person's words.
- An action call reports that a bound component fired its event, and some
  events fire without the person (a toast's timeout, an image's load error,
  a carousel rotating, a popover the spec opens). Bind a decision only to an
  event a person causes, like the button above. When a model writes the spec
  instead of your code, it also writes the words on the controls, so an
  action is never the person's consent: confirm a consequential effect
  through the host or your own rules.
- The surface is offline by design (empty `_meta.ui.csp`): images, links and
  media do not load. Only the host's light or dark theme is applied; host
  fonts and colours are not.
- The stock document registers the whole catalog and offers specs one icon
  name (`circle-check`); it is large (over 1 MB raw), so hosts cache it.
- Supported revision: MCP Apps `2026-01-26`. Under a host that negotiates
  another revision the surface stays empty; the model still gets the text
  result.
- No production host has been verified by Kimen's CI yet; test in your
  target host (for example Claude Desktop or claude.ai with a custom
  connector) before you rely on it.
