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
// for the event scenario, ki-button and ki-input for rendering — never the
// barrel and never ki-dialog.
import { KiAlert } from '../src/ki-alert';
import { KiButton } from '../src/ki-button';
import { KiInput } from '../src/ki-input';

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

  it('S11 defines only the rendered component, never the rest of the library', async () => {
    mount(<KiButton>Only me</KiButton>);
    await flush();
    expect(customElements.get('ki-button')).toBeDefined();
    expect(customElements.get('ki-dialog')).toBeUndefined();
  });
});
