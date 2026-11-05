// @spec:028-guarded-renderer
// S17 in a real engine: an action-bound native-backed control stays operable
// under the guarded renderer. Before the fix the renderer cancelled the
// activation click, which reverted the native checkbox toggle — the control
// could not be checked, no change fired and the action carried stale data.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { type ActionEvent, type Catalog, createCatalog, renderUiSpec } from '../src/index.js';

// The ki-checkbox pattern, test-local: a native checkbox inside the shadow
// root (activated through its label), whose non-composed native change the
// host re-dispatches composed, with `checked` mirrored as a property.
class AcmeToggle extends HTMLElement {
  readonly #input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    const label = document.createElement('label');
    this.#input = document.createElement('input');
    this.#input.type = 'checkbox';
    label.append(this.#input, document.createElement('slot'));
    root.append(label);
    this.#input.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
  }

  get checked(): boolean {
    return this.#input.checked;
  }

  set checked(value: boolean) {
    this.#input.checked = value;
  }

  focusControl(): void {
    this.#input.focus();
  }
}

let catalog: Catalog;

beforeAll(() => {
  customElements.define('acme-toggle', AcmeToggle);
  const created = createCatalog({
    components: {
      'acme-toggle': {
        description: 'A native-backed toggle.',
        events: { change: 'Fired once after a user toggle commits.' },
        props: {
          checked: { description: 'Live selection state.', type: 'boolean' },
          name: { description: 'Form field name.', type: 'string' },
        },
        slots: { '': 'Visible label.' },
        tag: 'acme-toggle',
        whenNotToUse: 'Immediate on/off effects.',
        whenToUse: 'Select an independent option.',
      },
    },
  });
  if (!created.ok) {
    throw new Error(JSON.stringify(created.issues));
  }
  catalog = created.catalog;
});

let surface: HTMLElement;

beforeEach(() => {
  surface = document.createElement('div');
  document.body.replaceChildren(surface);
});

const spec = (action: boolean): unknown => ({
  version: 1,
  actions: action ? ['pick'] : [],
  root: {
    component: 'acme-toggle',
    ...(action ? { action: 'pick' } : {}),
    props: { name: 'ok' },
    slots: { '': ['OK'] },
  },
});

const mount = (
  action: boolean,
): { control: AcmeToggle; actions: ActionEvent[]; changes: () => number } => {
  const actions: ActionEvent[] = [];
  let changes = 0;
  surface.addEventListener('change', () => {
    changes += 1;
  });
  const result = renderUiSpec(spec(action), {
    catalog,
    onAction: (event) => actions.push(event),
    surface,
  });
  expect(result).toEqual({ diagnostics: [], ok: true });
  const control = surface.querySelector('acme-toggle');
  if (!(control instanceof AcmeToggle)) {
    throw new Error('acme-toggle did not render');
  }
  return { actions, changes: () => changes, control };
};

describe('guarded renderer — action-bound native controls in Chromium', () => {
  it('S17 baseline: a control without an action toggles on pointer activation', async () => {
    const { control } = mount(false);
    await userEvent.click(control);
    expect(control.checked).toBe(true);
  });

  it('S17 an action-bound control toggles on pointer activation and reports its live state', async () => {
    const { actions, changes, control } = mount(true);
    await userEvent.click(control);
    expect(control.checked).toBe(true);
    expect(changes()).toBe(1);
    expect(actions).toEqual([
      { action: 'pick', data: { checked: true, name: 'ok' }, path: 'root' },
    ]);

    await userEvent.click(control);
    expect(control.checked).toBe(false);
    expect(actions).toHaveLength(2);
    expect(actions[1]?.data).toEqual({ checked: false, name: 'ok' });
  });

  it('S17 an action-bound control toggles from the keyboard and reports its live state', async () => {
    const { actions, control } = mount(true);
    control.focusControl();
    await userEvent.keyboard(' ');
    expect(control.checked).toBe(true);
    expect(actions).toEqual([
      { action: 'pick', data: { checked: true, name: 'ok' }, path: 'root' },
    ]);
  });
});
