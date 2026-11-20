import { beforeEach, expect, it, vi } from 'vitest';
import { type ActionEvent, createStreamingRenderer, renderUiSpec } from '../src/index.js';

const node = {
  component: 'ki-prompt-input',
  action: 'compose',
  props: { label: 'Message' },
  slots: { tools: [{ component: 'ki-button', slots: { '': ['Model'] } }] },
};

let surface: HTMLElement;

beforeEach(() => {
  surface = document.createElement('div');
  document.body.replaceChildren(surface);
});

function composer(): HTMLElement & { status?: string; value?: string } {
  const host = surface.querySelector<HTMLElement>('ki-prompt-input');
  if (!host) throw new Error('Expected a rendered composer');
  return host;
}

function request(target: Element, name: string): void {
  target.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: { text: 'Untrusted detail', files: [new File(['abc'], 'incident.csv')] },
    }),
  );
}

it('routes only the composer’s declared action for the current status with scalar data', () => {
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const spec = { version: 1, root: node, actions: ['compose'] };
  expect(renderUiSpec(spec, { surface, onAction }).ok).toBe(true);
  const host = composer();
  const tool = host.querySelector('ki-button');
  if (!tool) throw new Error('Missing tool');
  host.value = 'Edited draft';

  request(tool, 'ki-submit');
  request(host, 'click');
  request(host, 'ki-remove');
  request(host, 'ki-stop');
  host.status = 'submitted';
  request(host, 'ki-submit');
  request(host, 'ki-stop');
  expect(onAction).not.toHaveBeenCalled();

  host.status = 'idle';
  request(host, 'ki-submit');
  host.status = 'streaming';
  request(host, 'ki-submit');
  request(host, 'ki-stop');
  expect(onAction.mock.calls.map(([event]) => event)).toEqual([
    {
      action: 'compose',
      data: { label: 'Message', status: 'idle', value: 'Edited draft' },
      path: 'root',
    },
    {
      action: 'compose',
      data: { label: 'Message', status: 'streaming', value: 'Edited draft' },
      path: 'root',
    },
  ]);

  expect(renderUiSpec({ ...spec, actions: [] }, { surface, onAction }).ok).toBe(false);
  expect(onAction).toHaveBeenCalledTimes(2);
});

it('uses the declared status of an unupgraded streamed composer', () => {
  const onAction = vi.fn<(event: ActionEvent) => void>();
  const stream = createStreamingRenderer({ surface, onAction, actions: ['compose'] });
  expect(stream.push({ ...node, props: { ...node.props, status: 'streaming' } }).ok).toBe(true);
  request(composer(), 'ki-submit');
  request(composer(), 'ki-stop');
  expect(onAction.mock.calls.map(([event]) => event)).toEqual([
    { action: 'compose', data: { label: 'Message', status: 'streaming' }, path: 'stream[0]' },
  ]);
});
