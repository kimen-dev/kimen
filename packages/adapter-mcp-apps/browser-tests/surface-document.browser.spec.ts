// @spec:030-adapter-mcp-apps
// @spec:069-ki-icon
// The packaged surface document, exactly as the adapter delivers it, inside a
// sandboxed frame of a real engine. The test IS the host: it hands the frame
// the resource text and then speaks MCP Apps 2026-01-26 over `postMessage` —
// nothing else. No script, stylesheet or element definition reaches the
// document from outside, which is the situation of every real host (an MCP
// server cannot inject anything into a self-contained resource).
//
// Wire fixtures and their specification citations: ../tests/spec-messages.ts.
import {
  catalogData,
  createLiveSurface,
  NATIVE_PRIMITIVE_TAGS,
  renderUiSpec,
} from '@kimen/catalog';
import type { Catalog } from '@kimen/catalog';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { createKimenSurfaceResource, KIMEN_ACTION_TOOL } from '../src/index.js';
import {
  confirmSurface,
  type Fixture,
  hostContextChanged,
  initializeResult,
  toolResult,
} from '../tests/spec-messages.js';

/**
 * The sandbox a conforming host gives the View: "the Sandbox MUST have the
 * following permissions: allow-scripts, allow-same-origin" (apps.mdx:475).
 * Keeping its origin is also what lets this test read the View's rendered
 * state the way a user's browser computes it.
 */
const HOST_SANDBOX = 'allow-scripts allow-same-origin';

/** The strictest frame a host can give the View: scripts, and an opaque origin. */
const OPAQUE_SANDBOX = 'allow-scripts';

const FRAME_TITLE = 'Kimen surface';

type ViewWindow = Window & typeof globalThis;

interface Host {
  /** Every message the View posted to its host, in order. */
  readonly received: Fixture[];
  /** Posts one protocol message to the View. */
  readonly send: (message: Fixture) => void;
  /** The View's own window: its element registry and computed styles. */
  readonly view: ViewWindow;
  /** Every content-policy violation the View's document reported, from its first byte. */
  readonly violations: string[];
}

interface EmbedOptions {
  /** `hostContext` fields of the host's `McpUiInitializeResult`. */
  readonly hostContext?: Readonly<Record<string, unknown>>;
  readonly sandbox?: string;
}

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

const methodOf = (message: Fixture): unknown => message['method'];

/**
 * Embeds the packaged document like a host and completes the handshake: the
 * View speaks first (`ui/initialize`), the host answers, the View confirms
 * (`ui/notifications/initialized`). Resolves once the View is ready.
 */
const embed = async ({ hostContext, sandbox = HOST_SANDBOX }: EmbedOptions = {}): Promise<Host> => {
  const keepsOrigin = sandbox === HOST_SANDBOX;
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  frame.setAttribute('sandbox', sandbox);
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '320px';

  const received: Fixture[] = [];
  const violations: string[] = [];
  // An opaque origin cannot be named: the host can only address it without one.
  const viewOrigin = keepsOrigin ? window.location.origin : '*';
  const send = (message: Fixture): void => {
    // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
    frame.contentWindow?.postMessage(message, viewOrigin);
  };
  const onMessage = (event: MessageEvent<Fixture>): void => {
    if (event.source !== frame.contentWindow) {
      return;
    }
    received.push(event.data);
    const id = event.data['id'];
    if (methodOf(event.data) === 'ui/initialize' && typeof id === 'number') {
      send(initializeResult(id, undefined, hostContext));
    }
  };
  window.addEventListener('message', onMessage);
  teardown.push(() => {
    window.removeEventListener('message', onMessage);
    frame.remove();
  });

  frame.srcdoc = createKimenSurfaceResource('inventory').text;
  document.body.append(frame);
  if (keepsOrigin) {
    // Attached while the frame still shows its initial empty document: the
    // engine keeps this window for the same-origin document it loads next, so
    // the listener is in place before the View's first byte is parsed and a
    // violation at load is not missed. "S21 refuses …" below is the control
    // that proves the listener is live on the loaded document.
    frame.contentWindow?.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective} blocked ${event.blockedURI}`);
    });
  }

  await expect.poll(() => received.map(methodOf)).toContain('ui/notifications/initialized');
  // The View spoke first, and said nothing else until the host answered.
  expect(received.map(methodOf).slice(0, 2)).toEqual([
    'ui/initialize',
    'ui/notifications/initialized',
  ]);

  return {
    received,
    send,
    get view(): ViewWindow {
      const view = frame.contentWindow;
      if (view === null) {
        throw new Error('the surface frame has no window');
      }
      return view as ViewWindow;
    },
    violations,
  };
};

/** The surface frame as the user reaches it: by pointer and by role. */
const surfaceFrame = () => page.frameLocator(page.getByTitle(FRAME_TITLE));

const actionCalls = (host: Host): Fixture[] =>
  host.received.filter((message) => methodOf(message) === 'tools/call');

/** A length token as the View's own document resolves it, in CSS pixels. */
const lengthToken = (view: ViewWindow, name: string): number => {
  const root = view.getComputedStyle(view.document.documentElement);
  const length = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(root.getPropertyValue(name).trim());
  if (length === null) {
    throw new Error(`${name} does not resolve to a length inside the surface document`);
  }
  return Number(length[1]) * (length[2] === 'rem' ? Number.parseFloat(root.fontSize) : 1);
};

/** The scheme the document effectively renders in, and the page color it paints. */
const rendering = (host: Host): { background: string; scheme: string } => {
  const style = host.view.getComputedStyle(host.view.document.documentElement);
  return { background: style.backgroundColor, scheme: style.colorScheme };
};

/**
 * The smallest spec node the catalog accepts for `tag`: every prop the
 * component contract requires, given a value of its declared type. Icons use
 * the named glyph the stock document includes.
 */
// Read through the published Catalog shape, where every constraint field is
// optional, instead of the literal type of the generated data.
const catalog: Catalog = catalogData;

function minimalNode(tag: string): {
  component: string;
  props: Record<string, boolean | number | string>;
} {
  const props: Record<string, boolean | number | string> = {};
  for (const [name, constraint] of Object.entries(catalog.components[tag]?.props ?? {})) {
    if (constraint.required !== true) {
      continue;
    }
    if (constraint.type === 'number') {
      props[name] = constraint.minimum ?? 1;
    } else if (constraint.type === 'boolean') {
      props[name] = true;
    } else {
      props[name] = constraint.values?.[0] ?? 'Sample';
    }
  }
  if (tag === 'ki-icon') {
    props['name'] = 'circle-check';
  }
  if (tag === 'ki-image') {
    // An informative image needs alt text; the decorative form needs none.
    props['decorative'] = true;
  }
  return { component: tag, props };
}

describe('the delivered document is a complete Kimen surface', () => {
  it('renders the default Popover arrow when omitted and restores it after a live unset', async () => {
    const { view } = await embed();
    const surface = view.document.createElement('main');
    const trigger = view.document.createElement('button');
    trigger.id = 'filter-trigger';
    trigger.type = 'button';
    trigger.textContent = 'Filters';
    view.document.body.append(trigger, surface);
    const node = {
      component: 'ki-popover',
      id: 'filters',
      props: { for: trigger.id, label: 'Incident filters', open: true },
      slots: { '': ['Open incidents'] },
    };
    const panel = () => surface.querySelector('ki-popover')?.shadowRoot;
    const arrowWidth = () =>
      panel()?.querySelector('[part="arrow"]')?.getBoundingClientRect().width ?? 0;

    expect(renderUiSpec({ root: node, version: 1 }, { surface }).ok).toBe(true);
    await expect.poll(arrowWidth).toBeGreaterThan(0);

    surface.replaceChildren();
    const live = createLiveSurface({ actions: [], surface });
    expect(live.apply({ ops: [{ node, op: 'insert' }] }).ok).toBe(true);
    await expect.poll(arrowWidth).toBeGreaterThan(0);

    expect(live.apply({ ops: [{ id: node.id, op: 'set', props: { arrow: false } }] }).ok).toBe(
      true,
    );
    await expect.poll(arrowWidth).toBe(0);
    expect(panel()?.querySelector('[part="surface"]')?.matches(':popover-open')).toBe(true);

    expect(live.apply({ ops: [{ id: node.id, op: 'set', props: { arrow: null } }] }).ok).toBe(true);
    await expect.poll(arrowWidth).toBeGreaterThan(0);
  });

  it('S16 renders a tool result as a registered, token-styled Kimen button', async () => {
    const host = await embed();

    host.send(toolResult(confirmSurface));

    await expect.element(surfaceFrame().getByRole('button', { name: 'Confirm' })).toBeVisible();
    const { view } = host;
    const button = view.document.querySelector('ki-button');
    const definition = view.customElements.get('ki-button');
    // Registered: the element is an instance of its definition, not an
    // unknown tag the browser left inert.
    expect(definition).toBeDefined();
    expect(definition !== undefined && button instanceof definition).toBe(true);
    const control = button?.shadowRoot?.querySelector('button');
    if (!(control instanceof view.HTMLButtonElement)) {
      throw new Error('the Kimen button rendered no native control of its own');
    }
    // Styled by the tokens: the size token resolves inside the document and
    // is the size the control really has; its fill is painted, not the
    // transparent box of an unstyled custom element.
    const painted = view.getComputedStyle(control);
    expect(Number.parseFloat(painted.blockSize)).toBe(lengthToken(view, '--ki-button-md-height'));
    expect(painted.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('S17 sends the declared action of an activated control to the host', async () => {
    const host = await embed();
    host.send(toolResult(confirmSurface));

    await surfaceFrame().getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => actionCalls(host)).toHaveLength(1);
    expect(actionCalls(host)[0]).toMatchObject({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { arguments: { action: 'confirm' }, name: KIMEN_ACTION_TOOL },
    });
  });

  it('S17 needs nothing from its origin: the same activation works in an opaque-origin sandbox', async () => {
    const host = await embed({ sandbox: OPAQUE_SANDBOX });
    host.send(toolResult(confirmSurface));

    await surfaceFrame().getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => actionCalls(host)).toHaveLength(1);
    expect(actionCalls(host)[0]).toMatchObject({
      params: { arguments: { action: 'confirm' }, name: KIMEN_ACTION_TOOL },
    });
  });

  it('S18 registers every catalog component and renders them all inside its own content policy', async () => {
    // Native primitives (spec 037) are platform elements: nothing to register.
    const tags = Object.keys(catalogData.components).filter(
      (tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag),
    );
    const host = await embed();

    host.send(
      toolResult({
        actions: [],
        root: {
          component: 'ki-card',
          slots: { '': tags.map((tag) => minimalNode(tag)) },
        },
        version: 1,
      }),
    );

    const { view } = host;
    await expect
      .poll(() => view.document.querySelectorAll('ki-card > *'))
      .toHaveLength(tags.length);
    const unregistered = tags.filter((tag) => {
      const definition = view.customElements.get(tag);
      const element = view.document.querySelector(`ki-card > ${tag}`);
      return definition === undefined || !(element instanceof definition);
    });
    expect(unregistered).toEqual([]);
    // Shadow components render their own tree. Table styles its host in light DOM.
    const shadowTags = tags.filter((tag) => tag !== 'ki-table');
    await expect
      .poll(() => shadowTags.filter((tag) => view.document.querySelector(tag)?.shadowRoot == null))
      .toEqual([]);
    const table = view.document.querySelector('ki-card > ki-table');
    if (!table) throw new Error('The guarded surface did not render the Table host');
    await expect.poll(() => view.getComputedStyle(table).overflowX).toBe('auto');
    await expect
      .poll(() => view.document.querySelector('ki-icon')?.shadowRoot?.querySelector('svg path'))
      .toBeInstanceOf(view.SVGPathElement);
    // The document's policy loads images from data: only, and the URL policy
    // never lets a spec name one, so the sample image source is refused: that
    // report is the policy working. Nothing else may be reported.
    const sample = new URL('Sample', view.document.baseURI).href;
    expect(
      host.violations.filter((violation) => violation !== `img-src blocked ${sample}`),
    ).toEqual([]);
  });

  it('S13 renders the stock glyph and rejects unselected names', async () => {
    const host = await embed({ hostContext: { theme: 'light' } });
    const iconSpec = (name: string, label: string) => ({
      root: { component: 'ki-icon', props: { label, name } },
      version: 1,
    });

    host.send(toolResult(iconSpec('circle-check', 'Confirmed')));
    await expect.element(surfaceFrame().getByRole('img', { name: 'Confirmed' })).toBeVisible();

    host.send(toolResult(iconSpec('triangle-alert', 'Unselected')));
    // The same host sends this marker after the tool result, so observing
    // the scheme change proves the frame processed both messages.
    host.send(hostContextChanged({ theme: 'dark' }));
    await expect.poll(() => rendering(host).scheme).toBe('dark');

    await expect.element(surfaceFrame().getByRole('img', { name: 'Confirmed' })).toBeVisible();
    await expect
      .element(surfaceFrame().getByRole('img', { name: 'Unselected' }))
      .not.toBeInTheDocument();
    expect(host.violations).toEqual([]);
  });

  it('S19 follows the theme the host announces in its ui/initialize result', async () => {
    const dark = await embed({ hostContext: { theme: 'dark' } });
    const light = await embed({ hostContext: { theme: 'light' } });

    await expect.poll(() => rendering(dark).scheme).toBe('dark');
    await expect.poll(() => rendering(light).scheme).toBe('light');
    // The scheme is not a label: the same token paints a different page.
    expect(rendering(dark).background).not.toBe(rendering(light).background);
    expect(rendering(dark).background).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('S19 follows a theme change sent as ui/notifications/host-context-changed', async () => {
    const host = await embed({ hostContext: { theme: 'dark' } });
    await expect.poll(() => rendering(host).scheme).toBe('dark');
    const darkBackground = rendering(host).background;

    host.send(hostContextChanged({ theme: 'light' }));

    await expect.poll(() => rendering(host).scheme).toBe('light');
    expect(rendering(host).background).not.toBe(darkBackground);

    host.send(hostContextChanged({ theme: 'dark' }));

    await expect.poll(() => rendering(host).scheme).toBe('dark');
    expect(rendering(host).background).toBe(darkBackground);
  });

  it('S21 refuses a script and an inline style its content policy did not name', async () => {
    const host = await embed();
    const { view } = host;
    const title = view.document.title;

    // What a markup-injection bug would amount to, done on purpose: a script
    // element and a style attribute that are not the two digests in the policy.
    const script = view.document.createElement('script');
    script.textContent = 'document.title = "owned"';
    view.document.body.append(script);
    const styled = view.document.createElement('span');
    styled.setAttribute('style', 'display: none');
    view.document.body.append(styled);

    await expect
      .poll(() => host.violations)
      .toEqual(['script-src-elem blocked inline', 'style-src-attr blocked inline']);
    expect(view.document.title).toBe(title);
    expect(view.getComputedStyle(styled).display).toBe('inline');
  });
});
