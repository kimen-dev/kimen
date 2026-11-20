import type { StorybookConfig } from '@stencil/storybook-plugin';
import remarkGfm from 'remark-gfm';

// Kimen component workshop: stories live next to each component (Art. I:
// the component directory is the single source of truth for its surface);
// long-form docs pages (introduction, theming) live in docs/ as MDX.
const config: StorybookConfig & { title: string } = {
  stories: [
    '../docs/**/*.mdx',
    '../src/components/ki-*/docs/storybook.mdx',
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    {
      name: '@storybook/addon-docs',
      // MDX 3 is CommonMark only: without GFM, the pipe tables in
      // docs/tokens-reference.mdx and docs/accessibility.mdx render as
      // paragraphs of raw `| … |` text.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
  ],
  // The static page title, "<title> - Storybook". Without it Storybook falls
  // back to a package name and published "storybook - Storybook".
  title: 'Kimen',
  // The manager theme (manager.ts) sets its chrome in Instrument Sans, the
  // site's body face; the manager page loads it from the token package.
  staticDirs: [{ from: '../../tokens/fonts', to: '/fonts' }],
  managerHead: (head = '') => `${head}
    <style>
      @font-face {
        font-family: 'Instrument Sans';
        src: url('./fonts/InstrumentSansVariable.woff2') format('woff2');
        font-weight: 400 700;
        font-display: swap;
      }
    </style>`,
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: '@stencil/storybook-plugin',
  },
};

export default config;
