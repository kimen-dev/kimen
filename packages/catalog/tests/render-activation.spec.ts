// @spec:028-guarded-renderer
// Activation events of bound actions (FR-003, S4, S17-S19): a bound action
// fires on the activation event its catalog entry declares — never by
// cancelling the control's own change — and carries the control's live,
// catalog-declared state. happy-dom stands in for the DOM here; the real
// native-control behavior is proven in Chromium by
// browser-tests/activation.browser.spec.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ActionEvent,
  type Catalog,
  catalogData,
  createCatalog,
  createStreamingRenderer,
  renderUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const builtIn: Catalog = catalogData;

// A rendered element seen as the property bag its component exposes.
type Rendered = HTMLElement & Record<string, unknown>;

const rendered = (selector: string, index = 0): Rendered => {
  const element = surface.querySelectorAll<Rendered>(selector)[index];
  if (element === undefined) {
    throw new Error(`nothing rendered for ${selector}`);
  }
  return element;
};

const toggleSpec = (component: string): unknown => ({
  version: 1,
  actions: ['pick'],
  root: { component, action: 'pick', props: { name: 'ok' }, slots: { '': ['OK'] } },
});

const tabsSpec = (): unknown => ({
  version: 1,
  actions: ['pick'],
  root: {
    component: 'ki-tabs',
    action: 'pick',
    props: { label: 'T' },
    slots: {
      '': [
        { component: 'ki-tab', props: { value: 'a' }, slots: { '': ['A'] } },
        { component: 'ki-tab', props: { value: 'b' }, slots: { '': ['B'] } },
        { component: 'ki-tab-panel', props: { value: 'a' }, slots: { '': ['panel a'] } },
        { component: 'ki-tab-panel', props: { value: 'b' }, slots: { '': ['panel b'] } },
      ],
    },
  },
});

const click = (target: Element): MouseEvent => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(event);
  return event;
};

const change = (target: Element, type = 'change'): void => {
  target.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
};

describe('renderUiSpec — bound actions fire on the declared activation event', () => {
  it.each(['ki-checkbox', 'ki-switch'])(
    'S17 %s activates on its declared change, never cancels the toggle, and reports live checked',
    (tag) => {
      // The catalog (derived from the manifest) declares the native change.
      expect(Object.keys(builtIn.components[tag]?.events ?? {})).toEqual(['change']);
      const onAction = vi.fn<(event: ActionEvent) => void>();
      expect(renderUiSpec(toggleSpec(tag), { surface, onAction }).ok).toBe(true);
      const control = rendered(tag);

      // The user's click reaches the control uncancelled and is not the action.
      const pointer = click(control);
      expect(pointer.defaultPrevented).toBe(false);
      expect(onAction).not.toHaveBeenCalled();

      // The control commits its toggle: one action with the live state.
      control['checked'] = true;
      change(control);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction.mock.calls[0]?.[0]).toEqual({
        action: 'pick',
        data: { checked: true, name: 'ok' },
        path: 'root',
      });
    },
  );

  it('S17 ki-tabs activates on ki-change and reports the live selected value', () => {
    expect(Object.keys(builtIn.components['ki-tabs']?.events ?? {})).toEqual(['ki-change']);
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(tabsSpec(), { surface, onAction });
    const tabs = rendered('ki-tabs');
    const second = rendered('ki-tab', 1);

    click(second);
    expect(onAction).not.toHaveBeenCalled();
    // ki-tabs emits ki-change from its own host once the selection moved.
    tabs['value'] = 'b';
    tabs.dispatchEvent(
      new CustomEvent('ki-change', { bubbles: true, composed: true, detail: { value: 'b' } }),
    );
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]).toEqual({
      action: 'pick',
      data: { label: 'T', value: 'b' },
      path: 'root',
    });
  });

  it('S18 a click inside the selected panel dispatches nothing', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(tabsSpec(), { surface, onAction });
    const panel = rendered('ki-tab-panel', 0);
    expect(click(panel).defaultPrevented).toBe(false);
    // Neither an unrelated event type nor a same-named event bubbling up
    // from a descendant is the bound control's own activation.
    change(panel, 'input');
    change(panel, 'ki-change');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('S17 the live payload carries only catalog-declared props of their declared type', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(toggleSpec('ki-checkbox'), { surface, onAction });
    const control = rendered('ki-checkbox');
    // `checked` with a non-boolean value and an undeclared live property
    // never cross the channel; the spec's own props always do.
    control['checked'] = 'yes';
    control['secret'] = 'leak';
    control['value'] = 'on';
    change(control);
    expect(onAction.mock.calls[0]?.[0]?.data).toEqual({ name: 'ok', value: 'on' });
  });

  it('S4 a click-activated button keeps the spec payload and its suppressed default', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(
      {
        version: 1,
        actions: ['go'],
        root: { component: 'ki-button', action: 'go', props: { variant: 'primary' } },
      },
      { surface, onAction },
    );
    const button = rendered('ki-button');
    change(button);
    expect(onAction).not.toHaveBeenCalled();
    expect(click(button).defaultPrevented).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]?.data).toEqual({ variant: 'primary' });
  });

  it('S4 a change-bound control inside a click-bound card dispatches exactly one action', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    const hostClicks = vi.fn();
    surface.addEventListener('click', hostClicks);
    renderUiSpec(
      {
        version: 1,
        actions: ['card', 'pick'],
        root: {
          component: 'ki-card',
          action: 'card',
          slots: { '': [{ component: 'ki-checkbox', action: 'pick', slots: { '': ['OK'] } }] },
        },
      },
      { surface, onAction },
    );
    const control = rendered('ki-checkbox');
    // The click that toggles the nested control is claimed by it: the
    // enclosing card never dispatches for it.
    click(control);
    expect(onAction).not.toHaveBeenCalled();
    // The claim does not swallow the click: host listeners still observe it.
    expect(hostClicks).toHaveBeenCalledTimes(1);
    control['checked'] = true;
    change(control);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]?.action).toBe('pick');
    // A click on the card itself still dispatches the card's action.
    click(rendered('ki-card'));
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction.mock.calls[1]?.[0]?.action).toBe('card');
  });

  it('S17 a streamed control binds the same declared activation event', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    const stream = createStreamingRenderer({ surface, onAction, actions: ['pick'] });
    expect(stream.push({ component: 'ki-switch', action: 'pick', slots: { '': ['On'] } }).ok).toBe(
      true,
    );
    const control = rendered('ki-switch');
    expect(click(control).defaultPrevented).toBe(false);
    control['checked'] = true;
    change(control);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]).toEqual({
      action: 'pick',
      data: { checked: true },
      path: 'stream[0]',
    });
  });
});

describe('renderUiSpec — an ambiguous activation event fails closed', () => {
  const multiEvent = (): Catalog => {
    const created = createCatalog({
      components: {
        'acme-slider': {
          description: 'A range slider.',
          events: { change: 'Committed value.', input: 'Live value.' },
          props: {},
          slots: {},
          tag: 'acme-slider',
          whenNotToUse: 'Exact numeric entry.',
          whenToUse: 'Pick an approximate value.',
        },
      },
    });
    if (!created.ok) {
      throw new Error(JSON.stringify(created.issues));
    }
    return created.catalog;
  };

  it('S19 rejects a binding on a component declaring more than one event', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    const result = renderUiSpec(
      { version: 1, actions: ['pick'], root: { component: 'acme-slider', action: 'pick' } },
      { surface, onAction, catalog: multiEvent() },
    );
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('ambiguous-activation-event');
    expect(diagnostic?.path).toBe('root.action');
    expect(diagnostic?.message).toContain('acme-slider');
    expect(diagnostic?.message).toContain('change');
    expect(diagnostic?.message).toContain('input');
  });

  it('S19 still renders that component when no action is bound to it', () => {
    const result = renderUiSpec(
      { version: 1, root: { component: 'acme-slider' } },
      { surface, catalog: multiEvent() },
    );
    expect(result.ok).toBe(true);
    expect(surface.querySelector('acme-slider')).not.toBeNull();
  });

  it('S19 halts a stream whose chunk binds an ambiguous component', () => {
    const stream = createStreamingRenderer({
      surface,
      onAction: vi.fn(),
      actions: ['pick'],
      catalog: multiEvent(),
    });
    const result = stream.push({ component: 'acme-slider', action: 'pick' });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('ambiguous-activation-event');
    expect(surface.childNodes).toHaveLength(0);
  });
});
