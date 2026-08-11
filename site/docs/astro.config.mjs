// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// The docs site lives inside the single Cloudflare Pages artifact assembled
// by scripts/build-site.sh and published at the domain root: landing at /,
// this site at /docs/, Storybook at /storybook/.
export default defineConfig({
  site: 'https://kimen.dev',
  base: '/docs',
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
        // Keep Starlight's content/navigation engine while translating the
        // approved Kimen docs shell through supported component overrides.
        Header: './src/components/Header.astro',
        Sidebar: './src/components/Sidebar.astro',
        PageTitle: './src/components/PageTitle.astro',
        // Mirrors Starlight's resolved theme into Kimen's scheme attribute so
        // every live ki-* demo follows the docs theme toggle.
        ThemeProvider: './src/components/ThemeProvider.astro',
      },
      customCss: [
        // Kimen token layer: live demos resolve every visual value from it.
        '@kimen/tokens/css',
        './src/styles/fonts.css',
        './src/styles/site.css',
      ],
    }),
  ],
});
