import { dirname, resolve } from 'node:path';

export function shareShadowStyles(srcDir: string) {
  const sheets = new Map<string, string>([
    [resolve(srcDir, 'components/ki-button/ki-button.surface.css'), 'button-aria'],
    [resolve(srcDir, 'components/ki-button/ki-button.surface.legacy.css'), 'button-aria'],
    [resolve(srcDir, 'components/ki-button/ki-button.tones.css'), 'button-tones'],
    [resolve(srcDir, 'components/ki-button/ki-button.toggle.css'), 'button-aria'],
    [resolve(srcDir, 'components/ki-button/ki-button.css'), 'button-aria'],
    [resolve(srcDir, 'utils/field-message.css'), 'field-message'],
    [resolve(srcDir, 'utils/label-hint.css'), 'field-message'],
  ]);
  const buttonAria = resolve(srcDir, 'utils/button-aria.ts');

  return {
    name: 'kimen-share-shadow-styles',
    // Stencil qualifies styleUrls imports with the consuming tag. These
    // default-mode shadow sheets have no tag-specific transform or style docs.
    // Keep styleUrls so Stencil assembles each shadow root in its original order.
    resolveId: {
      order: 'pre' as const,
      handler(source: string, importer?: string) {
        if (importer === undefined) return null;
        const [path, query] = source.split('?');
        if (path === undefined || query === undefined) return null;
        const file = resolve(dirname(importer), path);
        if (!sheets.has(file)) return null;

        const params = new URLSearchParams(query);
        return params.size === 2 && params.has('tag') && params.get('encapsulation') === 'shadow'
          ? file
          : null;
      },
    },
    outputOptions(options: { hoistTransitiveImports?: boolean; entryFileNames?: unknown }) {
      // Only the public per-component output uses this entry-point layout.
      if (options.hoistTransitiveImports !== false || options.entryFileNames !== '[name].js') {
        return null;
      }
      return {
        ...options,
        // Button and icon-button already share the aria helper. Reuse its chunk
        // and keep the field sheets together for pages that load both.
        manualChunks(id: string) {
          return id === buttonAria ? 'button-aria' : sheets.get(id);
        },
      };
    },
  };
}
