import { expect, it, vi } from 'vitest';
import { renderUiSpec, type ActionEvent } from '../src/index.js';

it('renders suggestion text and dispatches only the declared group selection', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const result = renderUiSpec(
    {
      version: 1,
      actions: ['choose'],
      root: {
        component: 'ki-suggestions',
        props: { label: 'Start a conversation', variant: 'cards', mode: 'fill' },
        action: 'choose',
        slots: {
          '': [
            {
              component: 'ki-suggestion',
              props: { description: 'For the merged pull requests' },
              slots: { '': ['Draft release notes'] },
            },
          ],
        },
      },
    },
    { surface, onAction },
  );

  expect(result.ok).toBe(true);
  const group = surface.querySelector('ki-suggestions');
  const card = group?.querySelector('ki-suggestion');
  if (!group || !card) throw new Error('Missing suggestion composition');

  expect(card.textContent).toBe('Draft release notes');
  expect(card.getAttribute('description')).toBe('For the merged pull requests');
  card.dispatchEvent(new CustomEvent('ki-select', { bubbles: true }));
  group.dispatchEvent(new CustomEvent('ki-change', { bubbles: true }));
  expect(onAction).not.toHaveBeenCalled();

  group.dispatchEvent(new CustomEvent('ki-select', { bubbles: true }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'choose',
    data: { label: 'Start a conversation', variant: 'cards', mode: 'fill' },
    path: 'root',
  });
});

it('reserves the composer binding for application code', () => {
  const surface = document.createElement('div');
  const result = renderUiSpec(
    {
      version: 1,
      root: {
        component: 'ki-suggestions',
        props: { label: 'Start a conversation', composer: 'draft' },
      },
    },
    { surface },
  );

  expect(result.ok).toBe(false);
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ rule: 'unknown-prop' })]),
  );
});
