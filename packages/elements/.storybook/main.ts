import type { StorybookConfig } from '@stencil/storybook-plugin';

// Kimen component workshop: stories live next to each component (Art. I:
// the component directory is the single source of truth for its surface);
// long-form docs pages (introduction, theming) live in docs/ as MDX.
const config: StorybookConfig = {
  stories: ['../docs/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: '@stencil/storybook-plugin',
  },
};

export default config;
