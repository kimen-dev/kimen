// @spec:163-mcp-apps-waiting-state
// The packaged surface document shows a text-free waiting placeholder until
// a spec paints. Found in the Claude desktop app on 2026-11-24: the host
// re-creates an idle card's View and does not send its result again, and the
// empty document read as a broken card. The document is embedded by the
// reference SDK's `AppBridge` (`@modelcontextprotocol/ext-apps` 2.0.4), as in
// relay.browser.spec.ts.
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { createKimenSurfaceResource, surfaceToolResult } from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

const browserCommands = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

const acceptedSpec = {
  actions: [],
  root: { component: 'ki-card', slots: { '': ['12 items in stock'] } },
  version: 1,
};

// An `iframe` node is refused by the guarded renderer (spec 030 S4).
const refusedSpec = {
  actions: [],
  root: { component: 'iframe', props: { src: 'https://evil.example' } },
  version: 1,
};

interface Mounted {
  readonly bridge: AppBridge;
  readonly frame: HTMLIFrameElement;
  readonly view: Window;
  /** The document's mount point. */
  readonly mount: HTMLElement;
}

/** The packaged document in the sandbox a conforming host gives a View, handshake done. */
async function embed(theme: 'dark' | 'light' = 'light'): Promise<Mounted> {
  const frame = document.createElement('iframe');
  frame.title = 'Kimen surface';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '320px';
  frame.srcdoc = createKimenSurfaceResource('waiting').text;
  document.body.append(frame);
  const view = frame.contentWindow;
  if (view === null) {
    throw new Error('the surface frame has no window');
  }
  const bridge = new AppBridge(
    null,
    { name: 'reference-host', version: '2.0.4' },
    TEXT_MESSAGE_CAPABILITIES,
    { hostContext: { theme } },
  );
  const initialized = new Promise<void>((resolve) => {
    bridge.addEventListener('initialized', () => {
      resolve();
    });
  });
  // Connected before the View's first message: the frame loads asynchronously.
  await bridge.connect(new PostMessageTransport(view, view));
  let closed = false;
  const dispose = async (): Promise<void> => {
    if (!closed) {
      closed = true;
      await bridge.close();
      frame.remove();
    }
  };
  teardown.push(dispose);
  await initialized;
  const mount = view.document.getElementById('kimen-surface');
  if (mount === null) {
    throw new Error('the document has no mount point');
  }
  return { bridge, frame, mount, view };
}

function placeholder(mount: HTMLElement): HTMLElement | null {
  const only = mount.children.length === 1 ? mount.firstElementChild : null;
  return only?.localName === 'ki-skeleton' ? (only as HTMLElement) : null;
}

/** The shimmer animation of the placeholder's first line, or 'none'. */
async function shimmer(skeleton: HTMLElement): Promise<string> {
  await expect
    .poll(() => skeleton.shadowRoot?.querySelector('[part~="shape"]') ?? null)
    .not.toBeNull();
  const shape = skeleton.shadowRoot?.querySelector('[part~="shape"]');
  if (shape === null || shape === undefined) {
    return 'none';
  }
  return getComputedStyle(shape, '::after').animationName;
}

it('S1 a surface that has received no result shows the waiting placeholder', async () => {
  const { mount } = await embed();

  const skeleton = placeholder(mount);
  expect(skeleton).not.toBeNull();
  expect(mount.innerText.trim()).toBe('');
  expect(mount.getAttribute('aria-busy')).toBe('true');
});

it('S2 the first accepted result replaces the waiting placeholder', async () => {
  const { bridge, mount } = await embed();
  expect(placeholder(mount)).not.toBeNull();

  await bridge.sendToolInput({ arguments: {} });
  await bridge.sendToolResult(surfaceToolResult(acceptedSpec, 'In stock'));

  await expect.poll(() => mount.querySelector('ki-card')).not.toBeNull();
  expect(mount.querySelector('ki-skeleton')).toBeNull();
  expect(mount.hasAttribute('aria-busy')).toBe(false);
});

it('S3 a refused result leaves the waiting placeholder in place', async () => {
  const { bridge, mount } = await embed();
  const skeleton = placeholder(mount);

  await bridge.sendToolInput({ arguments: {} });
  await bridge.sendToolResult(surfaceToolResult(refusedSpec, 'Refused'));
  // A later accepted result proves the refused one was processed first.
  await new Promise((resolve) => setTimeout(resolve, 200));

  expect(placeholder(mount)).toBe(skeleton);
  expect(mount.getAttribute('aria-busy')).toBe('true');
});

it('S4 a re-created surface whose host sends no result again shows the placeholder, not an empty page', async () => {
  const first = await embed();
  await first.bridge.sendToolInput({ arguments: {} });
  await first.bridge.sendToolResult(surfaceToolResult(acceptedSpec, 'In stock'));
  await expect.poll(() => first.mount.querySelector('ki-card')).not.toBeNull();
  await first.bridge.teardownResource({});
  await first.bridge.close();
  first.frame.remove();

  const again = await embed();
  await again.bridge.sendToolInput({ arguments: {} });

  expect(placeholder(again.mount)).not.toBeNull();
  expect(again.mount.getAttribute('aria-busy')).toBe('true');
});

it('S7 a placeholder that has waited 10 seconds without a result stops animating', {
  timeout: 30_000,
}, async () => {
  const { mount } = await embed();
  const skeleton = placeholder(mount);
  if (skeleton === null) {
    throw new Error('no placeholder');
  }
  expect(await shimmer(skeleton)).toBe('ki-skeleton-shimmer');

  // The document's own clock: real time, so the frame's timer is the one measured.
  await new Promise((resolve) => setTimeout(resolve, 10_500));

  expect(placeholder(mount)).toBe(skeleton);
  expect(await shimmer(skeleton)).toBe('none');
});

it('S5 with reduced motion the placeholder does not animate', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    const { mount } = await embed();
    const skeleton = placeholder(mount);
    if (skeleton === null) {
      throw new Error('no placeholder');
    }

    expect(await shimmer(skeleton)).toBe('none');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});

it('S6 the placeholder follows the host dark theme', async () => {
  const light = await embed('light');
  const lightSkeleton = placeholder(light.mount);
  const dark = await embed('dark');
  const darkSkeleton = placeholder(dark.mount);
  if (lightSkeleton === null || darkSkeleton === null) {
    throw new Error('no placeholder');
  }
  await shimmer(lightSkeleton);
  await shimmer(darkSkeleton);
  const fill = (skeleton: HTMLElement): string => {
    const shape = skeleton.shadowRoot?.querySelector('[part~="shape"]');
    return shape ? getComputedStyle(shape).backgroundColor : '';
  };

  expect(dark.view.document.documentElement.getAttribute('data-ki-color-scheme')).toBe('dark');
  expect(fill(darkSkeleton)).not.toBe('');
  expect(fill(darkSkeleton)).not.toBe(fill(lightSkeleton));
});
