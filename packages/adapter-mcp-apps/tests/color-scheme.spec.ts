// @spec:030-adapter-mcp-apps
// The surface follows its host's color scheme (FR-012). `McpUiHostContext.theme`
// is `"light" | "dark"` (apps.mdx:544-545); it arrives in the `ui/initialize`
// result and in later `ui/notifications/host-context-changed` partial updates
// (apps.mdx:1219-1229). It is host data crossing the protocol boundary, so only
// those two values ever reach the document. Fixtures: ./spec-messages.ts.
import { beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceColorScheme } from '../src/index.js';
import { createSurfaceBridge } from '../src/index.js';
import { hostContextChanged, initializeResult } from './spec-messages.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

/** A bridge whose host answers `ui/initialize` with the given context fields. */
const connected = (hostContext?: Readonly<Record<string, unknown>>) => {
  const schemes: SurfaceColorScheme[] = [];
  const bridge = createSurfaceBridge({
    onColorScheme: (scheme) => schemes.push(scheme),
    send: () => undefined,
    surface,
  });
  bridge.start();
  bridge.receive(initializeResult(1, undefined, hostContext));
  return { bridge, schemes };
};

describe('the surface follows the host color scheme', () => {
  it('S19 applies the theme the host announces in its ui/initialize result', () => {
    const { schemes } = connected({ theme: 'dark' });

    expect(schemes).toEqual(['dark']);
  });

  it('S19 applies a theme change sent as ui/notifications/host-context-changed', () => {
    const { bridge, schemes } = connected({ theme: 'dark' });

    const result = bridge.receive(hostContextChanged({ theme: 'light' }));

    expect(result.ok).toBe(true);
    expect(schemes).toEqual(['dark', 'light']);
  });

  it('S19 leaves the scheme to the viewer when the host announces no theme', () => {
    const { bridge, schemes } = connected({ theme: undefined });

    // A context update about something else is not a theme change either.
    bridge.receive(hostContextChanged({ displayMode: 'fullscreen' }));

    expect(schemes).toEqual([]);
  });

  it.each([
    ['a name outside the protocol', 'sepia'],
    ['markup', '<script>document.title="owned"</script>'],
    ['a different letter case', 'Dark'],
    ['a non-string', { toString: () => 'light' }],
    ['null', null],
  ])('S20 never applies %s as a theme', (_label, theme) => {
    const { bridge, schemes } = connected({ theme: 'dark' });

    bridge.receive(hostContextChanged({ theme }));

    // The document stays in the scheme the host last validly announced.
    expect(schemes).toEqual(['dark']);
  });

  it('S20 ignores an undefined theme in the ui/initialize result', () => {
    const { schemes } = connected({ theme: 'sepia' });

    expect(schemes).toEqual([]);
  });

  it('S12 never applies a theme that arrives before the handshake completes', () => {
    const schemes: SurfaceColorScheme[] = [];
    const bridge = createSurfaceBridge({
      onColorScheme: (scheme) => schemes.push(scheme),
      send: () => undefined,
      surface,
    });
    bridge.start();

    const early = bridge.receive(hostContextChanged({ theme: 'dark' }));

    expect(early.ok).toBe(false);
    expect(schemes).toEqual([]);
  });

  it('S8 never applies the theme of a host negotiating an undeclared protocol version', () => {
    const schemes: SurfaceColorScheme[] = [];
    const bridge = createSurfaceBridge({
      onColorScheme: (scheme) => schemes.push(scheme),
      send: () => undefined,
      surface,
    });
    bridge.start();

    bridge.receive(initializeResult(1, '2099-01-01', { theme: 'dark' }));

    expect(bridge.state).toBe('refused');
    expect(schemes).toEqual([]);
  });
});
