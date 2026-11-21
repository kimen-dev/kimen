// @spec:159-live-surface-unsent-input
// S1 and S5 in a real engine: the person types into a field whose `value`
// attribute feeds its live value, as a Stencil prop does (`ki-input` watches
// it and writes the native input). A `set` that agreed with the person must
// not let a later `set` put other text on screen, and no rejection may carry
// the typed text. Test-local elements keep this suite free of
// @kimen/elements (module boundaries: scope:catalog).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { type Catalog, createCatalog, createLiveSurface, type LiveSurface } from '../src/index.js';

class AcmeEntry extends HTMLElement {
  static readonly observedAttributes = ['value'];
  readonly #input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.#input = document.createElement('input');
    root.append(this.#input);
  }

  attributeChangedCallback(_: string, __: string | null, value: string | null): void {
    this.#input.value = value ?? '';
  }

  get value(): string {
    return this.#input.value;
  }

  set value(next: string) {
    this.#input.value = next;
  }
}

let catalog: Catalog;

beforeAll(() => {
  customElements.define('acme-entry', AcmeEntry);
  customElements.define('acme-box', class extends HTMLElement {});
  const entry = (tag: string, props: Record<string, { type: 'string' }>) => ({
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
      'acme-box': entry('acme-box', { tone: { type: 'string' } }),
      'acme-entry': entry('acme-entry', { value: { type: 'string' } }),
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

const box = () => ({
  component: 'acme-box',
  id: 'card',
  slots: { '': [{ component: 'acme-entry', id: 'note' }] },
});

/** The person types "Buy milk" into "note" and sends nothing. */
const typed = async () => {
  const live: LiveSurface = createLiveSurface({ catalog, surface });
  expect(live.apply({ ops: [{ node: box(), op: 'insert' }] }).ok).toBe(true);
  const field = surface.querySelector('acme-entry');
  if (!(field instanceof AcmeEntry)) {
    throw new Error('field missing');
  }
  await userEvent.click(field);
  await userEvent.keyboard('Buy milk');
  expect(field.value).toBe('Buy milk');
  return { field, live };
};

describe("159 — the person's unsent text in Chromium", () => {
  it('S1 after a set agreed with the field "note", setting other text is still rejected', async () => {
    const { field, live } = await typed();
    expect(live.apply({ ops: [{ id: 'note', op: 'set', props: { value: 'Buy milk' } }] }).ok).toBe(
      true,
    );

    const result = live.apply({ ops: [{ id: 'note', op: 'set', props: { value: 'Buy bread' } }] });

    expect(field.value).toBe('Buy milk');
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual([
      'user-state-conflict',
    ]);
    expect(document.activeElement).toBe(field);
  });

  it('S5 no rejection that protects the typed text repeats it', async () => {
    const { field, live } = await typed();
    const batches = [
      { ops: [{ id: 'note', op: 'set', props: { value: 'Buy bread' } }] },
      { ops: [{ force: true, id: 'note', op: 'set', props: { value: 'Buy bread' } }] },
      { ops: [{ id: 'card', op: 'remove' }] },
      { ops: [{ force: true, id: 'card', node: box(), op: 'replace' }] },
    ];

    const results = batches.map((batch) => live.apply(batch));

    expect(results.map((result) => result.diagnostics.map(({ rule }) => rule))).toEqual([
      ['user-state-conflict'],
      ['user-state-override-denied'],
      ['user-state-conflict'],
      ['user-state-override-denied'],
    ]);
    expect(JSON.stringify(results)).not.toContain('Buy milk');
    expect(field.value).toBe('Buy milk');
  });
});
