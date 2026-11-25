import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const budgetScript = fileURLToPath(
  new URL('../../scripts/lib/bundle-size-budget.mjs', import.meta.url),
);
const { tokenStylesheets, tokenSheets } = JSON.parse(
  execFileSync(process.execPath, [budgetScript], { encoding: 'utf8' }),
);

// Spec 166: one sheet per component directory, as the token build writes them.
const tags = readdirSync(new URL('../elements/src/components/', import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('ki-'))
  .map((entry) => entry.name)
  .sort();
const sheet = (tag) => `dist/css/${tag}.css`;

export default [
  {
    name: 'onmars tokens stylesheet',
    path: 'dist/css/tokens.css',
    limit: `${tokenStylesheets.onmars} B`,
  },
  {
    name: 'material3 tokens stylesheet',
    path: 'dist/css/tokens.material3.css',
    limit: `${tokenStylesheets.material3} B`,
  },
  {
    name: 'page contract stylesheet',
    path: 'dist/css/base.css',
    limit: `${tokenStylesheets.base} B`,
  },
  {
    name: 'core tokens stylesheet',
    path: 'dist/css/core.css',
    limit: `${tokenSheets.core} B`,
  },
  // A page is measured as one bundle, the way an application ships its CSS:
  // each entry imports the sheets the page loads (size-limit would otherwise
  // compress every listed file on its own and add the results).
  {
    name: 'page with ki-button: core and ki-button sheets',
    path: 'size-limit/button-page.css',
    limit: `${tokenSheets.buttonPage} B`,
  },
  {
    name: 'ten-component page: core and their sheets',
    path: 'size-limit/ten-component-page.css',
    limit: `${tokenSheets.tenComponentPage} B`,
  },
  ...tags.map((tag) => ({
    name: `tag sheet ${tag}`,
    path: sheet(tag),
    limit: `${tokenSheets.tagSheet} B`,
  })),
];
