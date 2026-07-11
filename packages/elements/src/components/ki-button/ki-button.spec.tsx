import { h } from '@stencil/core';
import { afterEach, describe, expect, it, render, vi } from '@stencil/vitest';
import { normalizeKiButtonType } from './ki-button.form';

interface KiButtonHarness {
  button?: HTMLButtonElement;
  componentDidLoad(): void;
  descriptionObserver?: MutationObserver;
  disabled: boolean;
  formDisabledCallback(disabled: boolean): void;
  handleClick(event: MouseEvent): void;
  internals: { form: HTMLFormElement | null };
  name?: string;
  tone: string;
  type: string;
  value?: string;
  variant: string;
  size: string;
  disconnectedCallback(): void;
}

async function sourceButton(html = '<ki-button>Save</ki-button>') {
  return render<HTMLElement, KiButtonHarness>(html);
}

function sourceInstance(rootInstance: unknown): KiButtonHarness {
  const host = rootInstance as {
    __stencil__getHostRef?: () => { $lazyInstance$?: unknown; o?: unknown };
  };
  const hostRef = host.__stencil__getHostRef?.();
  return (hostRef?.$lazyInstance$ ?? hostRef?.o ?? rootInstance) as KiButtonHarness;
}

function internalButton(root: Element | null | undefined): HTMLButtonElement {
  const button = root?.shadowRoot?.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('ki-button did not render a native button');
  }
  return button;
}

function installForm(instance: KiButtonHarness) {
  const form = document.createElement('form');
  const reset = vi.fn();
  const requestSubmit = vi.fn();
  Object.defineProperties(form, {
    requestSubmit: { configurable: true, value: requestSubmit },
    reset: { configurable: true, value: reset },
  });
  instance.internals = { form };
  return { form, requestSubmit, reset };
}

function clickEventHarness(): MouseEvent & {
  preventDefault: ReturnType<typeof vi.fn>;
  stopImmediatePropagation: ReturnType<typeof vi.fn>;
} {
  return {
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  } as unknown as MouseEvent & {
    preventDefault: ReturnType<typeof vi.fn>;
    stopImmediatePropagation: ReturnType<typeof vi.fn>;
  };
}

// @spec:002-ki-button
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('S1 dispatches exactly one composed click activation', async () => {
    const onClick = vi.fn();
    const { root } = await render(<ki-button onClick={onClick}>Save</ki-button>);
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    button?.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('S2 renders a disabled internal button that is inert', async () => {
    const onClick = vi.fn();
    const { root } = await render(h('ki-button', { disabled: true, onClick }, 'Save'));
    const button = root.shadowRoot?.querySelector('button');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.hasAttribute('disabled')).toBe(true);
    button?.click();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('S11 preserves unknown appearance attributes while rendering default anatomy', async () => {
    const { root } = await render(
      h('ki-button', { variant: 'loud', tone: 'warning', size: 'jumbo' }, 'Save'),
    );
    const button = root.shadowRoot?.querySelector('button[part="button"]');
    const label = root.shadowRoot?.querySelector('[part="label"]');

    expect(root.getAttribute('variant')).toBe('loud');
    expect(root.getAttribute('tone')).toBe('warning');
    expect(root.getAttribute('size')).toBe('jumbo');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.getAttribute('type')).toBe('button');
    expect(label?.querySelector('slot')?.nodeName).toBe('SLOT');
    expect(root).toHaveTextContent('Save');
  });

  it('S7 resolves submit reset button and unknown form action types', () => {
    expect(normalizeKiButtonType('submit')).toBe('submit');
    expect(normalizeKiButtonType('reset')).toBe('reset');
    expect(normalizeKiButtonType('button')).toBe('button');
    expect(normalizeKiButtonType('launch')).toBe('submit');
    expect(normalizeKiButtonType(undefined)).toBe('submit');
  });

  it('S11 renders source defaults and the complete logical slot anatomy', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const button = internalButton(page.root);
    const slots = [...button.querySelectorAll('slot')].map((slot) => slot.getAttribute('name'));

    expect(instance.variant).toBe('secondary');
    expect(instance.tone).toBe('neutral');
    expect(instance.size).toBe('md');
    expect(instance.type).toBe('submit');
    expect(instance.disabled).toBe(false);
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('tabindex')).toBe('0');
    expect(button.getAttribute('type')).toBe('button');
    expect(slots).toEqual(['start', null, 'end']);
    expect(button.querySelector('[part="label"] slot:not([name])')?.tagName).toBe('SLOT');
    expect(page.root).toHaveTextContent('Save');
  });

  it('S14 mirrors aria-description changes and disconnects its observer', async () => {
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
    const page = await sourceButton(
      '<ki-button aria-description="Sends immediately">Save</ki-button>',
    );
    const root = page.root;
    const button = internalButton(root);
    const instance = sourceInstance(page.instance);

    expect(button.getAttribute('aria-description')).toBe('Sends immediately');
    vi.stubGlobal('MutationObserver', MutationObserverHarness);
    instance.componentDidLoad();
    expect(observe).toHaveBeenCalledOnce();
    expect(observe.mock.calls[0]?.[0]).toBe(root);
    expect(observe.mock.calls[0]?.[1]).toEqual({ attributeFilter: ['aria-description'] });

    root.setAttribute('aria-description', 'Now sending');
    callback([], {} as MutationObserver);
    expect(button.getAttribute('aria-description')).toBe('Now sending');

    root.removeAttribute('aria-description');
    callback([], {} as MutationObserver);
    expect(button.hasAttribute('aria-description')).toBe(false);

    instance.disconnectedCallback();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('S14 tolerates forwarding and teardown before an inner button or observer exists', async () => {
    const page = await sourceButton();
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

  it('S2 applies and removes disabled-fieldset state from the native button', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);

    instance.formDisabledCallback(true);
    await page.waitForChanges();
    expect(internalButton(page.root).hasAttribute('disabled')).toBe(true);
    expect(internalButton(page.root).getAttribute('tabindex')).toBe('-1');

    instance.formDisabledCallback(false);
    await page.waitForChanges();
    expect(internalButton(page.root).hasAttribute('disabled')).toBe(false);
    expect(internalButton(page.root).getAttribute('tabindex')).toBe('0');
  });

  it('S2 cancels both host activation phases while explicitly disabled', async () => {
    const page = await sourceButton('<ki-button disabled>Save</ki-button>');
    const instance = sourceInstance(page.instance);
    const { requestSubmit, reset } = installForm(instance);
    const event = clickEventHarness();

    instance.handleClick(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('S2 cancels activation while its owning fieldset disables it', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const { requestSubmit } = installForm(instance);
    const event = clickEventHarness();
    instance.formDisabledCallback(true);

    instance.handleClick(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('S8 performs no form action for type button or without an owning form', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const event = clickEventHarness();
    instance.internals = { form: null };

    instance.handleClick(event);
    const { requestSubmit, reset } = installForm(instance);
    instance.type = 'button';
    instance.handleClick(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('S12 resets the owning form exactly once for type reset', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const { requestSubmit, reset } = installForm(instance);
    instance.type = 'reset';

    instance.handleClick(clickEventHarness());

    expect(reset).toHaveBeenCalledOnce();
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('S7 submits with a transient native submitter carrying name and value', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const { form, requestSubmit, reset } = installForm(instance);
    instance.name = 'intent';
    instance.value = 'publish';
    instance.type = 'submit';
    let submitter: HTMLButtonElement | undefined;
    requestSubmit.mockImplementation((received: HTMLButtonElement) => {
      submitter = received;
      expect(received.parentElement).toBe(form);
      expect(received.type).toBe('submit');
      expect(received.hidden).toBe(true);
      expect(received.name).toBe('intent');
      expect(received.value).toBe('publish');
    });

    instance.handleClick(clickEventHarness());

    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
    expect(submitter?.parentElement).toBeNull();
  });

  it('S7 defaults unknown action types and missing submitter values to native semantics', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const { requestSubmit } = installForm(instance);
    instance.name = 'intent';
    delete instance.value;
    instance.type = 'launch';

    instance.handleClick(clickEventHarness());

    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(requestSubmit.mock.calls[0]?.[0]).toMatchObject({
      hidden: true,
      name: 'intent',
      type: 'submit',
      value: '',
    });
  });

  it('S7 omits submitter data when name is absent and removes it after errors', async () => {
    const page = await sourceButton();
    const instance = sourceInstance(page.instance);
    const { requestSubmit } = installForm(instance);
    const createdSubmitter = document.createElement('button');
    const nameSetter = vi.fn();
    const valueSetter = vi.fn();
    Object.defineProperties(createdSubmitter, {
      name: { configurable: true, get: () => '', set: nameSetter },
      value: { configurable: true, get: () => '', set: valueSetter },
    });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(createdSubmitter);
    let submitter: HTMLButtonElement | undefined;
    requestSubmit.mockImplementation((received: HTMLButtonElement) => {
      submitter = received;
      throw new Error('submission failed');
    });

    expect(() => {
      instance.handleClick(clickEventHarness());
    }).toThrow('submission failed');
    expect(nameSetter).not.toHaveBeenCalled();
    expect(valueSetter).not.toHaveBeenCalled();
    expect(submitter?.parentElement).toBeNull();
  });
});
