// @spec:161-action-is-a-report
// S1 with the real components: the packaged surface document registers every
// catalog element inside a frame, and the guarded renderer renders into a host
// page built in that frame's document (the pattern of
// containment.browser.spec.ts). Each component fires its bound event with no
// gesture at all, and the action still arrives: an action reports an event,
// whatever caused it, and is never the person's consent.
import { type ActionEvent, renderUiSpec, type UiSpecNode } from '@kimen/catalog';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { createKimenSurfaceResource } from '../src/index.js';

type ViewWindow = Window & typeof globalThis;

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

/**
 * Rests the pointer on a spot of the test page far below the frame, so no
 * component in the frame starts hovered (a hovered toast holds its time).
 */
async function parkPointer(): Promise<void> {
  const spot = document.createElement('div');
  spot.style.cssText =
    'position: fixed; inset-block-end: 0; inset-inline-start: 0; inline-size: 8px; block-size: 8px;';
  document.body.append(spot);
  teardown.push(() => {
    spot.remove();
  });
  await userEvent.hover(spot);
}

/** The packaged document in a same-origin frame, its elements registered. */
async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('action-report').text;
  document.body.prepend(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-tree-item') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

const rows: readonly { readonly cause: string; readonly node: UiSpecNode }[] = [
  {
    cause: "a toast's time runs out",
    node: {
      action: { 'ki-dismiss': 'noted' },
      component: 'ki-toast',
      props: { duration: 2000 },
      slots: { '': ['Saved'] },
    },
  },
  {
    cause: 'an image fails to load',
    node: {
      action: { 'ki-error': 'noted' },
      component: 'ki-image',
      props: { alt: 'Chart', loading: 'eager', src: '/kimen-161-missing.png' },
    },
  },
  {
    cause: 'a lazy tree item renders expanded and empty',
    node: {
      action: { 'ki-load': 'noted' },
      component: 'ki-tree-item',
      props: { expanded: true, lazy: true },
      slots: { '': ['Reports'] },
    },
  },
];

describe('161 — an event the component fires on its own still reports its action', () => {
  for (const row of rows) {
    it(`S1 ${row.node.component} reports "noted" when ${row.cause}`, async () => {
      await parkPointer();
      const view = await hostPage();
      const surface = view.document.createElement('main');
      view.document.body.append(surface);
      const actions: ActionEvent[] = [];

      const rendered = renderUiSpec(
        { actions: ['noted'], root: row.node, version: 1 },
        { onAction: (event) => actions.push(event), surface },
      );

      expect(rendered.ok).toBe(true);
      // Nothing touches the frame: the component fires on its own.
      await expect.poll(() => actions.length, { timeout: 8000 }).toBe(1);
      expect(actions[0]?.action).toBe('noted');
    }, 15_000);
  }
});
