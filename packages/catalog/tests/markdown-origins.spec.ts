// @spec:130-ki-markdown

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createLiveSurface, createStreamingRenderer, renderUiSpec } from '../src/index.js';

const node = {
  component: 'ki-markdown',
  id: 'answer',
  props: { 'allow-images': true },
  slots: { '': ['[Guide](https://docs.example/guide)'] },
};
const container = { component: 'div', slots: { '': [node] } };

describe('guarded Markdown URL context', () => {
  it.each([
    [
      'full',
      (surface: Element, allowedUrlOrigins: string[]) =>
        renderUiSpec({ version: 1, root: container }, { surface, allowedUrlOrigins }),
    ],
    [
      'streamed',
      (surface: Element, allowedUrlOrigins: string[]) =>
        createStreamingRenderer({ surface, allowedUrlOrigins }).push(container),
    ],
    [
      'live',
      (surface: Element, allowedUrlOrigins: string[]) =>
        createLiveSurface({ surface, allowedUrlOrigins }).apply({
          ops: [{ op: 'insert', node: container }],
        }),
    ],
  ] as const)('S3 passes the host origin scope to %s Markdown', (_path, render) => {
    const window = new Window();
    const surface = window.document.createElement('main') as unknown as Element;

    expect(render(surface, ['https://docs.example']).ok).toBe(true);
    expect(surface.querySelector('ki-markdown')?.getAttribute('data-ki-markdown-origins')).toBe(
      '["https://docs.example"]',
    );
    expect(surface.querySelector('div')?.hasAttribute('data-ki-markdown-origins')).toBe(false);
  });

  it('S3 preserves an explicitly empty origin scope', () => {
    const window = new Window();
    const surface = window.document.createElement('main') as unknown as Element;
    expect(renderUiSpec({ version: 1, root: node }, { surface, allowedUrlOrigins: [] }).ok).toBe(
      true,
    );
    expect(surface.querySelector('ki-markdown')?.getAttribute('data-ki-markdown-origins')).toBe(
      '[]',
    );
  });

  it.each([[null], ['https://docs.example'], [['https://docs.example', null]]] as const)(
    'S3 cannot widen the policy through malformed origin options %j',
    (allowedUrlOrigins) => {
      const window = new Window();
      const surface = window.document.createElement('main') as unknown as Element;
      const result = renderUiSpec(
        { version: 1, root: node },
        { surface, allowedUrlOrigins: allowedUrlOrigins as unknown as readonly string[] },
      );
      expect(result.ok).toBe(true);
      expect(surface.querySelector('ki-markdown')?.getAttribute('data-ki-markdown-origins')).toBe(
        '[]',
      );
    },
  );

  it('S3 uses the default policy when the host omits the origins option', () => {
    const window = new Window();
    const surface = window.document.createElement('main') as unknown as Element;
    expect(renderUiSpec({ version: 1, root: node }, { surface }).ok).toBe(true);
    expect(surface.querySelector('ki-markdown')?.hasAttribute('data-ki-markdown-origins')).toBe(
      false,
    );
  });

  it('rejects an action bound to rendered Markdown', () => {
    const window = new Window();
    const surface = window.document.createElement('main') as unknown as Element;
    const result = renderUiSpec(
      { actions: ['read'], version: 1, root: { ...node, action: 'read' } },
      { surface },
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      path: 'root.action',
      rule: 'action-not-allowed',
    });
  });
});
