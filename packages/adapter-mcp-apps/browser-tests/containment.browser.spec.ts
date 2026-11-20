// @spec:152-guardrail-containment
// A rendered spec touches only what it inserted, with the real components:
// the packaged surface document registers every catalog element inside a
// frame, and the guarded renderer renders into a host page built in that
// frame's document. The boundary rules themselves (rejections, allocated
// ids) are pinned in packages/catalog/tests/containment.spec.ts.
import { type ActionEvent, renderUiSpec } from '@kimen/catalog';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createKimenSurfaceResource } from '../src/index.js';

type ViewWindow = Window & typeof globalThis;

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

/**
 * The packaged document in a same-origin frame: its script registers every
 * catalog element in the frame's registry. The test plays the host page and
 * never answers the MCP Apps handshake, which this suite does not exercise.
 */
async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('containment').text;
  document.body.append(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-menu') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

function one(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`${selector} did not render`);
  }
  return element;
}

function innerButton(host: HTMLElement): HTMLButtonElement {
  const button = host.shadowRoot?.querySelector('button');
  if (button === null || button === undefined) {
    throw new Error(`${host.localName} has no inner button yet`);
  }
  return button;
}

describe('a reference resolves only to a node of the same surface', () => {
  it('S1 a menu anchored to a button of its own spec opens from that button', async () => {
    const view = await hostPage();
    // The host page uses the spec's logical id for its own control.
    const hostButton = view.document.createElement('button');
    hostButton.id = 'actions';
    hostButton.type = 'button';
    hostButton.textContent = 'Host actions';
    const surface = view.document.createElement('main');
    view.document.body.append(hostButton, surface);

    const rendered = renderUiSpec(
      {
        root: {
          component: 'ki-stack',
          slots: {
            '': [
              { component: 'ki-button', id: 'actions', slots: { '': ['Actions'] } },
              {
                component: 'ki-menu',
                props: { anchor: 'actions' },
                slots: {
                  '': [
                    {
                      component: 'ki-menu-item',
                      props: { value: 'archive' },
                      slots: { '': ['Archive'] },
                    },
                  ],
                },
              },
            ],
          },
        },
        version: 1,
      },
      { surface },
    );
    expect(rendered.ok).toBe(true);
    const specButton = one(surface, 'ki-button');
    const menu = one(surface, 'ki-menu');

    // The menu binds its trigger once it has loaded.
    await expect
      .poll(() => menu.id !== '' && specButton.getAttribute('aria-controls') === menu.id)
      .toBe(true);

    specButton.click();

    await expect.poll(() => menu.hasAttribute('open')).toBe(true);
    const control = specButton.shadowRoot?.querySelector('button');
    expect(control?.getAttribute('aria-expanded')).toBe('true');
    for (const attribute of ['aria-controls', 'aria-expanded', 'aria-haspopup']) {
      expect(hostButton.hasAttribute(attribute), attribute).toBe(false);
    }
  });

  it('S3 a copy button copies its own spec field, never the host field that shares its id', async () => {
    const view = await hostPage();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(view.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const hostField = view.document.createElement('input');
    hostField.type = 'password';
    hostField.id = 'secret';
    hostField.value = 'host-password';
    const surface = view.document.createElement('main');
    view.document.body.append(hostField, surface);

    const rendered = renderUiSpec(
      {
        root: {
          component: 'ki-stack',
          slots: {
            '': [
              {
                component: 'ki-input',
                id: 'secret',
                props: { label: 'Release tag', value: 'v1.4.2' },
              },
              { component: 'ki-copy-button', props: { from: 'secret' } },
            ],
          },
        },
        version: 1,
      },
      { surface },
    );
    expect(rendered.ok).toBe(true);
    const copy = one(surface, 'ki-copy-button');
    await expect.poll(() => copy.shadowRoot?.querySelector('button') ?? null).not.toBeNull();

    innerButton(copy).click();

    await expect.poll(() => writeText.mock.calls.length).toBe(1);
    expect(writeText).toHaveBeenCalledWith('v1.4.2');
    expect(hostField.value).toBe('host-password');
    expect(hostField.id).toBe('secret');
  });
});

describe('a spec never submits or resets a host form', () => {
  async function formPage(): Promise<{
    surface: HTMLElement;
    submissions: () => number;
  }> {
    const view = await hostPage();
    const form = view.document.createElement('form');
    form.name = 'payment';
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      submitted += 1;
      event.preventDefault();
    });
    const surface = view.document.createElement('main');
    form.append(surface);
    view.document.body.append(form);
    return { submissions: () => submitted, surface };
  }

  const activate = async (surface: HTMLElement): Promise<void> => {
    const button = one(surface, 'ki-button');
    await expect.poll(() => button.shadowRoot?.querySelector('button') ?? null).not.toBeNull();
    innerButton(button).click();
  };

  it('S5 a spec button inside a host form does not submit it', async () => {
    const { submissions, surface } = await formPage();
    const rendered = renderUiSpec(
      { root: { component: 'ki-button', slots: { '': ['Continue'] } }, version: 1 },
      { surface },
    );
    expect(rendered.ok).toBe(true);

    await activate(surface);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(submissions()).toBe(0);
  });

  it('S7 a bound spec button inside a host form dispatches only its action', async () => {
    const { submissions, surface } = await formPage();
    const actions: ActionEvent[] = [];
    const rendered = renderUiSpec(
      {
        actions: ['confirm'],
        root: { action: 'confirm', component: 'ki-button', slots: { '': ['Confirm'] } },
        version: 1,
      },
      { onAction: (event) => actions.push(event), surface },
    );
    expect(rendered.ok).toBe(true);

    await activate(surface);

    await expect.poll(() => actions.map(({ action }) => action)).toEqual(['confirm']);
    expect(submissions()).toBe(0);
  });
});
