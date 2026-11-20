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

describe('guarded Markdown URL context', () => {
  it.each([
    [
      'full',
      (surface: Element, allowedUrlOrigins: string[]) =>
        renderUiSpec({ version: 1, root: node }, { surface, allowedUrlOrigins }),
    ],
    [
      'streamed',
      (surface: Element, allowedUrlOrigins: string[]) =>
        createStreamingRenderer({ surface, allowedUrlOrigins }).push(node),
    ],
    [
      'live',
      (surface: Element, allowedUrlOrigins: string[]) =>
        createLiveSurface({ surface, allowedUrlOrigins }).apply({ ops: [{ op: 'insert', node }] }),
    ],
  ] as const)('S3 passes the host origin scope to %s Markdown', (_path, render) => {
    const window = new Window();
    const surface = window.document.createElement('main') as unknown as Element;

    expect(render(surface, ['https://docs.example']).ok).toBe(true);
    expect(surface.querySelector('ki-markdown')?.getAttribute('data-ki-markdown-origins')).toBe(
      '["https://docs.example"]',
    );
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
});
