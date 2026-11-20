// @spec:078-dialog-trigger
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';
import type { A2uiActionMessage } from '../src/index.js';

const SURFACE_ID = 'modal-sample';
const MODAL = { id: 'root', component: 'Modal', trigger: 'details', content: 'information' };
const INFORMATION = { id: 'information', component: 'Text', text: 'The project is ready.' };
const V09 = { version: 'v0.9.1', catalogId: A2UI_BASIC_CATALOG_IDS[0], pathKey: 'path' };
const V1 = { version: '1.0', catalogId: A2UI_V1_BASIC_CATALOG_IDS[0], pathKey: '@path' };

let surface: HTMLElement;

beforeEach(() => {
  surface = document.createElement('div');
  document.body.replaceChildren(surface);
});

afterEach(() => vi.unstubAllGlobals());

describe('A2UI Modal', () => {
  it.each([V09, V1])(
    'S11 renders a $version Modal as a guarded dialog with open and close invokers',
    ({ version, catalogId, pathKey }) => {
      const onAction = vi.fn<(event: A2uiActionMessage) => void>();
      const adapter = createA2uiAdapter({ onAction, surface });
      expect(
        adapter.apply({ version, createSurface: { surfaceId: SURFACE_ID, catalogId } }).ok,
      ).toBe(true);
      expect(
        adapter.apply({
          version,
          updateDataModel: { surfaceId: SURFACE_ID, value: { title: 'Details' } },
        }).ok,
      ).toBe(true);

      const result = adapter.apply({
        version,
        updateComponents: {
          surfaceId: SURFACE_ID,
          components: [
            MODAL,
            {
              id: 'details',
              component: 'Button',
              child: 'label',
              variant: 'primary',
              action: { event: { name: 'open-details' } },
            },
            { id: 'label', component: 'Text', text: { [pathKey]: '/title' } },
            INFORMATION,
          ],
        },
      });

      expect(result).toMatchObject({ ok: true, degradations: [] });
      const dialog = surface.querySelector('ki-dialog');
      const trigger = surface.querySelector('ki-button[command="show-modal"]');
      const close = dialog?.querySelector('ki-button[slot="footer"][command="close"]');
      expect(dialog?.id).toBeTruthy();
      expect(dialog?.getAttribute('heading')).toBe('Details');
      expect(dialog?.textContent).toContain(INFORMATION.text);
      expect(trigger?.parentElement).toBe(dialog?.parentElement);
      expect(trigger?.textContent).toBe('Details');
      expect(trigger?.getAttribute('variant')).toBe('primary');
      expect(trigger?.getAttribute('commandfor')).toBe(dialog?.id);
      expect(close?.textContent).toBe('Close');
      expect(close?.getAttribute('commandfor')).toBe(dialog?.id);

      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      trigger?.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction.mock.calls[0]?.[0]).toMatchObject({
        version,
        action: { name: 'open-details', sourceComponentId: 'details' },
      });
    },
  );

  it.each([
    {
      label: { id: 'label', component: 'Row', children: ['text'] },
      heading: 'Details',
      selector: 'ki-stack',
      text: 'Details',
    },
    {
      label: { id: 'label', component: 'Icon', name: 'add' },
      heading: 'Dialog',
      selector: 'ki-icon[name="plus"]',
      text: 'Open dialog',
    },
  ])('S11 names a Modal when the trigger label is $label.component', (example) => {
    const { version, catalogId } = V1;
    // Stand in for the glyph the host imported before rendering the surface.
    vi.stubGlobal(Symbol.for('kimen.icon-registry.v1'), new Map([['plus', '<path />']]));
    const adapter = createA2uiAdapter({ surface });
    const result = adapter.apply({
      version,
      createSurface: {
        surfaceId: SURFACE_ID,
        catalogId,
        components: [
          MODAL,
          { id: 'details', component: 'Button', child: 'label' },
          example.label,
          { id: 'text', component: 'Text', text: 'Details' },
          INFORMATION,
        ],
      },
    });

    expect(result).toMatchObject({ ok: true, degradations: [] });
    const trigger = surface.querySelector('ki-button[command="show-modal"]');
    expect(trigger?.querySelector(example.selector)).not.toBeNull();
    expect(trigger?.textContent).toBe(example.text);
    expect(surface.querySelector('ki-dialog')?.getAttribute('heading')).toBe(example.heading);
  });

  it('S11 pairs each repeated Modal with its own dialog and scoped text', () => {
    const { version, catalogId, pathKey } = V1;
    const adapter = createA2uiAdapter({ surface });

    const result = adapter.apply({
      version,
      createSurface: {
        surfaceId: SURFACE_ID,
        catalogId,
        components: [
          {
            id: 'root',
            component: 'Column',
            children: { componentId: 'modal', path: '/projects' },
          },
          { ...MODAL, id: 'modal' },
          { id: 'details', component: 'Text', text: { [pathKey]: 'title' } },
          INFORMATION,
        ],
        dataModel: { projects: [{ title: 'Alpha' }, { title: 'Beta' }] },
      },
    });

    expect(result).toMatchObject({ ok: true, degradations: [] });
    const dialogs = [...surface.querySelectorAll('ki-dialog')];
    const triggers = [...surface.querySelectorAll('ki-button[command="show-modal"]')];
    const dialogIds = dialogs.map((dialog) => dialog.id);
    expect(dialogs.map((dialog) => dialog.getAttribute('heading'))).toStrictEqual([
      'Alpha',
      'Beta',
    ]);
    expect(triggers.map((trigger) => trigger.textContent)).toStrictEqual(['Alpha', 'Beta']);
    expect(new Set(dialogIds).size).toBe(2);
    expect(triggers.map((trigger) => trigger.getAttribute('commandfor'))).toStrictEqual(dialogIds);
  });

  it('S11 waits for referenced children before rendering the pair', () => {
    const { version, catalogId } = V09;
    const adapter = createA2uiAdapter({ surface });
    expect(adapter.apply({ version, createSurface: { surfaceId: SURFACE_ID, catalogId } }).ok).toBe(
      true,
    );
    expect(
      adapter.apply({
        version,
        updateComponents: {
          surfaceId: SURFACE_ID,
          components: [MODAL, { id: 'details', component: 'Text', text: 'Details' }],
        },
      }),
    ).toMatchObject({ ok: true, degradations: [] });
    expect(surface.querySelector('ki-button, ki-dialog')).toBeNull();

    const result = adapter.apply({
      version,
      updateComponents: { surfaceId: SURFACE_ID, components: [INFORMATION] },
    });

    expect(result).toMatchObject({ ok: true, degradations: [] });
    expect(surface.querySelector('ki-button[command="show-modal"]')).not.toBeNull();
    expect(surface.querySelector('ki-dialog')?.textContent).toContain(INFORMATION.text);
  });
});
