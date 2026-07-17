import { h } from '@stencil/core';
import { afterEach, describe, expect, it, render, vi } from '@stencil/vitest';

interface KiIconButtonHarness {
  button?: HTMLButtonElement;
  componentDidLoad(): void;
  descriptionObserver?: MutationObserver;
  disabled: boolean;
  disconnectedCallback(): void;
  label?: string;
  size: string;
  tone: string;
  variant: string;
}

async function sourceIconButton(
  html = '<ki-icon-button label="Close"><svg viewBox="0 0 16 16"></svg></ki-icon-button>',
) {
  return render<HTMLElement, KiIconButtonHarness>(html);
}

function sourceInstance(rootInstance: unknown): KiIconButtonHarness {
  const host = rootInstance as {
    __stencil__getHostRef?: () => { $lazyInstance$?: unknown; o?: unknown };
  };
  const hostRef = host.__stencil__getHostRef?.();
  return (hostRef?.$lazyInstance$ ?? hostRef?.o ?? rootInstance) as KiIconButtonHarness;
}

function internalButton(root: Element | null | undefined): HTMLButtonElement {
  const button = root?.shadowRoot?.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('ki-icon-button did not render a native button');
  }
  return button;
}

// @spec:022-ki-icon-button
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-icon-button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('S1 dispatches exactly one composed click activation', async () => {
    const onClick = vi.fn();
    const { root } = await render(
      <ki-icon-button label="Close" onClick={onClick}>
        <svg viewBox="0 0 16 16" />
      </ki-icon-button>,
    );
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    button?.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('S2 renders a disabled internal button that is inert', async () => {
    const onClick = vi.fn();
    const { root } = await render(h('ki-icon-button', { disabled: true, label: 'Close', onClick }));
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.hasAttribute('disabled')).toBe(true);
    button?.click();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('S3 preserves unknown appearance attributes while rendering default anatomy', async () => {
    const { root } = await render(
      h('ki-icon-button', { label: 'Close', size: 'jumbo', tone: 'warning', variant: 'loud' }),
    );
    const button = root.shadowRoot?.querySelector('button[part="button"]');

    expect(root.getAttribute('variant')).toBe('loud');
    expect(root.getAttribute('tone')).toBe('warning');
    expect(root.getAttribute('size')).toBe('jumbo');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.querySelector('[part="icon"] slot:not([name])')?.tagName).toBe('SLOT');
  });

  it('S3 renders source defaults with the single presentational icon slot', async () => {
    const page = await sourceIconButton();
    const instance = sourceInstance(page.instance);
    const button = internalButton(page.root);
    const slots = [...button.querySelectorAll('slot')];

    expect(instance.variant).toBe('secondary');
    expect(instance.tone).toBe('neutral');
    expect(instance.size).toBe('md');
    expect(instance.disabled).toBe(false);
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('tabindex')).toBe('0');
    expect(slots).toHaveLength(1);
    expect(slots[0]?.hasAttribute('name')).toBe(false);
  });

  it('S6 names the internal button from label and hides the icon from assistive technology', async () => {
    const page = await sourceIconButton();
    const button = internalButton(page.root);
    const icon = button.querySelector('[part="icon"]');

    expect(button.getAttribute('aria-label')).toBe('Close');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('slot:not([name])')?.tagName).toBe('SLOT');
  });

  it('S6 exposes no accessible name without a label and never invents one', async () => {
    const page = await sourceIconButton(
      '<ki-icon-button><svg viewBox="0 0 16 16"></svg></ki-icon-button>',
    );
    const button = internalButton(page.root);

    expect(button.hasAttribute('aria-label')).toBe(false);
  });

  it('S7 exposes the unavailable state and S14 removes keyboard reach while disabled', async () => {
    const page = await sourceIconButton(
      '<ki-icon-button disabled label="Close"><svg viewBox="0 0 16 16"></svg></ki-icon-button>',
    );
    const button = internalButton(page.root);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('S9 stays non-form-associated: an internal type button and no submitter API', async () => {
    const page = await sourceIconButton();
    const instance = sourceInstance(page.instance);
    const button = internalButton(page.root);

    expect(button.getAttribute('type')).toBe('button');
    expect(instance).not.toHaveProperty('type');
    expect(instance).not.toHaveProperty('name');
    expect(instance).not.toHaveProperty('value');
    expect(instance).not.toHaveProperty('internals');
  });

  it('S8 mirrors the host description, S12 follows changes and S13 removes it, then disconnects', async () => {
    let callback: MutationCallback = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class MutationObserverHarness {
      constructor(received: MutationCallback) {
        callback = received;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = () => [];
    }
    const page = await sourceIconButton(
      '<ki-icon-button aria-description="Closes the dialog" label="Close"><svg viewBox="0 0 16 16"></svg></ki-icon-button>',
    );
    const root = page.root;
    const button = internalButton(root);
    const instance = sourceInstance(page.instance);

    expect(button.getAttribute('aria-description')).toBe('Closes the dialog');
    vi.stubGlobal('MutationObserver', MutationObserverHarness);
    instance.componentDidLoad();
    expect(observe).toHaveBeenCalledOnce();
    expect(observe.mock.calls[0]?.[0]).toBe(root);
    expect(observe.mock.calls[0]?.[1]).toEqual({ attributeFilter: ['aria-description'] });

    root.setAttribute('aria-description', 'Closes the settings panel');
    callback([], {} as MutationObserver);
    expect(button.getAttribute('aria-description')).toBe('Closes the settings panel');

    root.removeAttribute('aria-description');
    callback([], {} as MutationObserver);
    expect(button.hasAttribute('aria-description')).toBe(false);

    instance.disconnectedCallback();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('S8 tolerates forwarding and teardown before an inner button or observer exists', async () => {
    const page = await sourceIconButton();
    const instance = sourceInstance(page.instance);
    vi.stubGlobal('MutationObserver', undefined);
    delete instance.button;
    delete instance.descriptionObserver;
    page.root.setAttribute('aria-description', 'Unavailable before render');

    expect(() => {
      instance.componentDidLoad();
    }).not.toThrow();
    page.root.removeAttribute('aria-description');
    expect(() => {
      instance.componentDidLoad();
    }).not.toThrow();
    expect(() => {
      instance.disconnectedCallback();
    }).not.toThrow();
  });
});
