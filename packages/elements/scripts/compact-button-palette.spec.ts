import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { optimizeCss } from '@stencil/core/compiler';
import { describe, expect, it } from 'vitest';
import { compactButtonPalette } from './compact-button-palette';

const surface = new URL('../src/components/ki-button/ki-button.surface.css', import.meta.url);

describe('shared button palette compaction', () => {
  it('reconstructs the compiled stylesheet byte for byte', async () => {
    const filePath = fileURLToPath(surface);
    const input = await readFile(surface, 'utf8');
    const { output, diagnostics } = await optimizeCss({ input, filePath, minify: true });
    expect(diagnostics).toEqual([]);

    const compacted = compactButtonPalette.transform(
      `export default () => \`${output}\`;`,
      filePath,
    );
    expect(compacted).not.toBeNull();
    if (!compacted) throw new Error('Shared button palette was not compacted');

    const moduleUrl = `data:text/javascript,${encodeURIComponent(compacted.code)}`;
    const { default: renderCss } = (await import(/* @vite-ignore */ moduleUrl)) as {
      default: () => string;
    };
    expect(renderCss()).toBe(output);
  });

  it('skips stylesheets without the exact palette declarations', () => {
    expect(
      compactButtonPalette.transform(
        'export default () => `:host{display:none}`;',
        fileURLToPath(surface),
      ),
    ).toBeNull();
  });
});
