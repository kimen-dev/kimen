import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const budgetScript = fileURLToPath(
  new URL('../../scripts/lib/bundle-size-budget.mjs', import.meta.url),
);
const { tokenStylesheets } = JSON.parse(
  execFileSync(process.execPath, [budgetScript], { encoding: 'utf8' }),
);

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
];
