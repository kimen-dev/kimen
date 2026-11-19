// @spec:034-framework-wrappers
// React wrapper behavior in a real browser: typed rendering (S1), ki-*
// custom events as callback props (S2), controlled form usage over the
// re-dispatched native input event (S7), and per-component lazy
// registration (S11 — importing and rendering only ki-button must not
// define ki-dialog).
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
// S11 depends on this file importing ONLY these wrapper modules: ki-alert
// for the event scenario, ki-button and ki-input for rendering, and the
// select, tabs and radio-group families for composition — never the barrel
// and never ki-dialog.
import { KiAlert } from '../src/ki-alert';
import { KiButton } from '../src/ki-button';
import { KiInput } from '../src/ki-input';
import { KiOption } from '../src/ki-option';
import { KiRadio } from '../src/ki-radio';
import { KiRadioGroup } from '../src/ki-radio-group';
import { KiSelect } from '../src/ki-select';
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
