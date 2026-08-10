// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// The docs site lives inside the single GitHub Pages artifact assembled by
// scripts/build-site.sh: landing at /kimen/, this site at /kimen/docs/,
// Storybook at /kimen/storybook/.
export default defineConfig({
  site: 'https://kimen-dev.github.io',
  base: '/kimen/docs',
  integrations: [
    starlight({
      title: 'Kimen',
      description:
        'Standards-first web components for generative UI: tokens-only theming, agent-legible contracts, a guarded GenUI catalog.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/kimen-dev/kimen',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/kimen-dev/kimen/edit/main/site/docs/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: ['getting-started'],
        },
        {
          label: 'Guides',
          items: [
            'guides/theming',
            'guides/tokens',
            'guides/accessibility',
            'guides/frameworks',
            {
              label: 'Generative UI',
              items: ['guides/ui-spec', 'guides/a2ui', 'guides/mcp-apps'],
            },
          ],
        },
        {
          label: 'Components',
          items: [{ autogenerate: { directory: 'components' } }],
        },
        {
          label: 'Design Tokens',
          items: ['tokens/reference'],
        },
        {
          label: 'Resources',
          items: ['resources/working-with-ai', 'resources/links'],
        },
      ],
      components: {
        // Preserve Starlight's search, theme, language, and social controls in
        // the Kimen glass header shell.
        Header: './src/components/Header.astro',
        // Mirrors Starlight's resolved theme into Kimen's scheme attribute so
        // every live ki-* demo follows the docs theme toggle.
        ThemeProvider: './src/components/ThemeProvider.astro',
      },
      customCss: [
        // Kimen token layer: live demos resolve every visual value from it.
        '@kimen/tokens/css',
        './src/styles/site.css',
      ],
    }),
  ],
});
