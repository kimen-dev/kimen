// @spec:167-loader-on-component-modules
import { afterEach, describe, expect, it } from 'vitest';

import type { KiButton } from '../dist/components/ki-button.js';
import type * as Loader from '../loader/index.js';
type Realm = Window &
  typeof globalThis & {
    kimenLoader: typeof Loader;
    loaderReady: () => void;
    kimenRoot: { KiButton: typeof KiButton };
    kimenButton: { KiButton: typeof KiButton };
  };

const frames: HTMLIFrameElement[] = [];

afterEach(() => {
  for (const frame of frames.splice(0)) frame.remove();
});

// Each scenario owns its CustomElementRegistry. Native imports in the frame
// also run the package's modules without Vitest's cross-realm module cache.
async function freshRealm(importRoot = false) {
  const frame = document.createElement('iframe');
  frames.push(frame);
  document.body.append(frame);
  const realm = frame.contentWindow as Realm;
  const script = realm.document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import * as loader from '/kimen-loader-fixture/loader/index.js';
    globalThis.kimenLoader = loader;
    ${
      importRoot
        ? `
      globalThis.kimenRoot = await import('/kimen-loader-fixture/dist/index.js');
      globalThis.kimenButton = await import('/kimen-loader-fixture/dist/components/ki-button.js');
    `
        : ''
    }
    globalThis.loaderReady();
  `;
  const loaded = new Promise<void>((resolve, reject) => {
    realm.loaderReady = resolve;
    function onError() {
      reject(new Error('Could not load the built loader'));
    }
    script.addEventListener('error', onError, { once: true });
  });
  realm.document.head.append(script);
  await loaded;
  return realm;
}

function appendButton(root: HTMLElement | ShadowRoot) {
  const host = root.ownerDocument.createElement('ki-button');
  host.textContent = 'Continue';
  root.append(host);
  return host;
}

const nativeButton = (host: HTMLElement) => host.shadowRoot?.querySelector('button');

describe('the loader over per-component modules', () => {
  it('S1: renders an existing button when the loader starts', async () => {
    const realm = await freshRealm();
    const button = appendButton(realm.document.body);

    await realm.kimenLoader.defineCustomElements();

    expect(realm.customElements.get('ki-button')).toBeDefined();
    await expect
      .poll(
        () =>
          nativeButton(button)
            ?.querySelector<HTMLSlotElement>('slot:not([name])')
            ?.assignedNodes()[0]?.textContent,
      )
      .toBe('Continue');
  });

  it('S2: renders a card appended after startup', async () => {
    const realm = await freshRealm();
    await realm.kimenLoader.defineCustomElements();

    const card = realm.document.createElement('ki-card');
    realm.document.body.append(card);

    await expect.poll(() => card.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  it('S4: leaves an unseen tag undefined', async () => {
    const realm = await freshRealm();

    await realm.kimenLoader.defineCustomElements();

    expect(realm.customElements.get('ki-dialog')).toBeUndefined();
  });

  it('S5: satisfies whenDefined on first insertion and exposes the dialog method', async () => {
    const realm = await freshRealm();
    await realm.kimenLoader.defineCustomElements();
    const definition = realm.customElements.whenDefined('ki-dialog');
    const dialog = realm.document.createElement('ki-dialog');
    dialog.setAttribute('label', 'Details');

    realm.document.body.append(dialog);
    await definition;
    await dialog.show();

    await expect.poll(() => dialog.shadowRoot?.querySelector('dialog')?.open).toBe(true);
  });

  it('S6: keeps an excluded card undefined while processing the same mutation batch', async () => {
    const realm = await freshRealm();
    await realm.kimenLoader.defineCustomElements(undefined, { exclude: ['ki-card'] });

    realm.document.body.append(realm.document.createElement('ki-card'));
    appendButton(realm.document.body);
    await realm.customElements.whenDefined('ki-button');

    expect(realm.customElements.get('ki-card')).toBeUndefined();
  });

  it('S7: renders a code block in a markdown component’s shadow root', async () => {
    const realm = await freshRealm();
    await realm.kimenLoader.defineCustomElements();
    expect(realm.customElements.get('ki-code-block')).toBeUndefined();
    const markdown = realm.document.createElement('ki-markdown');

    markdown.textContent = '```js\nconst answer = 42;\n```';
    realm.document.body.append(markdown);

    await expect
      .poll(
        () =>
          markdown.shadowRoot?.querySelector('ki-code-block')?.shadowRoot?.querySelector('code')
            ?.textContent,
      )
      .toContain('const answer = 42;');
  });

  it('S8: skips an application shadow root until the application hands it over', async () => {
    const realm = await freshRealm();
    const wrapper = realm.document.createElement('div');
    realm.document.body.append(wrapper);
    appendButton(wrapper.attachShadow({ mode: 'open' }));
    await realm.kimenLoader.defineCustomElements();

    expect(realm.customElements.get('ki-button')).toBeUndefined();
  });

  it.each(['open', 'closed'] as const)(
    'S9: observes future children in an application’s %s shadow root',
    async (mode) => {
      const realm = await freshRealm();
      const wrapper = realm.document.createElement('div');
      realm.document.body.append(wrapper);
      const root = wrapper.attachShadow({ mode });
      await realm.kimenLoader.defineCustomElements();
      await realm.kimenLoader.observeRoot(root);

      const button = appendButton(root);

      await expect.poll(() => nativeButton(button)).toBeTruthy();
    },
  );

  it('S9: awaits definitions already in a handed-over element', async () => {
    const realm = await freshRealm();
    const host = realm.document.createElement('div');
    realm.document.body.append(host);
    const wrapper = realm.document.createElement('div');
    host.attachShadow({ mode: 'closed' }).append(wrapper);
    const button = appendButton(wrapper);
    await realm.kimenLoader.defineCustomElements();

    await realm.kimenLoader.observeRoot(wrapper);

    expect(button.constructor).toBe(realm.customElements.get('ki-button'));
  });

  it('S10: checks the required input’s validity synchronously after definition', async () => {
    const realm = await freshRealm();
    const input = realm.document.createElement('ki-input');
    input.setAttribute('required', '');
    input.setAttribute('label', 'Name');
    realm.document.body.append(input);

    await realm.kimenLoader.defineCustomElements();

    const control = input as HTMLKiInputElement & { checkValidity(): boolean };
    expect(control.checkValidity()).toBe(false);
  });

  it('S11: re-exports the same KiButton class as the direct subpath', async () => {
    const realm = await freshRealm(true);

    expect(realm.kimenRoot.KiButton).toBe(realm.kimenButton.KiButton);
  });
});
