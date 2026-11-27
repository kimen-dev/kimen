// @spec:153-action-collect
// @spec:170-emitter-strict-collection
// The validity gate of a collecting node (spec 153 FR-003) in a real engine:
// constraint validation, `:invalid`, the `invalid` event and delegated focus
// are what happy-dom cannot prove. Test-local form-associated elements keep
// this suite free of @kimen/elements (module boundaries: scope:catalog).
// Each reports validity the way its Kimen counterpart does today: the text
// field answers `reportValidity()` like ki-input, while the number, date and
// choice fields offer no public `reportValidity()`, like ki-number-input,
// ki-date-picker and ki-combobox.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  type ActionEvent,
  type Catalog,
  createCatalog,
  createLiveSurface,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

/** A labelled native text input in a shadow root, form-associated, focus delegated. */
abstract class AcmeFieldBase extends HTMLElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['label', 'required'];
  readonly input: HTMLInputElement;
  protected readonly internals: ElementInternals;
  readonly #caption: HTMLSpanElement;
  readonly #message: HTMLSpanElement;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    const label = document.createElement('label');
    this.#caption = document.createElement('span');
    this.input = document.createElement('input');
    this.input.type = 'text';
    label.append(this.#caption, this.input);
    this.#message = document.createElement('span');
    root.append(label, this.#message);
    this.input.addEventListener('input', () => {
      this.sync();
    });
    // The field shows its own message when it is asked and found invalid.
    this.addEventListener('invalid', () => {
      this.#message.textContent = this.internals.validationMessage;
    });
  }

  connectedCallback(): void {
    this.sync();
  }

  attributeChangedCallback(name: string, _: string | null, value: string | null): void {
    if (name === 'label') {
      this.#caption.textContent = value ?? '';
    } else {
      this.input.required = value !== null;
    }
    this.sync();
  }

  /** The validation message the field shows next to itself. */
  get shownMessage(): string {
    return this.#message.textContent;
  }

  protected abstract sync(): void;
}

/** A text control without a public validity method (the ki-combobox case). */
class AcmeChoice extends AcmeFieldBase {
  get value(): string {
    return this.input.value;
  }

  protected sync(): void {
    this.internals.setValidity(this.input.validity, this.input.validationMessage, this.input);
  }
}

/** A text field that answers `reportValidity()` (the ki-input case). */
class AcmeText extends AcmeChoice {
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
  }
}

/** Free text that must parse; `badInput` when it does not. */
abstract class AcmeParsedField<T> extends AcmeFieldBase {
  protected abstract parse(text: string): T | undefined;

  get value(): T | undefined {
    return this.parse(this.input.value.trim());
  }

  protected sync(): void {
    const text = this.input.value.trim();
    const badInput = text !== '' && this.value === undefined;
    const valueMissing = this.input.required && text === '';
    if (badInput || valueMissing) {
      this.internals.setValidity(
        { badInput, valueMissing },
        badInput ? 'Enter a valid value.' : 'Fill out this field.',
        this.input,
      );
    } else {
      this.internals.setValidity({});
    }
  }
}

class AcmeNumber extends AcmeParsedField<number> {
  protected parse(text: string): number | undefined {
    const value = Number(text);
    return text !== '' && Number.isFinite(value) ? value : undefined;
  }
}

class AcmeDate extends AcmeParsedField<string> {
  protected parse(text: string): string | undefined {
    return /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : undefined;
  }
}

const entry = (
  tag: string,
  props: Record<string, 'boolean' | 'number' | 'string'>,
  events: Record<string, string> = {},
) => ({
  description: `Test-local ${tag}.`,
  // A catalog definition is a data tree: no object is shared between entries.
  events: { ...events },
  props: Object.fromEntries(
    Object.entries(props).map(([name, type]) => [name, { description: name, type }]),
  ),
  slots: { '': 'Content.' },
  tag,
  whenNotToUse: 'Never in production.',
  whenToUse: 'Browser tests.',
});

const field = { label: 'string', required: 'boolean' } as const;
const changes = { change: 'Fired after the user commits an edit.' };

let catalog: Catalog;

beforeAll(() => {
  document.head.append(
    Object.assign(document.createElement('style'), {
      textContent: 'acme-stack{display:flex;flex-direction:column}',
    }),
  );
  customElements.define('acme-text', AcmeText);
  customElements.define('acme-choice', AcmeChoice);
  customElements.define('acme-number', AcmeNumber);
  customElements.define('acme-date', AcmeDate);
  customElements.define('acme-button', class extends HTMLElement {});
  customElements.define('acme-stack', class extends HTMLElement {});
  const created = createCatalog({
    components: {
      'acme-button': entry('acme-button', { variant: 'string' }),
      'acme-choice': entry('acme-choice', { ...field, value: 'string' }, changes),
      'acme-date': entry('acme-date', { ...field, value: 'string' }, changes),
      'acme-number': entry('acme-number', { ...field, value: 'number' }, changes),
      'acme-stack': entry('acme-stack', {}),
      'acme-text': entry('acme-text', { ...field, value: 'string' }, changes),
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

interface Field {
  readonly id: string;
  readonly component: 'acme-choice' | 'acme-date' | 'acme-number' | 'acme-text';
  readonly label: string;
  readonly required?: boolean;
}

/**
 * Renders the fields and an "Add" button that collects each of them by its
 * id, in document order unless `collectOrder` lists the ids otherwise.
 */
const mount = (
  fields: readonly Field[],
  collectOrder: readonly string[] = fields.map(({ id }) => id),
): ActionEvent[] => {
  const actions: ActionEvent[] = [];
  const result = renderUiSpec(
    {
      actions: ['add'],
      root: {
        component: 'acme-stack',
        slots: {
          '': [
            ...fields.map(({ component, id, label, required }) => ({
              component,
              id,
              props: { label, ...(required === true ? { required } : {}) },
            })),
            {
              action: 'add',
              collect: Object.fromEntries(collectOrder.map((id) => [id, id])),
              component: 'acme-button',
              props: { variant: 'primary' },
              slots: { '': ['Add'] },
            },
          ],
        },
      },
      version: 1,
    },
    { catalog, onAction: (event) => actions.push(event), surface },
  );
  expect(result).toEqual({ diagnostics: [], ok: true });
  return actions;
};

const byLabel = (label: string): AcmeFieldBase => {
  const found = [
    ...surface.querySelectorAll<AcmeFieldBase>('acme-text, acme-choice, acme-number, acme-date'),
  ];
  const match = found.find((element) => element.getAttribute('label') === label);
  if (match === undefined) {
    throw new Error(`no field labelled ${label}`);
  }
  return match;
};

const typeInto = async (label: string, text: string): Promise<void> => {
  await userEvent.click(byLabel(label).input);
  await userEvent.keyboard(text);
};

const activateAdd = async (): Promise<void> => {
  const button = surface.querySelector('acme-button');
  if (button === null) {
    throw new Error('no Add button');
  }
  await userEvent.click(button);
};

describe('a collecting node asks every field for validity before its action leaves', () => {
  it('S5 reports one save action with the live collected values and leaves the host form alone', async () => {
    const hostForm = document.createElement('form');
    let submissions = 0;
    hostForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });
    surface.replaceWith(hostForm);
    hostForm.append(surface);
    const spec = {
      actions: ['save'],
      root: {
        component: 'acme-stack',
        slots: {
          '': [
            { component: 'acme-text', id: 'f-name', props: { label: 'Name' } },
            { component: 'acme-choice', id: 'f-region', props: { label: 'Region' } },
            { component: 'acme-text', id: 'f-notes', props: { label: 'Notes' } },
            {
              action: 'save',
              collect: { customerName: 'f-name', region: 'f-region', notes: 'f-notes' },
              component: 'acme-button',
              id: 'save-button',
              slots: { '': ['Save'] },
            },
          ],
        },
      },
      version: 1,
    };
    expect(validateUiSpec(spec, { catalog }).ok).toBe(true);
    const actions: ActionEvent[] = [];
    expect(
      renderUiSpec(spec, {
        budgets: { maxActionBurst: 1 },
        catalog,
        onAction: (action) => actions.push(action),
        surface,
      }).ok,
    ).toBe(true);
    await typeInto('Name', 'Ana');
    await typeInto('Region', 'Madrid');
    await typeInto('Notes', 'Pickup after 5');

    const hostButton = surface.querySelector('acme-button');
    if (hostButton === null) throw new Error('no Save button');
    const nativeButton = document.createElement('button');
    nativeButton.type = 'button';
    nativeButton.textContent = hostButton.textContent;
    hostButton.replaceChildren(nativeButton);
    await userEvent.click(nativeButton);

    expect(actions).toEqual([
      {
        action: 'save',
        id: 'save-button',
        data: { customerName: 'Ana', region: 'Madrid', notes: 'Pickup after 5' },
        path: 'root.slots.[3]',
      },
    ]);
    expect(submissions).toBe(0);
  });

  it('S1 baseline in Chromium: valid fields deliver their typed values', async () => {
    const actions = mount([
      { component: 'acme-text', id: 'title', label: 'Title', required: true },
      { component: 'acme-number', id: 'quantity', label: 'Quantity' },
    ]);
    await typeInto('Title', 'Buy milk');
    await typeInto('Quantity', '2');

    await activateAdd();

    expect(actions.map((event) => event.data)).toEqual([
      { quantity: 2, title: 'Buy milk', variant: 'primary' },
    ]);
  });

  it('S4 required collected fields left empty block the action and show their messages', async () => {
    const actions = mount([
      { component: 'acme-text', id: 'title', label: 'Title', required: true },
      { component: 'acme-text', id: 'owner', label: 'Owner', required: true },
    ]);

    await activateAdd();

    expect(actions).toEqual([]);
    expect(byLabel('Title').shownMessage).not.toBe('');
    expect(byLabel('Owner').shownMessage).not.toBe('');
    expect(document.activeElement).toBe(byLabel('Title'));
  });

  it('S4 the focus goes to the first invalid field in document order, whatever the collect order', async () => {
    // Neither this order, its reverse nor its sorted keys start with Title.
    const actions = mount(
      [
        { component: 'acme-text', id: 'title', label: 'Title', required: true },
        { component: 'acme-text', id: 'owner', label: 'Owner', required: true },
        { component: 'acme-text', id: 'notes', label: 'Notes', required: true },
      ],
      ['owner', 'title', 'notes'],
    );

    await activateAdd();

    expect(actions).toEqual([]);
    expect(document.activeElement).toBe(byLabel('Title'));
  });

  it('S13 only the field that takes the focus opens the browser bubble; every invalid field shows its message', async () => {
    // An engine shows one validation bubble at a time, and with several
    // `reportValidity()` calls in a row Chromium leaves it on a field other
    // than the focused one (found in the Claude desktop app, 2026-11-24).
    const actions = mount(
      [
        { component: 'acme-text', id: 'title', label: 'Title', required: true },
        { component: 'acme-text', id: 'owner', label: 'Owner', required: true },
        { component: 'acme-text', id: 'notes', label: 'Notes', required: true },
      ],
      ['owner', 'title', 'notes'],
    );
    const reported: string[] = [];
    for (const label of ['Title', 'Owner', 'Notes']) {
      const field = byLabel(label);
      if (!(field instanceof AcmeText)) {
        throw new Error(`${label} is not a text field`);
      }
      const report = field.reportValidity.bind(field);
      field.reportValidity = (): boolean => {
        reported.push(label);
        return report();
      };
    }

    await activateAdd();

    expect(actions).toEqual([]);
    expect(reported).toEqual(['Title']);
    expect(document.activeElement).toBe(byLabel('Title'));
    for (const label of ['Title', 'Owner', 'Notes']) {
      expect(byLabel(label).shownMessage).not.toBe('');
    }
  });

  it('S4 a live surface asks its collected fields too', async () => {
    const actions: ActionEvent[] = [];
    const live = createLiveSurface({
      actions: ['add'],
      catalog,
      onAction: (event) => actions.push(event),
      surface,
    });
    const applied = live.apply({
      ops: [
        {
          node: { component: 'acme-text', id: 'title', props: { label: 'Title', required: true } },
          op: 'insert',
        },
        {
          node: {
            action: 'add',
            collect: { title: 'title' },
            component: 'acme-button',
            slots: { '': ['Add'] },
          },
          op: 'insert',
        },
      ],
    });
    expect(applied.ok).toBe(true);

    await activateAdd();

    expect(actions).toEqual([]);
    expect(byLabel('Title').shownMessage).not.toBe('');
    expect(document.activeElement).toBe(byLabel('Title'));
  });

  it('S5 text that is not a number in a collected number field blocks the action', async () => {
    const actions = mount([{ component: 'acme-number', id: 'quantity', label: 'Quantity' }]);
    await typeInto('Quantity', 'two');
    await userEvent.click(document.body);

    await activateAdd();

    expect(actions).toEqual([]);
    expect(document.activeElement).toBe(byLabel('Quantity'));
  });

  it('S6 text that is not a date in a collected date field blocks the action', async () => {
    const actions = mount([{ component: 'acme-date', id: 'due', label: 'Due' }]);
    await typeInto('Due', 'tomorrow');
    await userEvent.click(document.body);

    await activateAdd();

    expect(actions).toEqual([]);
    expect(document.activeElement).toBe(byLabel('Due'));
  });

  it('S11 an invalid collected control that cannot show its message on request still blocks the action', async () => {
    const actions = mount([
      { component: 'acme-choice', id: 'assignee', label: 'Assignee', required: true },
    ]);
    expect('reportValidity' in byLabel('Assignee')).toBe(false);

    await activateAdd();

    expect(actions).toEqual([]);
    expect(document.activeElement).toBe(byLabel('Assignee'));
  });
});
