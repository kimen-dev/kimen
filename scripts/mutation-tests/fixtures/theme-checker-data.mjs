import { readFileSync } from 'node:fs';

import { packThemeCheckerData } from '../../../packages/tokens/scripts/generate-theme-checker-data.mjs';

// Stryker omits dist. Supply the packed form of the committed build inventory.
const inventory = new URL(
  '../../../packages/tokens/generated/theme-checker-data.json',
  import.meta.url,
);
export default packThemeCheckerData(JSON.parse(readFileSync(inventory, 'utf8')));
