import { setCustomElementsManifest, type Preview } from '@stencil/storybook-plugin';
// Art. I pipeline artifact: docs-json is the generated, committed source of
// component metadata; autodocs and argTypes derive from it, never by hand.
import customElements from '../generated/docs.json';
// Tokens-only styling (Art. VI): components are unstyled without the token
// contract, so the workshop loads the same CSS the consumer would.
import '@kimen/tokens/css';
// The material3 sheet is scoped to [data-ki-theme='material3'], so loading it
// statically is inert until the theme toolbar sets the attribute (opt-in by
// attribute, exactly like a consumer loading both stylesheets).
import '@kimen/tokens/css/material3';
// Page contract (same opt-in a consumer app loads): scheme-aware s0 canvas,
// high-em text and the body font family — without it the dark scheme renders
// on a white canvas and slotted story content inherits browser defaults.
import '@kimen/tokens/css/base';
// The workshop pins the same font fixtures the visual harness vendors, so
// stories render real Inter/Roboto glyphs even when the fonts are not
// installed locally (browser-tests/visual/fonts are the pinned metrics).
import interWoff2Url from '../browser-tests/visual/fonts/InterVariable.woff2?url';
import robotoWoff2Url from '../browser-tests/visual/fonts/RobotoVariable.woff2?url';
// The shipped package deliberately does NOT auto-define custom elements
// (single-export-module, side-effect free), so the workshop registers them
// itself from the custom-elements build: statically importable, so Vite can
// bundle it (the lazy loader's runtime-computed chunk URLs cannot be).
// Every generated `defineCustomElementX` export is one component; new
// components are picked up automatically. Requires `stencil build` first.
import * as components from '../dist/components';

setCustomElementsManifest(customElements);

// Same registration pattern as browser-tests/visual/harness.ts: Inter
// resolves the onmars `--ki-font-family-body`, Roboto the material3 one.
for (const [family, url] of [
  ['Inter', interWoff2Url],
  ['Roboto', robotoWoff2Url],
] as const) {
  const face = new FontFace(family, `url(${url}) format('woff2')`, { weight: '100 900' });
  void face.load().then(() => document.fonts.add(face));
}

// Body text metrics for light-DOM story content (labels, slotted spans):
// base.css paints :root; this pins the workshop's default text to body_1 so
// story content outside a component matches what a consumer app would set.
// Values are tokens only (Art. VI) — no literals.
const workshopBodyMetrics = document.createElement('style');
workshopBodyMetrics.textContent = [
  'body {',
  '  margin: 0;',
  '  font-size: var(--ki-typography-size-body-1);',
  '  line-height: var(--ki-typography-line-height-body-1);',
  '}',
].join('\n');
document.head.append(workshopBodyMetrics);

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
    theme: {
      description: 'Kimen theme (data-ki-theme)',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['onmars', 'material3'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: 'auto',
    theme: 'onmars',
  },
  decorators: [
    (story, context) => {
      const scheme = context.globals['colorScheme'] as string;
      if (scheme === 'light' || scheme === 'dark') {
        document.documentElement.setAttribute('data-ki-color-scheme', scheme);
      } else {
        document.documentElement.removeAttribute('data-ki-color-scheme');
      }
      // onmars is the default theme reached by removing the attribute, the
      // same fallback path a consumer gets for unknown theme names.
      const theme = context.globals['theme'] as string;
      if (theme === 'material3') {
        document.documentElement.setAttribute('data-ki-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-ki-theme');
      }
      return story();
    },
  ],
  tags: ['autodocs'],
};

export default preview;
