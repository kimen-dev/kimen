// @ts-check
import { readFileSync } from 'node:fs';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { componentSidebarGroups } from './component-docs.mjs';

// The local factory plugin links the already-built elements through their
// public package exports. It is a repository build-time dependency.
const { componentRegistrationPlugin } = await import(
  new URL('../../packages/elements/scripts/component-registration-plugin.mjs', import.meta.url).href
);

const preserveBuildServerDirAdapter = {
  name: 'kimen-docs-preserve-build-server-dir',
  hooks: {
    'astro:config:done'({ setAdapter }) {
      setAdapter({
        name: 'kimen-docs-preserve-build-server-dir',
        hooks: {},
        adapterFeatures: {
          buildOutput: 'static',
          preserveBuildServerDir: true,
        },
        supportedAstroFeatures: {},
      });
    },
  },
};

// Same build gate as scripts/build-site.sh: the tag exists only when the
// publishing workflow sets the marker. site/analytics.json is read (not
// imported as a module) so a config file consulting a sibling data file
// stays outside the Nx project graph, and only when analytics is on — a
// malformed analytics.json must not break the docs build when it is off.
const analyticsHead =
  process.env.KIMEN_ANALYTICS === '1'
    ? (() => {
        const analytics = JSON.parse(
          readFileSync(new URL('../analytics.json', import.meta.url), 'utf8'),
        );
        return [
          {
            tag: 'script',
            attrs: {
              defer: true,
              src: analytics.scriptUrl,
              'data-website-id': analytics.websiteId,
              'data-domains': analytics.domains,
            },
          },
        ];
      })()
    : [];

// Every docs page shares the site's browser chrome color and social card:
// theme-color follows the visitor's system scheme (paper or charcoal, as on
// the landing, playground and privacy pages), and og:image is the 1200×630
// card scripts/build-site.sh publishes at the site root.
const siteHead = [
  {
    tag: 'meta',
    attrs: { name: 'theme-color', content: '#f9f7f4', media: '(prefers-color-scheme: light)' },
  },
  {
    tag: 'meta',
    attrs: { name: 'theme-color', content: '#1b1916', media: '(prefers-color-scheme: dark)' },
  },
  { tag: 'meta', attrs: { property: 'og:image', content: 'https://kimen.dev/og-image.png' } },
  { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
  { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
  {
    tag: 'meta',
    attrs: {
      property: 'og:image:alt',
      content: 'Kimen: Agents write data. Kimen renders real UI.',
    },
  },
];

// The docs site lives inside the single Cloudflare Pages artifact assembled
// by scripts/build-site.sh and published at the domain root: landing at /,
// this site at /docs/, Storybook at /storybook/.
export default defineConfig({
  site: 'https://kimen.dev',
  base: '/docs',
  vite: { plugins: [componentRegistrationPlugin({ usePackageExports: true })] },
  integrations: [
    preserveBuildServerDirAdapter,
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
          items: ['getting-started', 'guides/connect-agents'],
        },
        {
          label: 'Guides',
          items: ['guides/theming', 'guides/tokens', 'guides/accessibility', 'guides/frameworks'],
        },
        {
          label: 'Generative UI',
          items: ['guides/ui-spec', 'guides/emitting-specs', 'guides/a2ui', 'guides/mcp-apps'],
        },
        {
          label: 'Components',
          items: componentSidebarGroups(),
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
        // Adds the privacy link to every documentation page: /docs/* is the
        // largest measured surface, so it must reach the declaration of what
        // the analytics tag above does.
        Footer: './src/components/Footer.astro',
        Sidebar: './src/components/Sidebar.astro',
        MobileMenuFooter: './src/components/MobileMenuFooter.astro',
        PageTitle: './src/components/PageTitle.astro',
        // Resolve the shared scheme and theme before Starlight and the demos paint.
        ThemeProvider: './src/components/ThemeProvider.astro',
      },
      customCss: [
        // Kimen token layer: live demos resolve every visual value from it.
        '@kimen/tokens/css',
        '@kimen/tokens/css/material3',
        './src/styles/fonts.css',
        './src/styles/site.css',
        './src/styles/home.css',
      ],
      expressiveCode: {
        // Code sits on a charcoal island in both page schemes, as it does on
        // the landing: one dark theme, on the onmars dark s1 surface
        // (site.css resolves that token in the dark scheme for code blocks).
        themes: ['github-dark-default'],
        useDarkModeMediaQuery: false,
        // A plain code frame for every block: shell snippets no longer get a
        // terminal window around a one-line install command. Long lines wrap
        // with a hanging indent instead of scrolling, as on the landing, so
        // no line runs under the copy button (site.css keeps its width clear).
        defaultProps: { frame: 'code', wrap: true },
        styleOverrides: {
          codeBackground: 'var(--ki-surface-s1)',
          borderColor: 'transparent',
          codeFontFamily: 'var(--ki-typography-family-mono)',
          codeFontSize: 'var(--ki-site-docs-code-size)',
          codeLineHeight: 'var(--ki-site-docs-code-line)',
          frames: {
            editorBackground: 'var(--ki-surface-s1)',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      head: [...siteHead, ...analyticsHead],
    }),
  ],
});
