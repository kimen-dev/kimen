// @spec:039-a2ui-1-0
// Amendment A1 (2026-11-20): two-way binding. What the person commits in a
// bound input reaches the surface's data model before the next action is
// dispatched, without re-rendering the surface, and only at the control's
// own bound path. A2UI 1.0 `a2ui_protocol.md`, "Two-way binding & input
// components".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { A2uiActionMessage, A2uiActionMetadata } from '../src/index.js';
import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

const surfaceId = 'booking';

function first(list: readonly string[]): string {
  const [head] = list;
  if (head === undefined) {
    throw new Error('the adapter declares no basic catalog id');
  }
  return head;
}

interface Family {
  readonly version: '1.0' | 'v0.9.1';
  readonly catalogId: string;
  readonly bind: (path: string) => Record<string, string>;
}

const V1: Family = {
  bind: (path) => ({ '@path': path }),
  catalogId: first(A2UI_V1_BASIC_CATALOG_IDS),
  version: '1.0',
};
const V091: Family = {
  bind: (path) => ({ path }),
  catalogId: first(A2UI_BASIC_CATALOG_IDS),
  version: 'v0.9.1',
};

let surface: HTMLElement;
let onAction: ReturnType<
  typeof vi.fn<(event: A2uiActionMessage, metadata?: A2uiActionMetadata) => void>
>;

beforeEach(() => {
  surface = document.createElement('div');
  document.body.appendChild(surface);
  onAction = vi.fn();
});

afterEach(() => {
  surface.remove();
});

function mount(
  family: Family,
  components: readonly Record<string, unknown>[],
  dataModel: Record<string, unknown>,
  sendDataModel = false,
) {
  const adapter = createA2uiAdapter({ onAction, surface });
  const { version, catalogId } = family;
  expect(
    adapter.apply({
      version,
      createSurface: { catalogId, surfaceId, ...(sendDataModel ? { sendDataModel } : {}) },
    }).ok,
  ).toBe(true);
  expect(
    adapter.apply({ version, updateDataModel: { surfaceId, path: '/', value: dataModel } }).ok,
  ).toBe(true);
  const result = adapter.apply({ version, updateComponents: { components, surfaceId } });
  expect(result.diagnostics).toEqual([]);
  return adapter;
}

const button = (family: Family, name: string, label: string, context: Record<string, string>) => [
  {
    action: {
      event: {
        context: Object.fromEntries(
          Object.entries(context).map(([key, path]) => [key, family.bind(path)]),
        ),
        name,
      },
    },
    child: `${name}-label`,
    component: 'Button',
    id: name,
  },
  { component: 'Text', id: `${name}-label`, text: label },
];

const column = (...children: string[]) => ({ children, component: 'Column', id: 'root' });

/** The person commits a value in a rendered control: live state, then its change event. */
function commit(element: Element | null, property: 'checked' | 'value', value: unknown): void {
  if (element === null) {
    throw new Error('control not rendered');
  }
  Reflect.set(element, property, value);
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function activate(label: string): void {
  const target = [...surface.querySelectorAll('ki-button')].find(
    (candidate) => candidate.textContent.trim() === label,
  );
  if (target === undefined) {
    throw new Error(`no button labeled ${label}`);
  }
  (target as HTMLElement).click();
}

const lastAction = () => onAction.mock.calls.at(-1)?.[0].action;

/** The data model the last action carried in its 1.0 metadata. */
function sentModel(): unknown {
  const metadata = onAction.mock.calls.at(-1)?.[1];
  if (metadata === undefined || !('a2uiRendererDataModel' in metadata)) {
    return undefined;
  }
  return metadata.a2uiRendererDataModel.surfaces[surfaceId];
}

function inputs(): HTMLElement[] {
  return [...surface.querySelectorAll<HTMLElement>('ki-input')];
}

describe('S24 a typed value reaches the agent with the next action', () => {
  it.each([V1, V091])('in A2UI $version', (family) => {
    mount(
      family,
      [
        column('email', 'book'),
        {
          component: 'TextField',
          id: 'email',
          label: 'Email',
          value: family.bind('/booking/email'),
        },
        ...button(family, 'book', 'Book', { email: '/booking/email' }),
      ],
      { booking: { email: '' } },
    );

    commit(surface.querySelector('ki-input'), 'value', 'ana@example.com');
    activate('Book');

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(lastAction()).toMatchObject({ context: { email: 'ana@example.com' }, name: 'book' });
  });
});

describe('S25 a choice the person makes is written to its bound path', () => {
  it('a checkbox', () => {
    mount(
      V1,
      [
        column('subscribe', 'save'),
        {
          component: 'CheckBox',
          id: 'subscribe',
          label: 'Subscribe',
          value: V1.bind('/prefs/newsletter'),
        },
        ...button(V1, 'save', 'Save', { newsletter: '/prefs/newsletter' }),
      ],
      { prefs: { newsletter: false } },
    );

    commit(surface.querySelector('ki-checkbox'), 'checked', true);
    activate('Save');

    expect(lastAction()).toMatchObject({ context: { newsletter: true } });
  });

  it('a single-choice picker', () => {
    mount(
      V1,
      [
        column('size', 'save'),
        {
          component: 'ChoicePicker',
          id: 'size',
          label: 'Size',
          options: [
            { label: 'Medium', value: 'm' },
            { label: 'Large', value: 'l' },
          ],
          value: V1.bind('/order/size'),
          variant: 'mutuallyExclusive',
        },
        ...button(V1, 'save', 'Save', { size: '/order/size' }),
      ],
      { order: { size: ['m'] } },
    );

    commit(surface.querySelector('ki-radio-group'), 'value', 'l');
    activate('Save');

    expect(lastAction()).toMatchObject({ context: { size: ['l'] } });
  });

  it('a slider', () => {
    mount(
      V1,
      [
        column('quantity', 'save'),
        {
          component: 'Slider',
          id: 'quantity',
          label: 'Quantity',
          max: 5,
          min: 1,
          value: V1.bind('/order/quantity'),
        },
        ...button(V1, 'save', 'Save', { quantity: '/order/quantity' }),
      ],
      { order: { quantity: 1 } },
    );

    commit(surface.querySelector('ki-slider'), 'value', '3');
    activate('Save');

    expect(lastAction()).toMatchObject({ context: { quantity: 3 } });
  });
});

describe('the write-back stays inside the adapter', () => {
  it('S26 the data model sent with an action carries what the person entered', () => {
    mount(
      V1,
      [
        column('email', 'book'),
        { component: 'TextField', id: 'email', label: 'Email', value: V1.bind('/booking/email') },
        ...button(V1, 'book', 'Book', {}),
      ],
      { booking: { email: '' } },
      true,
    );

    commit(surface.querySelector('ki-input'), 'value', 'ana@example.com');
    activate('Book');

    expect(sentModel()).toEqual({ booking: { email: 'ana@example.com' } });
  });

  it('S27 writing back keeps the person in place: no re-render, focus kept', () => {
    mount(
      V1,
      [
        column('name', 'email'),
        { component: 'TextField', id: 'name', label: 'Name', value: V1.bind('/booking/name') },
        { component: 'TextField', id: 'email', label: 'Email', value: V1.bind('/booking/email') },
      ],
      { booking: {} },
    );
    const [name, email] = inputs();
    if (name === undefined || email === undefined) {
      throw new Error('both fields must render');
    }
    email.setAttribute('tabindex', '0');
    email.focus();

    commit(name, 'value', 'Ana');

    expect(inputs()).toEqual([name, email]);
    expect(document.activeElement).toBe(email);
    expect(Reflect.get(name, 'value')).toBe('Ana');
  });

  it('S28 a field with a literal value writes nothing to the data model', () => {
    mount(
      V1,
      [
        column('draft', 'save'),
        { component: 'TextField', id: 'draft', label: 'Notes', value: 'draft' },
        ...button(V1, 'save', 'Save', {}),
      ],
      { notes: { saved: 'yesterday' } },
      true,
    );

    commit(surface.querySelector('ki-input'), 'value', 'final');
    activate('Save');

    expect(sentModel()).toEqual({ notes: { saved: 'yesterday' } });
  });

  it('never reports a write-back to the agent as an action', () => {
    mount(
      V1,
      [
        column('email'),
        { component: 'TextField', id: 'email', label: 'Email', value: V1.bind('/booking/email') },
      ],
      { booking: {} },
    );

    commit(surface.querySelector('ki-input'), 'value', 'ana@example.com');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('keeps the agent authoritative: a later update replaces what the person typed', () => {
    const adapter = mount(
      V1,
      [
        column('email'),
        { component: 'TextField', id: 'email', label: 'Email', value: V1.bind('/booking/email') },
      ],
      { booking: {} },
    );
    commit(surface.querySelector('ki-input'), 'value', 'ana@example.com');

    adapter.apply({
      version: '1.0',
      updateDataModel: { path: '/booking/email', surfaceId, value: 'ana@corp.example' },
    });

    expect(surface.querySelector('ki-input')?.getAttribute('value')).toBe('ana@corp.example');
  });
});
