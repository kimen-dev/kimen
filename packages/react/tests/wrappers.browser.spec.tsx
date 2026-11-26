// @spec:034-framework-wrappers
// React wrapper behavior in a real browser: typed rendering (S1), ki-*
// custom events as callback props (S2), controlled form usage over the
// re-dispatched native input event (S7), and per-component lazy
// registration (S11 — importing and rendering only ki-button must not
// define ki-dialog).
import { type ComponentRef, createRef, StrictMode, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, assert, describe, expect, it, vi } from 'vitest';
// S11 requires direct imports that leave ki-dialog unregistered.
import { KiAlert } from '../src/ki-alert';
import { KiButton } from '../src/ki-button';
import { KiInput } from '../src/ki-input';
import { KiOption } from '../src/ki-option';
import { KiRadio } from '../src/ki-radio';
import { KiRadioGroup } from '../src/ki-radio-group';
import { KiSelect } from '../src/ki-select';
import { KiSuggestions } from '../src/ki-suggestions';
import { KiTab } from '../src/ki-tab';
import { KiTabPanel } from '../src/ki-tab-panel';
import { KiTabs } from '../src/ki-tabs';

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

let host: HTMLElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;

function mount(node: React.ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<StrictMode>{node}</StrictMode>);
  return host;
}

/**
 * Mounts the way a production build does, without StrictMode. In development
 * StrictMode runs every effect a second time, and the wrapper assigns element
 * props from an effect: that second assignment lands after the components
 * have rendered and repairs an initial state the first one got wrong. A
 * scenario about the state right after the first commit has to be measured
 * without it, or it passes for a reason no user's bundle has.
 */
function mountOnce(node: React.ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(node);
  return host;
}

afterEach(async () => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  await flush();
});

describe('react wrapper', () => {
  it('S1 renders the underlying element with typed props', async () => {
    const surface = mount(<KiButton variant="primary">Save</KiButton>);
    await flush();
    const button = surface.querySelector('ki-button');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('variant')).toBe('primary');
    expect(button?.shadowRoot).not.toBeNull();
  });

  it('S2 binds ki-* custom events as callback props', async () => {
    const received: unknown[] = [];
    const surface = mount(
      <KiAlert tone="info" dismissible onKiDismiss={(event) => received.push(event.detail)}>
        Saved
      </KiAlert>,
    );
    await flush();
    const alert = surface.querySelector('ki-alert');
    expect(alert).not.toBeNull();
    alert?.dispatchEvent(new CustomEvent('ki-dismiss', { bubbles: true, detail: null }));
    await flush();
    expect(received).toHaveLength(1);
  });

  it('replaces and removes mapped event handlers on update', async () => {
    const first = vi.fn();
    const next = vi.fn();
    const element = createRef<ComponentRef<typeof KiAlert>>();
    mountOnce(<KiAlert ref={element} onKiDismiss={first} />);
    await expect.poll(() => element.current).not.toBeNull();
    const alert = element.current;
    assert.exists(alert);
    const event = new CustomEvent('ki-dismiss', { detail: null });

    alert.dispatchEvent(event);
    expect(first).toHaveBeenCalledExactlyOnceWith(event);

    flushSync(() => root?.render(<KiAlert ref={element} onKiDismiss={next} />));
    alert.dispatchEvent(event);
    expect(first).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledExactlyOnceWith(event);

    flushSync(() => root?.render(<KiAlert ref={element} />));
    alert.dispatchEvent(event);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('binds one listener after StrictMode effect replay and removes it on unmount', async () => {
    const dismiss = vi.fn();
    const element = createRef<ComponentRef<typeof KiAlert>>();
    mount(<KiAlert ref={element} onKiDismiss={dismiss} />);
    await expect.poll(() => element.current).not.toBeNull();
    const alert = element.current;
    assert.exists(alert);
    const event = new CustomEvent('ki-dismiss');

    alert.dispatchEvent(event);
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(event);

    root?.unmount();
    root = undefined;
    expect(element.current).toBeNull();
    alert.dispatchEvent(event);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('removes only the listener owned by the wrapper', async () => {
    const dismiss = vi.fn();
    const element = createRef<ComponentRef<typeof KiAlert>>();
    mountOnce(<KiAlert ref={element} onKiDismiss={dismiss} />);
    await expect.poll(() => element.current).not.toBeNull();
    const alert = element.current;
    assert.exists(alert);
    alert.addEventListener('ki-dismiss', dismiss);

    root?.unmount();
    root = undefined;
    alert.dispatchEvent(new CustomEvent('ki-dismiss'));

    expect(dismiss).toHaveBeenCalledTimes(1);
    alert.removeEventListener('ki-dismiss', dismiss);
  });

  it('sets, updates and clears an object prop on the host without an attribute', async () => {
    const initial = { value: 'draft', focus: vi.fn() };
    const updated = { value: 'revision', focus: vi.fn() };
    const element = createRef<ComponentRef<typeof KiSuggestions>>();
    mountOnce(<KiSuggestions label="Prompts" ref={element} composer={initial} />);
    await expect.poll(() => element.current?.composer).toBe(initial);
    const suggestions = element.current;
    assert.exists(suggestions);
    expect(suggestions.hasAttribute('composer')).toBe(false);

    flushSync(() =>
      root?.render(<KiSuggestions label="Prompts" ref={element} composer={updated} />),
    );
    expect(suggestions.composer).toBe(updated);
    expect(suggestions.hasAttribute('composer')).toBe(false);

    flushSync(() => root?.render(<KiSuggestions label="Prompts" ref={element} />));
    expect(suggestions.composer).toBeUndefined();
  });

  it('forwards the host to callback refs and detaches replaced refs', async () => {
    const first = vi.fn();
    const next = vi.fn();
    const surface = mountOnce(<KiButton ref={first}>Save</KiButton>);
    await expect.poll(() => surface.querySelector('ki-button')).not.toBeNull();
    const button = surface.querySelector('ki-button');
    expect(first).toHaveBeenCalledExactlyOnceWith(button);

    flushSync(() => root?.render(<KiButton ref={next}>Save</KiButton>));
    expect(first.mock.calls).toEqual([[button], [null]]);
    expect(next).toHaveBeenCalledExactlyOnceWith(button);

    root?.unmount();
    root = undefined;
    expect(next.mock.calls).toEqual([[button], [null]]);
  });

  it('updates className alongside Stencil and application classes', async () => {
    const surface = mountOnce(<KiButton className="initial">Save</KiButton>);
    await expect.poll(() => surface.querySelector('ki-button.hydrated.initial')).not.toBeNull();
    const button = surface.querySelector('ki-button');
    assert.exists(button);
    button.classList.add('external');

    flushSync(() => root?.render(<KiButton className="updated">Save</KiButton>));
    expect([...button.classList]).toEqual(
      expect.arrayContaining(['hydrated', 'external', 'updated']),
    );
    expect(button.classList.contains('initial')).toBe(false);

    flushSync(() => root?.render(<KiButton>Save</KiButton>));
    expect([...button.classList]).toEqual(expect.arrayContaining(['hydrated', 'external']));
    expect(button.classList.contains('updated')).toBe(false);
  });

  it('hands through HTML attributes and releases deferred hydration at mount', async () => {
    const surface = mountOnce(
      <KiButton id="save" data-action="save" {...{ 'defer-hydration': '' }}>
        Save
      </KiButton>,
    );
    await expect.poll(() => surface.querySelector('ki-button.hydrated')).not.toBeNull();
    const button = surface.querySelector('ki-button');
    assert.exists(button);
    expect(button.id).toBe('save');
    expect(button.dataset['action']).toBe('save');
    expect(button.hasAttribute('defer-hydration')).toBe(false);

    flushSync(() => root?.render(<KiButton>Save</KiButton>));
    expect(button.hasAttribute('id')).toBe(false);
    expect(button.hasAttribute('data-action')).toBe(false);
  });

  it('S7 round-trips a controlled ki-input through the native input event', async () => {
    const seen: string[] = [];
    function Controlled() {
      const [value, setValue] = useState('start');
      return (
        <KiInput
          label="Name"
          value={value}
          onInput={(event) => {
            const next = (event.target as HTMLElement & { value: string }).value;
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    const surface = mount(<Controlled />);
    await flush();
    const input = surface.querySelector('ki-input') as HTMLElement & { value: string };
    expect(input.value).toBe('start');

    const inner = input.shadowRoot?.querySelector('input');
    expect(inner).not.toBeNull();
    if (inner) {
      inner.value = 'edited';
      inner.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    }
    await flush();
    expect(seen).toContain('edited');
    expect(input.value).toBe('edited');
  });

  // React assigns every prop as a property, on the children too, and inserts
  // the finished tree at once: the parent first sees children whose `value`
  // is not an attribute yet.
  it('S1 a KiSelect preselects the value its KiOption children carry as props', async () => {
    const surface = mountOnce(
      <form>
        <KiSelect label="Country" name="country" value="fr">
          <KiOption value="es">Spain</KiOption>
          <KiOption value="fr">France</KiOption>
        </KiSelect>
      </form>,
    );
    const select = () =>
      surface.querySelector('ki-select') as (HTMLElement & { value: string }) | null;

    await expect
      .poll(() => select()?.shadowRoot?.querySelector('[part="value"]')?.textContent)
      .toBe('France');
    expect(select()?.value).toBe('fr');
    const form = surface.querySelector('form');
    expect(form && new FormData(form).get('country')).toBe('fr');
  });

  it('S1 a KiTabs selects the value its KiTab children carry as props', async () => {
    const surface = mountOnce(
      <KiTabs label="Settings" value="q">
        {['p', 'q', 'r'].map((value) => (
          <KiTab key={`tab-${value}`} value={value}>
            {value}
          </KiTab>
        ))}
        {['p', 'q', 'r'].map((value) => (
          <KiTabPanel key={`panel-${value}`} value={value}>
            Panel {value}
          </KiTabPanel>
        ))}
      </KiTabs>,
    );
    const tabs = () => surface.querySelector('ki-tabs') as (HTMLElement & { value: string }) | null;
    const visiblePanels = () =>
      [...surface.querySelectorAll('ki-tab-panel:not([hidden])')].map((panel) => panel.textContent);

    await expect.poll(visiblePanels).toEqual(['Panel q']);
    expect(tabs()?.value).toBe('q');
    expect(
      [...surface.querySelectorAll('ki-tab')].map((tab) => tab.hasAttribute('selected')),
    ).toEqual([false, true, false]);
    for (const tab of surface.querySelectorAll('ki-tab')) {
      expect(tab.getAttribute('aria-controls')).toBe(
        surface.querySelector(`ki-tab-panel[value="${tab.getAttribute('value') ?? ''}"]`)?.id,
      );
    }
  });

  it('S1 a KiTabs whose tabs render later selects the value it was given', async () => {
    let load: () => void = () => undefined;
    function Async() {
      const [values, setValues] = useState<string[]>([]);
      load = () => {
        setValues(['p', 'q']);
      };
      return (
        <KiTabs label="Settings" value="q">
          {values.map((value) => (
            <KiTab key={`tab-${value}`} value={value}>
              {value}
            </KiTab>
          ))}
          {values.map((value) => (
            <KiTabPanel key={`panel-${value}`} value={value}>
              Panel {value}
            </KiTabPanel>
          ))}
        </KiTabs>
      );
    }
    const surface = mountOnce(<Async />);
    await flush();

    load();

    await expect
      .poll(() =>
        [...surface.querySelectorAll('ki-tab-panel:not([hidden])')].map(
          (panel) => panel.textContent,
        ),
      )
      .toEqual(['Panel q']);
  });

  // A keyed reorder moves the element: one disconnect, one connect.
  it('S7 a KiRadioGroup moved by a keyed reorder still holds a single choice', async () => {
    let swap: () => void = () => undefined;
    function Survey() {
      const [order, setOrder] = useState(['first', 'second']);
      swap = () => {
        setOrder(['second', 'first']);
      };
      return (
        <form>
          {order.map((name) => (
            <KiRadioGroup key={name} label={name} name={name}>
              <KiRadio value="x">X</KiRadio>
              <KiRadio value="y">Y</KiRadio>
            </KiRadioGroup>
          ))}
        </form>
      );
    }
    const surface = mountOnce(<Survey />);
    await flush();
    swap();
    await flush();

    for (const name of ['first', 'second']) {
      const inputs = [...surface.querySelectorAll(`ki-radio-group[name="${name}"] ki-radio`)].map(
        (radio) => radio.shadowRoot?.querySelector('input'),
      );
      inputs[0]?.click();
      inputs[1]?.click();
      expect(inputs.map((input) => input?.checked)).toEqual([false, true]);
    }
    const form = surface.querySelector('form');
    expect(form && [...new FormData(form)]).toEqual([
      ['second', 'y'],
      ['first', 'y'],
    ]);
  });

  it('S11 defines only the rendered component, never the rest of the library', async () => {
    mount(<KiButton>Only me</KiButton>);
    await flush();
    expect(customElements.get('ki-button')).toBeDefined();
    expect(customElements.get('ki-dialog')).toBeUndefined();
  });
});
