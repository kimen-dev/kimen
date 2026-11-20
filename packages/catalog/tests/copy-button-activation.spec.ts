// @spec:086-ki-copy-button
import { expect, it, vi } from 'vitest';

import { type ActionEvent, renderUiSpec } from '../src/index.js';

it('S10 dispatches only the declared action after a successful copy', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const result = renderUiSpec(
    {
      version: 1,
      actions: ['copied'],
      root: {
        action: 'copied',
        component: 'ki-copy-button',
        props: { value: 'invite-link' },
        slots: { '': ['Copy invitation'] },
      },
    },
    { surface, onAction },
  );
  expect(result.ok).toBe(true);
  const control = surface.querySelector('ki-copy-button');
  expect(control?.textContent).toBe('Copy invitation');
  control?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  control?.dispatchEvent(new CustomEvent('ki-copy-error', { bubbles: true }));
  expect(onAction).not.toHaveBeenCalled();

  control?.dispatchEvent(
    new CustomEvent('ki-copy', { bubbles: true, detail: { value: 'invite-link' } }),
  );

  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'copied',
    data: { value: 'invite-link' },
    path: 'root',
  });
});
