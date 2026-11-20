// @spec:129-ki-tool-call
import { expect, it, vi } from 'vitest';

import { type ActionEvent, createLiveSurface, renderUiSpec } from '../src/index.js';

it('S7 registers ToolCall payload slots and routes only its declared retry event', () => {
  const surface = document.createElement('div');
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const props = { name: 'deploy_preview', status: 'failed', retryable: true };
  const result = renderUiSpec(
    {
      version: 1,
      actions: ['retry'],
      root: {
        action: 'retry',
        component: 'ki-tool-call',
        props,
        slots: {
          input: [{ component: 'ki-code-block', slots: { '': ['{"env":"preview"}'] } }],
          output: ['No output'],
          error: ['Build interrupted'],
        },
      },
    },
    { surface, onAction },
  );

  expect(result.ok).toBe(true);
  const tool = surface.querySelector('ki-tool-call');
  if (!tool) throw new Error('Missing catalog ToolCall');
  expect(tool.querySelector('ki-code-block[slot="input"]')?.textContent).toBe('{"env":"preview"}');
  expect(tool.querySelector('[slot="output"]')?.textContent).toBe('No output');
  expect(tool.querySelector('[slot="error"]')?.textContent).toBe('Build interrupted');

  tool.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  tool.dispatchEvent(new CustomEvent('ki-tool-status-change', { bubbles: true }));
  expect(onAction).not.toHaveBeenCalled();

  tool.dispatchEvent(new CustomEvent('ki-tool-retry', { bubbles: true }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: 'retry', data: props, path: 'root' });
});

it('S3 preserves explicit collapse in static and live guarded surfaces', () => {
  const surface = document.createElement('div');
  const props = { name: 'deploy_preview', status: 'failed' };
  const node = { component: 'ki-tool-call', id: 'call', props };

  expect(
    renderUiSpec({ version: 1, root: { ...node, props: { ...props, open: false } } }, { surface })
      .ok,
  ).toBe(true);
  expect(surface.querySelector('ki-tool-call')?.getAttribute('open')).toBe('false');

  surface.replaceChildren();
  const live = createLiveSurface({ surface });
  expect(live.apply({ ops: [{ op: 'insert', node }] }).ok).toBe(true);
  const tool = surface.querySelector('ki-tool-call');
  if (!tool) throw new Error('Missing live ToolCall');
  expect(tool.hasAttribute('open')).toBe(false);
  expect(live.apply({ ops: [{ op: 'set', id: 'call', props: { open: false } }] }).ok).toBe(true);
  expect(tool.getAttribute('open')).toBe('false');
  expect(live.apply({ ops: [{ op: 'set', id: 'call', props: { open: null } }] }).ok).toBe(true);
  expect(tool.hasAttribute('open')).toBe(false);
  expect(surface.querySelector('ki-tool-call')).toBe(tool);
});
