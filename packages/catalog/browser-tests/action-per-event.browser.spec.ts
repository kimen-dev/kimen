// @spec:154-action-per-event
// A binding per event in a real engine (spec 154 FR-003): the click on a
// node bound per event is claimed, so an enclosing bound node never fires for
// it, and never cancelled, so a native-backed control stays operable; and
// each bound event asks its collected fields for validity first. Test-local
// elements keep this suite free of @kimen/elements (module boundaries:
// scope:catalog).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { type ActionEvent, type Catalog, createCatalog, renderUiSpec } from '../src/index.js';

/**
 * The ki-time-input case: a native-backed control that declares two events,
 * so only a binding per event can bind it. Its native change is re-dispatched
 * composed, and `checked` mirrors the native state.
 */
class AcmeToggle extends HTMLElement {
  readonly #input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
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
}

/** The ki-confirmation case: two answers, each reported as its own event. */
class AcmeConfirm extends HTMLElement {
  answer(event: 'acme-approve' | 'acme-deny'): void {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
  }
}

/** The ki-input case: a required text field that answers `reportValidity()`. */
class AcmeText extends HTMLElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['label', 'required'];
  readonly input: HTMLInputElement;
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    const label = document.createElement('label');
    this.input = document.createElement('input');
    label.append(this.input);
    root.append(label);
    this.input.addEventListener('input', () => {
      this.#sync();
    });
  }

  connectedCallback(): void {
    this.#sync();
  }

  attributeChangedCallback(name: string, _: string | null, value: string | null): void {
    if (name === 'label') {
      this.input.setAttribute('aria-label', value ?? '');
    } else {
      this.input.required = value !== null;
    }
    this.#sync();
  }

  get value(): string {
    return this.input.value;
  }

  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  #sync(): void {
    this.#internals.setValidity(this.input.validity, this.input.validationMessage, this.input);
  }
}

const entry = (
  tag: string,
  props: Record<string, 'boolean' | 'string'>,
  events: Record<string, string> = {},
) => ({
  description: `Test-local ${tag}.`,
  events: { ...events },
  props: Object.fromEntries(
    Object.entries(props).map(([name, type]) => [name, { description: name, type }]),
  ),
  slots: { '': 'Content.' },
  tag,
  whenNotToUse: 'Never in production.',
  whenToUse: 'Browser tests.',
});

let catalog: Catalog;

beforeAll(() => {
  customElements.define('acme-toggle', AcmeToggle);
  customElements.define('acme-confirm', AcmeConfirm);
  customElements.define('acme-text', AcmeText);
  customElements.define('acme-panel', class extends HTMLElement {});
  const created = createCatalog({
    components: {
      'acme-confirm': entry(
        'acme-confirm',
        { heading: 'string' },
        { 'acme-approve': 'Approved.', 'acme-deny': 'Denied.' },
      ),
      'acme-panel': entry('acme-panel', {}),
      'acme-text': entry(
        'acme-text',
        { label: 'string', required: 'boolean', value: 'string' },
        { change: 'Committed edit.' },
      ),
      'acme-toggle': entry(
        'acme-toggle',
        { checked: 'boolean', name: 'string' },
        { 'acme-reset': 'Back to the default.', change: 'Committed toggle.' },
      ),
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

const render = (root: unknown, actions: readonly string[]): ActionEvent[] => {
  const received: ActionEvent[] = [];
  const result = renderUiSpec(
    { actions, root, version: 1 },
    { catalog, onAction: (event) => received.push(event), surface },
  );
  expect(result).toEqual({ diagnostics: [], ok: true });
  return received;
};

const rendered = <T extends Element>(selector: string, type: new () => T): T => {
  const element = surface.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`${selector} did not render`);
  }
  return element;
};

describe('a binding per event in Chromium', () => {
  it('S5 a control bound per event stays operable and its click never reaches an enclosing binding', async () => {
    const actions = render(
      {
        action: 'outer',
        component: 'acme-panel',
        slots: {
          '': [
            {
              action: { change: 'picked' },
              component: 'acme-toggle',
              props: { name: 'ok' },
              slots: { '': ['OK'] },
            },
          ],
        },
      },
      ['outer', 'picked'],
    );
    const toggle = rendered('acme-toggle', AcmeToggle);

    await userEvent.click(toggle);

    expect(toggle.checked).toBe(true);
    expect(actions).toEqual([
      { action: 'picked', data: { checked: true, name: 'ok' }, path: 'root.slots.[0]' },
    ]);
  });

  it('S4 a bound event whose collected field is invalid sends nothing and focuses the field', async () => {
    const actions = render(
      {
        component: 'acme-panel',
        slots: {
          '': [
            { component: 'acme-text', id: 'f-note', props: { label: 'Note', required: true } },
            {
              action: { 'acme-approve': 'tool.approved', 'acme-deny': 'tool.denied' },
              collect: { note: 'f-note' },
              component: 'acme-confirm',
              props: { heading: 'Delete the files?' },
            },
          ],
        },
      },
      ['tool.approved', 'tool.denied'],
    );
    const note = rendered('acme-text', AcmeText);
    const card = rendered('acme-confirm', AcmeConfirm);

    card.answer('acme-deny');

    expect(actions).toEqual([]);
    expect(document.activeElement).toBe(note);

    await userEvent.keyboard('Too risky');
    card.answer('acme-deny');

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: 'tool.denied', data: { note: 'Too risky' } });
  });
});
