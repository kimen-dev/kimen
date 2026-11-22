// @spec:155-live-surface-reset-focus
// S12 with the real components: the packaged surface document registers every
// catalog element inside a frame, and a live surface renders into a host page
// built in that frame's document (the pattern of containment.browser.spec.ts).
// The person types into a `ki-number-input` or a `ki-date-picker`, the button
// that collects it delivers the entry, and a reset must leave the field empty
// on screen and holding no value. The reset decisions themselves are pinned in
// packages/catalog/tests/live-reset.spec.ts.
import { createLiveSurface, type LiveActionEvent } from '@kimen/catalog';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { createKimenSurfaceResource } from '../src/index.js';

type ViewWindow = Window & typeof globalThis;
type Field = HTMLElement & { value?: unknown };

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

/** The packaged document in a same-origin frame, its elements registered. */
async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('live-reset').text;
  document.body.append(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-date-picker') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

function innerInput(host: Element): HTMLInputElement {
  const input = host.shadowRoot?.querySelector('input');
  if (input === null || input === undefined) {
    throw new Error(`${host.localName} has no inner input yet`);
  }
  return input;
}

// `empty` is the value each component holds when it holds none.
const rows = [
  {
    component: 'ki-number-input',
    empty: undefined,
    entry: '42',
    id: 'quantity',
    kind: 'number',
    value: 42,
  },
  {
    component: 'ki-date-picker',
    empty: '',
    entry: '2026-12-24',
    id: 'due',
    kind: 'date',
    value: '2026-12-24',
  },
] as const;

describe('155 — a reset empties a delivered number field and a delivered date field', () => {
  for (const row of rows) {
    it(`S12 a reset empties the delivered ${row.kind} field "${row.id}"`, async () => {
      const view = await hostPage();
      const surface = view.document.createElement('main');
      view.document.body.append(surface);
      const actions: LiveActionEvent[] = [];
      const live = createLiveSurface({
        actions: ['add'],
        onAction: (event) => actions.push(event),
        surface,
      });
      expect(
        live.apply({
          ops: [
            {
              node: { component: row.component, id: row.id, props: { label: row.id } },
              op: 'insert',
            },
            {
              node: {
                action: 'add',
                collect: { [row.id]: row.id },
                component: 'ki-button',
                id: 'add',
                slots: { '': ['Add'] },
              },
              op: 'insert',
            },
          ],
        }),
      ).toMatchObject({ ok: true });
      const field = surface.querySelector<Field>(row.component);
      const add = surface.querySelector<HTMLElement>('ki-button');
      if (field === null || add === null) {
        throw new Error('the form did not render');
      }
      await expect.poll(() => field.shadowRoot?.querySelector('input') ?? null).not.toBeNull();

      innerInput(field).focus();
      await userEvent.keyboard(row.entry);
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => field.value).toBe(row.value);
      add.click();
      expect(actions.map(({ data }) => data)).toEqual([{ [row.id]: row.value }]);

      const result = live.apply({ ops: [{ id: row.id, op: 'reset' }] });

      expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
      expect(field.value).toBe(row.empty);
      await expect.poll(() => innerInput(field).value).toBe('');
    });
  }
});
