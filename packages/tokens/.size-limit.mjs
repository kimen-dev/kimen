// When a limit is exceeded, merge main, run pnpm regen, and measure each
// stylesheet with pnpm --filter @kimen/tokens size. If the growth is expected,
// get founder approval and rebase only the exceeded limit on the merged
// measurement, with enough headroom for routine additions.
export default [
  {
    name: 'onmars tokens stylesheet',
    path: 'dist/css/tokens.css',
    limit: '12.4 KB',
  },
  {
    name: 'material3 tokens stylesheet',
    path: 'dist/css/tokens.material3.css',
    // #316 and #341 together measured 5.30 kB after regeneration.
    limit: '5.6 KB',
  },
  {
    name: 'page contract stylesheet',
    path: 'dist/css/base.css',
    limit: '250 B',
  },
];
