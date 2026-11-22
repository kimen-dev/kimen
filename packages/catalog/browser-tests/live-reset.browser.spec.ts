// @spec:155-live-surface-reset-focus
// S9 and S10 in a real engine: the person types into a field, presses the
// button whose action collects it, and the agent resets the field. A field
// whose `value` attribute feeds its live value, as a Stencil prop does, must
// end up empty on screen after the reset, and keep text typed after the
// delivery when the reset is rejected. Test-local elements keep this suite
// free of @kimen/elements (module boundaries: scope:catalog); the real number
// and date fields of S12 run in the MCP Apps adapter's browser suite.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  type Catalog,
  createCatalog,
  createLiveSurface,
  type LiveActionEvent,
  type LiveSurface,
} from '../src/index.js';

class AcmeEntry extends HTMLElement {
  static readonly observedAttributes = ['value'];
  readonly input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.input = document.createElement('input');
    root.append(this.input);
  }

  attributeChangedCallback(_: string, __: string | null, value: string | null): void {
    this.input.value = value ?? '';
  }

  get value(): string {
    return this.input.value;
  }

  set value(next: string) {
    this.input.value = next;
  }
}

let catalog: Catalog;

beforeAll(() => {
  customElements.define('acme-entry', AcmeEntry);
  customElements.define('acme-button', class extends HTMLElement {});
  const entry = (tag: string, props: Record<string, { type: 'string'; default?: string }>) => ({
    description: `Test-local ${tag}.`,
    events: {},
    props: Object.fromEntries(
      Object.entries(props).map(([name, constraint]) => [
        name,
        { ...constraint, description: name },
      ]),
    ),
    slots: { '': 'Content.' },
    tag,
    whenNotToUse: 'Never in production.',
    whenToUse: 'Browser tests.',
  });
  const created = createCatalog({
    components: {
      'acme-button': entry('acme-button', { variant: { type: 'string' } }),
      'acme-entry': entry('acme-entry', { value: { default: '', type: 'string' } }),
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

/** The field "title" and the button "add" that collects it; no override permission. */
const mount = (): { actions: LiveActionEvent[]; live: LiveSurface; title: AcmeEntry } => {
  const actions: LiveActionEvent[] = [];
  const live = createLiveSurface({
    actions: ['add'],
    catalog,
    onAction: (event) => actions.push(event),
    surface,
  });
  const result = live.apply({
    ops: [
      { node: { component: 'acme-entry', id: 'title' }, op: 'insert' },
      {
        node: {
          action: 'add',
          collect: { title: 'title' },
          component: 'acme-button',
          id: 'add',
          slots: { '': ['Add'] },
        },
        op: 'insert',
      },
    ],
  });
  expect(result.ok).toBe(true);
  const title = surface.querySelector('acme-entry');
  if (!(title instanceof AcmeEntry)) {
    throw new Error('the field did not render');
  }
  return { actions, live, title };
};

/** The person types "Buy milk" and presses Add, with the keyboard and pointer of a real engine. */
const deliverBuyMilk = async (title: AcmeEntry, actions: readonly LiveActionEvent[]) => {
  await userEvent.click(title.input);
  await userEvent.keyboard('Buy milk');
  const add = surface.querySelector('acme-button');
  if (add === null) {
    throw new Error('no Add button');
  }
  await userEvent.click(add);
  expect(actions.map(({ data }) => data)).toEqual([{ title: 'Buy milk' }]);
};

describe('155 — a reset clears only what an action already delivered, in Chromium', () => {
  it('S9 after an action delivered a field’s text, a reset empties the field on screen', async () => {
    const { actions, live, title } = mount();
    await deliverBuyMilk(title, actions);

    const result = live.apply({ ops: [{ id: 'title', op: 'reset' }] });

    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(title.input.value).toBe('');
  });

  it('S10 a reset after the person typed again is rejected and keeps the new text on screen', async () => {
    const { actions, live, title } = mount();
    await deliverBuyMilk(title, actions);
    await userEvent.clear(title.input);
    await userEvent.keyboard('Buy bread');
    expect(title.input.value).toBe('Buy bread');

    const result = live.apply({ ops: [{ id: 'title', op: 'reset' }] });

    expect(result).toMatchObject({
      diagnostics: [{ path: 'ops[0].id', rule: 'unsent-user-input' }],
      ok: false,
      revision: 1,
    });
    expect(title.input.value).toBe('Buy bread');
    expect(JSON.stringify(result)).not.toContain('Buy bread');
  });
});
