// @spec:035-live-surface
// S4–S6, S13, S14 in a real engine: what happy-dom cannot prove. A live
// surface batch around a field the user is typing in keeps the element, the
// focus, the caret, the typed text and the scroll position of its container;
// a full re-render with renderUiSpec (the baseline, unchanged by D1) loses
// all of them. Test-local native-backed elements keep this suite free of
// @kimen/elements (module boundaries: scope:catalog).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  type Catalog,
  createCatalog,
  createLiveSurface,
  type LiveSurface,
  type LiveSurfaceOptions,
  renderUiSpec,
} from '../src/index.js';

// A text field: native input in an open shadow root, focus delegated, its
// `value` the native input's live value, `label` mirrored from the attribute.
class AcmeField extends HTMLElement {
  static readonly observedAttributes = ['label'];
  readonly #input: HTMLInputElement;
  readonly #label: HTMLLabelElement;

  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    this.#label = document.createElement('label');
    this.#input = document.createElement('input');
    this.#label.append(document.createElement('span'), this.#input);
    root.append(this.#label);
    this.#input.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
  }

  attributeChangedCallback(_: string, __: string | null, value: string | null): void {
    const caption = this.#label.firstElementChild;
    if (caption !== null) {
      caption.textContent = value ?? '';
    }
  }

  get value(): string {
    return this.#input.value;
  }

  set value(next: string) {
    this.#input.value = next;
  }

  get input(): HTMLInputElement {
    return this.#input;
  }
}

// The ki-checkbox pattern (see activation.browser.spec.ts).
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

  set checked(value: boolean) {
    this.#input.checked = value;
  }
}

const entry = (
  tag: string,
  props: Record<string, { type: 'boolean' | 'string' }>,
  events: Record<string, string> = {},
) => ({
  description: `Test-local ${tag}.`,
  events,
  props: Object.fromEntries(
    Object.entries(props).map(([name, constraint]) => [name, { ...constraint, description: name }]),
  ),
  slots: { '': 'Content.', header: 'Heading.' },
  tag,
  whenNotToUse: 'Never in production.',
  whenToUse: 'Browser tests.',
});

let catalog: Catalog;

beforeAll(() => {
  // A real scroll container: the field and twenty block rows overflow 120px.
  const style = document.createElement('style');
  style.textContent =
    'acme-panel{display:block;block-size:120px;overflow-y:auto}' +
    'acme-row,acme-field{display:block;block-size:24px}';
  document.head.append(style);
  customElements.define('acme-field', AcmeField);
  customElements.define('acme-toggle', AcmeToggle);
  // A plain scrollable region and a plain row: no behavior of their own.
  customElements.define('acme-panel', class extends HTMLElement {});
  customElements.define('acme-row', class extends HTMLElement {});
  const created = createCatalog({
    components: {
      'acme-field': entry(
        'acme-field',
        { label: { type: 'string' }, value: { type: 'string' } },
        {
          change: 'Fired after the user commits an edit.',
        },
      ),
      'acme-panel': entry('acme-panel', { tone: { type: 'string' } }),
      'acme-row': entry('acme-row', { tone: { type: 'string' } }),
      'acme-toggle': entry(
        'acme-toggle',
        { checked: { type: 'boolean' } },
        {
          change: 'Fired once after a user toggle commits.',
        },
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

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    component: 'acme-row',
    id: `row-${String(index)}`,
    slots: { '': [`Row ${String(index)}`] },
  }));

const board = () => ({
  component: 'acme-panel',
  id: 'panel',
  slots: {
    '': [{ component: 'acme-field', id: 'note', props: { label: 'Note' } }, ...rows(20)],
    header: ['Draft'],
  },
});

const mountLive = (options: Partial<LiveSurfaceOptions> = {}): LiveSurface => {
  const live = createLiveSurface({ catalog, surface, ...options });
  expect(live.apply({ ops: [{ node: board(), op: 'insert' }] }).ok).toBe(true);
  return live;
};

const panelOf = (): HTMLElement => {
  const panel = surface.querySelector<HTMLElement>('acme-panel');
  if (panel === null) {
    throw new Error('panel missing');
  }
  return panel;
};

const fieldOf = (): AcmeField => {
  const field = surface.querySelector('acme-field');
  if (!(field instanceof AcmeField)) {
    throw new Error('field missing');
  }
  return field;
};

/** The user focuses the field, types, moves the caret and scrolls the panel. */
const userWorks = async (): Promise<{ field: AcmeField; panel: HTMLElement }> => {
  const panel = panelOf();
  const field = fieldOf();
  await userEvent.click(field);
  await userEvent.keyboard('hola');
  field.input.setSelectionRange(2, 2);
  panel.scrollTop = 40;
  expect(panel.scrollTop).toBeGreaterThan(0);
  return { field, panel };
};

const expectUntouched = (
  field: AcmeField,
  panel: HTMLElement,
  scrollTop: number,
  anchored = false,
): void => {
  expect(surface.querySelector('acme-field')).toBe(field);
  expect(surface.querySelector('acme-panel')).toBe(panel);
  expect(document.activeElement).toBe(field);
  expect(field.shadowRoot?.activeElement).toBe(field.input);
  expect(field.value).toBe('hola');
  expect(field.input.selectionStart).toBe(2);
  if (anchored) {
    // Content inserted above the viewport: Chromium's scroll anchoring may
    // move the offset FORWARD to keep the visible rows still; the surface
    // itself never resets it.
    expect(panel.scrollTop).toBeGreaterThanOrEqual(scrollTop);
  } else {
    expect(panel.scrollTop).toBe(scrollTop);
  }
};

describe('live surface — focus, typed value, caret and scroll survive batches in Chromium', () => {
  it('S4 baseline: a full renderUiSpec re-render loses the element, focus, value and scroll', async () => {
    const spec = (heading: string) => ({
      root: { ...board(), slots: { ...board().slots, header: [heading] } },
      version: 1,
    });
    expect(renderUiSpec(spec('Draft'), { catalog, surface }).ok).toBe(true);
    const { field } = await userWorks();
    expect(renderUiSpec(spec('Decided'), { catalog, surface }).ok).toBe(true);
    expect(surface.querySelector('acme-field')).not.toBe(field);
    expect(document.activeElement).not.toBe(surface.querySelector('acme-field'));
    expect(fieldOf().value).toBe('');
    expect(panelOf().scrollTop).toBe(0);
  });

  it('S4 set ops on the field and its container keep element, focus, caret, text and scroll', async () => {
    const live = mountLive();
    const { field, panel } = await userWorks();
    const scrollTop = panel.scrollTop;
    const result = live.apply({
      ops: [
        { id: 'note', op: 'set', props: { label: 'Your note' } },
        { id: 'panel', op: 'set', props: { tone: 'decided' } },
        { id: 'row-3', op: 'set', props: { tone: 'done' } },
      ],
    });
    expect(result.ok).toBe(true);
    expect(field.shadowRoot?.querySelector('span')?.textContent).toBe('Your note');
    expectUntouched(field, panel, scrollTop);
    // The focus is real: the user keeps typing where the caret was.
    await userEvent.keyboard('!');
    expect(field.value).toBe('ho!la');
  });

  it('S5 inserting rows before the field and the rows keeps focus, caret and scroll', async () => {
    const live = mountLive();
    const { field, panel } = await userWorks();
    const scrollTop = panel.scrollTop;
    const firstRow = surface.querySelector('acme-row');
    const result = live.apply({
      ops: [
        {
          before: 'note',
          node: { component: 'acme-row', id: 'top', slots: { '': ['Top'] } },
          op: 'insert',
          parent: 'panel',
        },
        {
          before: 'row-0',
          node: { component: 'acme-row', id: 'mid', slots: { '': ['Mid'] } },
          op: 'insert',
          parent: 'panel',
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(
      [...surface.querySelectorAll('acme-row')].slice(0, 3).map((row) => row.textContent),
    ).toEqual(['Top', 'Mid', 'Row 0']);
    expect(surface.querySelectorAll('acme-row')[2]).toBe(firstRow);
    expectUntouched(field, panel, scrollTop, true);
  });

  it('S6 a text op on the container heading keeps focus, caret and scroll', async () => {
    const live = mountLive();
    const { field, panel } = await userWorks();
    const scrollTop = panel.scrollTop;
    const heading = surface.querySelector('span[slot="header"]');
    expect(
      live.apply({ ops: [{ id: 'panel', op: 'text', slot: 'header', text: 'Decided' }] }).ok,
    ).toBe(true);
    expect(surface.querySelector('span[slot="header"]')).toBe(heading);
    expect(heading?.textContent).toBe('Decided');
    expectUntouched(field, panel, scrollTop);
  });

  it('S7 removing a row elsewhere keeps the field focused', async () => {
    const live = mountLive();
    const { field } = await userWorks();
    expect(live.apply({ ops: [{ id: 'row-19', op: 'remove' }] }).ok).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe('hola');
  });
});

describe("live surface — the user's ticked box in Chromium", () => {
  const tick = async (options: Partial<LiveSurfaceOptions> = {}) => {
    const live = createLiveSurface({ catalog, surface, ...options });
    expect(
      live.apply({
        ops: [
          {
            node: { component: 'acme-toggle', id: 'agree', slots: { '': ['I agree'] } },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const toggle = surface.querySelector('acme-toggle');
    if (!(toggle instanceof AcmeToggle)) {
      throw new Error('toggle missing');
    }
    await userEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    return { live, toggle };
  };

  it('S13 an agent set that would untick what the user ticked is rejected', async () => {
    const { live, toggle } = await tick();
    const result = live.apply({ ops: [{ id: 'agree', op: 'set', props: { checked: false } }] });
    expect(result.diagnostics[0]?.rule).toBe('user-state-conflict');
    expect(toggle.checked).toBe(true);
  });

  it('S14 a forced override unticks only when the host allows it', async () => {
    const denied = await tick();
    expect(
      denied.live.apply({
        ops: [{ force: true, id: 'agree', op: 'set', props: { checked: false } }],
      }).diagnostics[0]?.rule,
    ).toBe('user-state-override-denied');
    expect(denied.toggle.checked).toBe(true);

    surface.replaceChildren();
    const allowed = await tick({ allowUserStateOverride: true });
    expect(
      allowed.live.apply({
        ops: [{ force: true, id: 'agree', op: 'set', props: { checked: false } }],
      }).ok,
    ).toBe(true);
    expect(allowed.toggle.checked).toBe(false);
  });
});
