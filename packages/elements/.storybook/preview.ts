import { setCustomElementsManifest, type Preview } from '@stencil/storybook-plugin';
// Art. I pipeline artifact: docs-json is the generated, committed source of
// component metadata; autodocs and argTypes derive from it, never by hand.
import customElements from '../generated/docs.json';
// Tokens-only styling (Art. VI): components are unstyled without the token
// contract, so the workshop loads the same CSS the consumer would.
import '@kimen/tokens/css';
// The shipped package deliberately does NOT auto-define custom elements
// (single-export-module, side-effect free), so the workshop registers them
// itself from the custom-elements build: statically importable, so Vite can
// bundle it (the lazy loader's runtime-computed chunk URLs cannot be).
// Every generated `defineCustomElementX` export is one component; new
// components are picked up automatically. Requires `stencil build` first.
import * as components from '../dist/components';

setCustomElementsManifest(customElements);

for (const [exportName, exported] of Object.entries(components)) {
  if (exportName.startsWith('defineCustomElement') && exportName !== 'defineCustomElement') {
    (exported as () => void)();
  }
}

const preview: Preview = {
  parameters: {
    docs: {
      source: {
        excludeDecorators: true,
      },
    },
  },
  globalTypes: {
    colorScheme: {
      description: 'Kimen color scheme (data-ki-color-scheme)',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: ['auto', 'light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: 'auto',
  },
  decorators: [
    (story, context) => {
      const scheme = context.globals['colorScheme'] as string;
      if (scheme === 'light' || scheme === 'dark') {
        document.documentElement.setAttribute('data-ki-color-scheme', scheme);
      } else {
        document.documentElement.removeAttribute('data-ki-color-scheme');
      }
      return story();
    },
  ],
  tags: ['autodocs'],
};

export default preview;
