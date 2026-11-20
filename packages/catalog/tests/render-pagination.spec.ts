// @spec:100-ki-pagination
import { beforeEach, expect, it, vi } from 'vitest';

import { type ActionEvent, catalogData, createLiveSurface, renderUiSpec } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.append(surface);
});

function spec(props: Record<string, string | number>, action?: string) {
  return {
    version: 1,
    actions: ['paginate'],
    root: { component: 'ki-pagination', props, ...(action === undefined ? {} : { action }) },
  };
}

it.each(['pages', 'compact'])('S11 dispatches the declared page request in %s mode', (variant) => {
  expect(catalogData.components['ki-pagination'].activationEvent).toBe('ki-page-change');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const props = { page: 5, pages: 12, variant };
  expect(renderUiSpec(spec(props, 'paginate'), { onAction, surface }).ok).toBe(true);
  const element = surface.querySelector('ki-pagination');
  if (!element) throw new Error('Pagination did not render');

  element.dispatchEvent(new CustomEvent('ki-load-more'));
  expect(onAction).not.toHaveBeenCalled();

  const detail = { page: 6, pages: -1, variant: 'load-more', undescribed: 8 };
  element.dispatchEvent(new CustomEvent('ki-page-change', { detail }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'paginate',
    data: { ...props, page: 6 },
    path: 'root',
  });
});

it('S12 rejects an origin outside the guarded URL allowlist', () => {
  const options = { allowedUrlOrigins: ['https://shop.example'], surface };
  expect(
    renderUiSpec(spec({ 'href-template': 'https://outside.example/items?page={page}' }), options)
      .ok,
  ).toBe(false);
  expect(surface.children).toHaveLength(0);
  expect(
    renderUiSpec(spec({ 'href-template': 'https://shop.example/items?page={page}' }), options).ok,
  ).toBe(true);
});

it('S11 keeps the selected page event and URL guard after a live patch', () => {
  const onAction = vi.fn();
  const live = createLiveSurface({ actions: ['paginate'], onAction, surface });
  const node = { ...spec({ page: 5, pages: 12 }, 'paginate').root, id: 'pager' };
  expect(live.apply({ ops: [{ node, op: 'insert' }] }).ok).toBe(true);
  const pager = surface.querySelector('ki-pagination');
  if (!pager) throw new Error('Pagination did not render');
  const requestPage = (page: number) =>
    pager.dispatchEvent(new CustomEvent('ki-page-change', { detail: { page } }));

  requestPage(6);
  expect(onAction).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ action: 'paginate', data: { page: 6, pages: 12 } }),
  );

  expect(live.apply({ ops: [{ id: 'pager', op: 'set', props: { variant: 'compact' } }] }).ok).toBe(
    true,
  );
  expect(surface.querySelector('ki-pagination')).toBe(pager);
  requestPage(7);
  expect(onAction).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      action: 'paginate',
      data: { page: 7, pages: 12, variant: 'compact' },
    }),
  );
  expect(
    live.apply({ ops: [{ id: 'pager', op: 'set', props: { variant: 'load-more' } }] }).ok,
  ).toBe(true);
  pager.dispatchEvent(new CustomEvent('ki-load-more'));
  expect(onAction).toHaveBeenCalledTimes(2);

  const linkPatch = live.apply({
    ops: [{ id: 'pager', op: 'set', props: { 'href-template': '?page={page}' } }],
  });
  expect(linkPatch.ok).toBe(false);
  expect(linkPatch.diagnostics[0]?.rule).toBe('ambiguous-activation-event');
  expect(pager.hasAttribute('href-template')).toBe(false);
});

it('rejects an action binding on native URL pagination', () => {
  const result = renderUiSpec(spec({ 'href-template': '?page={page}', pages: 12 }, 'paginate'), {
    surface,
  });
  expect(result.ok).toBe(false);
  expect(result.diagnostics[0]).toMatchObject({
    message:
      'ki-pagination uses native navigation when href-template is supplied; omit the URL template to bind an action',
    rule: 'ambiguous-activation-event',
  });
  expect(surface.children).toHaveLength(0);
});
