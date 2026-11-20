// @spec:100-ki-pagination
import { beforeEach, expect, it, vi } from 'vitest';

import { type ActionEvent, createLiveSurface, renderUiSpec } from '../src/index.js';

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

it.each([
  ['pages', 'ki-page-change', { page: 6 }],
  ['compact', 'ki-page-change', { page: 6 }],
  ['load-more', 'ki-load-more', undefined],
] as const)('S11 dispatches only the declared %s pagination action', (variant, type, detail) => {
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const props = { page: 5, pages: 12, variant };
  expect(renderUiSpec(spec(props, 'paginate'), { onAction, surface }).ok).toBe(true);
  const element = surface.querySelector('ki-pagination');
  if (!element) throw new Error('Pagination did not render');

  const inactive = type === 'ki-page-change' ? 'ki-load-more' : 'ki-page-change';
  element.dispatchEvent(new CustomEvent(inactive, { detail: { page: 7 } }));
  expect(onAction).not.toHaveBeenCalled();

  element.dispatchEvent(new CustomEvent(type, { detail }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'paginate',
    data: { ...props, ...(detail ?? {}) },
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

it('S11 routes the new variant after a live patch and keeps the same pager', () => {
  const onAction = vi.fn();
  const live = createLiveSurface({ actions: ['paginate'], onAction, surface });
  const node = { ...spec({ page: 5, pages: 12 }, 'paginate').root, id: 'pager' };
  expect(live.apply({ ops: [{ node, op: 'insert' }] }).ok).toBe(true);
  const pager = surface.querySelector('ki-pagination');
  if (!pager) throw new Error('Pagination did not render');
  const requestPage = () =>
    pager.dispatchEvent(new CustomEvent('ki-page-change', { detail: { page: 6 } }));

  requestPage();
  expect(onAction).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ action: 'paginate', data: { page: 6, pages: 12 } }),
  );

  expect(
    live.apply({ ops: [{ id: 'pager', op: 'set', props: { variant: 'load-more' } }] }).ok,
  ).toBe(true);
  expect(surface.querySelector('ki-pagination')).toBe(pager);
  requestPage();
  expect(onAction).toHaveBeenCalledTimes(1);
  pager.dispatchEvent(new CustomEvent('ki-load-more'));
  expect(onAction).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      action: 'paginate',
      data: { page: 5, pages: 12, variant: 'load-more' },
    }),
  );

  const linkPatch = live.apply({
    ops: [{ id: 'pager', op: 'set', props: { 'href-template': '?page={page}' } }],
  });
  expect(linkPatch.ok).toBe(false);
  expect(linkPatch.diagnostics[0]?.rule).toBe('ambiguous-activation-event');
  expect(pager.hasAttribute('href-template')).toBe(false);
});

it('keeps native URL navigation and guarded actions separate', () => {
  const result = renderUiSpec(spec({ 'href-template': '?page={page}', pages: 12 }, 'paginate'), {
    surface,
  });
  expect(result.ok).toBe(false);
  expect(result.diagnostics[0]?.rule).toBe('ambiguous-activation-event');
  expect(surface.children).toHaveLength(0);
});
