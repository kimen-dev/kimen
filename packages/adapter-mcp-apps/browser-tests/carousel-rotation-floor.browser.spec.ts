// @spec:123-ki-carousel
// Amendment A1 clamps automatic rotation in the component, not in the
// catalog: a spec that asks for a one-millisecond interval stays valid
// (Art. IX) and renders a rotating carousel. The packaged surface document
// registers the real components in a same-origin frame, as in the
// containment suite.
import { renderUiSpec } from '@kimen/catalog';
import { afterEach, describe, expect, it } from 'vitest';

import { createKimenSurfaceResource } from '../src/index.js';

type ViewWindow = Window & typeof globalThis;

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('carousel').text;
  document.body.append(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-carousel') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

const oneMillisecondSpec = {
  root: {
    component: 'ki-carousel',
    props: { autoplay: 1, label: 'Highlights', loop: true },
    slots: {
      '': ['Discover', 'Explore', 'Finish'].map((name) => ({
        component: 'ki-carousel-item',
        slots: { '': [name] },
      })),
    },
  },
  version: 1,
};

describe('123 A1 — the rotation floor keeps every spec valid', () => {
  it('S24 a spec with a one-millisecond autoplay renders a carousel that offers Pause', async () => {
    const view = await hostPage();
    const surface = view.document.createElement('main');
    view.document.body.append(surface);

    const rendered = renderUiSpec(oneMillisecondSpec, { surface });

    expect(rendered.diagnostics).toEqual([]);
    expect(rendered.ok).toBe(true);
    const carousel = surface.querySelector('ki-carousel');
    expect(carousel).not.toBeNull();
    await expect
      .poll(() => carousel?.shadowRoot?.querySelector('[part~="rotation"]')?.textContent)
      .toBe('Pause');
  });
});
