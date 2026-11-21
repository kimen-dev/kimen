// @spec:155-live-surface-reset-focus
// Where keyboard focus lands after a live batch, in a real engine: a batch's
// focus repairs focus the change left nowhere, also when a closing dialog
// drops it a task after the batch, and never takes focus from where the
// person is; the replacement of a focused node keeps it. A forced removal of a
// number empties the field. Test-local elements mirror the Kimen components
// whose behavior matters here (a button that delegates focus, a dialog that
// returns focus late, a number field whose value is a property) and keep this
// suite free of @kimen/elements (module boundaries: scope:catalog).
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  type Catalog,
  createCatalog,
  createLiveSurface,
  type LiveSurface,
  type LiveSurfaceOptions,
  type UiSpecNode,
} from '../src/index.js';

// A button whose host delegates focus to the native button it renders, as
// ki-button does.
class ProbeButton extends HTMLElement {
  readonly button: HTMLButtonElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.append(document.createElement('slot'));
    root.append(this.button);
  }
}

// A text field, as in live-surface.browser.spec.ts.
class ProbeField extends HTMLElement {
  readonly input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.input = document.createElement('input');
    root.append(this.input);
  }

  get value(): string {
    return this.input.value;
  }

  set value(next: string) {
    this.input.value = next;
  }
}

// The ki-number-input pattern: `value` is a number property with no default
// and no attribute reflection; what the person types reaches it on input.
class ProbeNumber extends HTMLElement {
  readonly input: HTMLInputElement;
  #value: number | undefined;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.input = document.createElement('input');
    this.input.inputMode = 'numeric';
    root.append(this.input);
    this.input.addEventListener('input', () => {
      const parsed = Number.parseFloat(this.input.value);
      this.#value = Number.isFinite(parsed) ? parsed : undefined;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
  }

  get value(): number | undefined {
    return this.#value;
  }

  set value(next: number | undefined) {
    this.#value = next;
    this.input.value = next === undefined ? '' : String(next);
  }
}

// The ki-dialog pattern, with an exit transition: a mutation observer on the
// host's `open` attribute drives a native modal dialog that focuses its
// confirm button. Closing keeps focus in the dialog for two frames after the
// batch returned; then a dialog that still holds focus hands it to the page
// body, as ki-dialog does when the control that opened it is gone.
class ProbeDialog extends HTMLElement {
  readonly dialog: HTMLDialogElement;
  readonly confirm: HTMLButtonElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this.dialog = document.createElement('dialog');
    this.confirm = document.createElement('button');
    this.confirm.type = 'button';
    this.confirm.textContent = 'Yes, delete';
    this.dialog.append(this.confirm);
    root.append(this.dialog);
    new MutationObserver(() => {
      this.sync();
    }).observe(this, { attributeFilter: ['open'], attributes: true });
  }

  connectedCallback(): void {
    this.sync();
  }

  private sync(): void {
    if (this.hasAttribute('open') && !this.dialog.open && this.isConnected) {
      this.dialog.showModal();
    } else if (!this.hasAttribute('open') && this.dialog.open) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.dialog.close();
          if (document.activeElement === this) {
            document.body.tabIndex = -1;
            document.body.focus({ preventScroll: true });
            document.body.removeAttribute('tabindex');
          }
        });
      });
    }
  }
}

const entry = (
  tag: string,
  props: Record<string, { type: 'boolean' | 'number' | 'string' }>,
  events: Record<string, string> = {},
) => ({
  description: `Test-local ${tag}.`,
  events,
  props: Object.fromEntries(
    Object.entries(props).map(([name, constraint]) => [name, { ...constraint, description: name }]),
  ),
  slots: { '': 'Content.' },
  tag,
  whenNotToUse: 'Never in production.',
  whenToUse: 'Browser tests.',
});

let catalog: Catalog;

beforeAll(() => {
  customElements.define('probe-button', ProbeButton);
  customElements.define('probe-field', ProbeField);
  customElements.define('probe-number', ProbeNumber);
  customElements.define('probe-dialog', ProbeDialog);
  customElements.define('probe-row', class extends HTMLElement {});
  customElements.define('probe-list', class extends HTMLElement {});
  const created = createCatalog({
    components: {
      'probe-button': entry('probe-button', {}),
      'probe-dialog': entry('probe-dialog', { open: { type: 'boolean' } }),
      'probe-field': entry(
        'probe-field',
        { value: { type: 'string' } },
        {
          change: 'Fired after the person commits an edit.',
        },
      ),
      'probe-list': entry('probe-list', {}),
      'probe-number': entry('probe-number', { value: { type: 'number' } }),
      'probe-row': entry('probe-row', {}),
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

afterEach(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

/** A task row: its title and its Delete button, addressable as `del-<id>`. */
const row = (id: string, title: string): UiSpecNode => ({
  component: 'probe-row',
  id,
  slots: {
    '': [title, { component: 'probe-button', id: `del-${id}`, slots: { '': ['Delete'] } }],
  },
});

const board = (): UiSpecNode[] => [
  { component: 'probe-field', id: 'title' },
  {
    component: 'probe-list',
    id: 'tasks',
    slots: { '': [row('t1', 'Buy milk'), row('t2', 'Call mum'), row('t3', 'Water the plants')] },
  },
  { component: 'probe-dialog', id: 'confirm' },
];

const mount = (options: Partial<LiveSurfaceOptions> = {}): LiveSurface => {
  const live = createLiveSurface({ catalog, surface, ...options });
  expect(live.apply({ ops: board().map((node) => ({ node, op: 'insert' })) }).ok).toBe(true);
  return live;
};

const one = <T extends Element>(selector: string, type: new () => T): T => {
  const found = surface.querySelector(selector);
  if (!(found instanceof type)) {
    throw new Error(`${selector} missing`);
  }
  return found;
};

/** The Delete button of the task row with this title. */
const deleteOf = (title: string): ProbeButton => {
  const found = Array.from(surface.querySelectorAll('probe-row'))
    .find((task) => task.firstChild?.textContent === title)
    ?.querySelector('probe-button');
  if (!(found instanceof ProbeButton)) {
    throw new Error(`Delete button of "${title}" missing`);
  }
  return found;
};

/** Resolves after `count` rendered frames: enough for any repair to have run. */
const frames = async (count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

describe('155 — a batch repairs lost focus and never takes it', () => {
  it('S1 when a batch removes the focused row, focus goes to the Delete button the batch names', async () => {
    const live = mount();
    const target = deleteOf('Water the plants');
    await userEvent.click(deleteOf('Call mum'));
    expect(document.activeElement).toBe(deleteOf('Call mum'));

    const result = live.apply({ focus: 'del-t3', ops: [{ id: 't2', op: 'remove' }] });
    expect(result.ok).toBe(true);
    await expect.poll(() => document.activeElement).toBe(target);
    expect(target.shadowRoot?.activeElement).toBe(target.button);
  });

  it('S1 when a confirmed dialog closes and the row goes, focus goes to the Delete button the batch names', async () => {
    // The keyboard alone: Tab to the Delete button, Enter asks, Enter confirms.
    const live = mount();
    const target = deleteOf('Water the plants');
    const dialog = one('probe-dialog', ProbeDialog);
    await userEvent.keyboard('{Tab}{Tab}{Tab}');
    expect(document.activeElement).toBe(deleteOf('Call mum'));
    await userEvent.keyboard('{Enter}');
    // The dispatcher answers the request by opening the dialog.
    expect(live.apply({ ops: [{ id: 'confirm', op: 'set', props: { open: true } }] }).ok).toBe(
      true,
    );
    await expect.poll(() => dialog.shadowRoot?.activeElement).toBe(dialog.confirm);
    await userEvent.keyboard('{Enter}');

    // It answers the confirmation: close the dialog first, then remove the row.
    const result = live.apply({
      focus: 'del-t3',
      ops: [
        { id: 'confirm', op: 'set', props: { open: false } },
        { id: 't2', op: 'remove' },
      ],
    });
    expect(result.ok).toBe(true);
    await expect.poll(() => document.activeElement).toBe(target);
    // The dialog's late hand-off to the body never takes it back.
    await frames(12);
    expect(document.activeElement).toBe(target);
    // The next key press continues from there, not from the top of the page.
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(deleteOf('Buy milk'));
  });

  it("S2 a batch's focus never takes focus from the surface's field the person is typing in", async () => {
    const live = mount();
    const field = one('probe-field', ProbeField);
    await userEvent.click(field);
    await userEvent.keyboard('Buy milk');

    expect(live.apply({ focus: 'del-t3', ops: [{ id: 't2', op: 'remove' }] }).ok).toBe(true);
    await frames(12);
    expect(document.activeElement).toBe(field);
    expect(field.shadowRoot?.activeElement).toBe(field.input);
    expect(field.value).toBe('Buy milk');
  });

  it("S2 a batch's focus never takes focus from the host page's own message box", async () => {
    const live = mount();
    const message = document.createElement('textarea');
    message.setAttribute('aria-label', 'Message');
    document.body.append(message);
    await userEvent.click(message);
    await userEvent.keyboard('Buy milk');

    expect(live.apply({ focus: 'del-t3', ops: [{ id: 't2', op: 'remove' }] }).ok).toBe(true);
    await frames(12);
    expect(document.activeElement).toBe(message);
    expect(message.value).toBe('Buy milk');
  });

  it('S4 replacing the node that has focus leaves focus on its replacement', async () => {
    const live = createLiveSurface({ catalog, surface });
    const follow = (label: string): UiSpecNode => ({
      component: 'probe-button',
      id: 'follow',
      slots: { '': [label] },
    });
    expect(live.apply({ ops: [{ node: follow('Follow'), op: 'insert' }] }).ok).toBe(true);
    const before = one('probe-button', ProbeButton);
    await userEvent.click(before);
    expect(document.activeElement).toBe(before);

    expect(
      live.apply({ ops: [{ id: 'follow', node: follow('Following'), op: 'replace' }] }).ok,
    ).toBe(true);
    const after = one('probe-button', ProbeButton);
    expect(after).not.toBe(before);
    expect(after.textContent).toBe('Following');
    await expect.poll(() => document.activeElement).toBe(after);
  });

  it('S4 a replacement keeps focus only while focus is nowhere: the batch focus wins', async () => {
    const live = mount();
    await userEvent.click(deleteOf('Call mum'));
    expect(
      live.apply({
        focus: 'del-t3',
        ops: [{ id: 't2', node: row('t2', 'Call dad'), op: 'replace' }],
      }).ok,
    ).toBe(true);
    await expect.poll(() => document.activeElement).toBe(deleteOf('Water the plants'));
  });
});

describe('155 — a forced removal of a value empties the field', () => {
  it('S5 a forced removal of a number the person typed empties the number field', async () => {
    const live = createLiveSurface({ allowUserStateOverride: true, catalog, surface });
    expect(
      live.apply({ ops: [{ node: { component: 'probe-number', id: 'quantity' }, op: 'insert' }] })
        .ok,
    ).toBe(true);
    const quantity = one('probe-number', ProbeNumber);
    await userEvent.click(quantity);
    await userEvent.keyboard('42');
    expect(quantity.value).toBe(42);

    const result = live.apply({
      ops: [{ force: true, id: 'quantity', op: 'set', props: { value: null } }],
    });
    expect(result.ok).toBe(true);
    expect(quantity.value).toBeUndefined();
    expect(quantity.input.value).toBe('');
  });
});
