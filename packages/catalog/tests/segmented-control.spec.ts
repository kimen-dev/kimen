import { expect, it, vi } from 'vitest';
import { catalogData, renderUiSpec, type ActionEvent, type Catalog } from '../src/index.js';

const builtIn: Catalog = catalogData;

it('composes segment slots and relays the declared change from the group', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const result = renderUiSpec(
    {
      version: 1,
      actions: ['pick'],
      root: {
        component: 'ki-segmented-control',
        action: 'pick',
        props: { label: 'View', value: 'list', size: 'sm', 'full-width': true },
        slots: {
          '': [
            { component: 'ki-segment', props: { value: 'list' }, slots: { '': ['List'] } },
            { component: 'ki-segment', props: { value: 'board', 'aria-label': 'Board' } },
          ],
        },
      },
    },
    { surface, onAction },
  );
  expect(result.ok).toBe(true);
  expect(Object.keys(builtIn.components['ki-segmented-control']?.events ?? {})).toEqual([
    'ki-change',
  ]);
  expect(Object.keys(builtIn.components['ki-segment']?.slots ?? {})).toEqual(['', 'start']);

  const group = surface.querySelector<HTMLElement & { value: string }>('ki-segmented-control');
  const board = group?.querySelector('ki-segment:last-child');
  if (!group || !board) throw new Error('Missing segment composition');

  expect(board.getAttribute('aria-label')).toBe('Board');

  board.dispatchEvent(new CustomEvent('ki-change', { bubbles: true, detail: { value: 'board' } }));
  expect(onAction).not.toHaveBeenCalled();

  group.value = 'board';
  group.dispatchEvent(new CustomEvent('ki-change', { bubbles: true, detail: { value: 'board' } }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'pick',
    data: { label: 'View', value: 'board', size: 'sm', 'full-width': true },
    path: 'root',
  });
});
