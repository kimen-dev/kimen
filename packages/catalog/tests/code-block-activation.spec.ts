// @spec:127-ki-code-block
import { expect, it, vi } from 'vitest';

import { type ActionEvent, renderUiSpec } from '../src/index.js';

it('S12 treats catalog source as literal text and dispatches only the declared copy action', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const source = '  <b>literal</b>\n';
  const result = renderUiSpec(
    {
      version: 1,
      actions: ['copied'],
      root: {
        action: 'copied',
        component: 'ki-code-block',
        props: { language: 'html' },
        slots: { '': [source] },
      },
    },
    { surface, onAction },
  );

  expect(result.ok).toBe(true);
  const block = surface.querySelector('ki-code-block');
  expect(block?.textContent).toBe(source);
  expect(block?.firstElementChild).toBeNull();
  block?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  block?.dispatchEvent(new CustomEvent('ki-copy-error', { bubbles: true }));
  expect(onAction).not.toHaveBeenCalled();

  block?.dispatchEvent(new CustomEvent('ki-copy', { bubbles: true, detail: { value: source } }));

  expect(onAction).toHaveBeenCalledExactlyOnceWith({
    action: 'copied',
    data: { language: 'html' },
    path: 'root',
  });
});
