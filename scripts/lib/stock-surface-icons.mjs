import { fileURLToPath } from 'node:url';

// The stock MCP Apps document and its server-side preflight use the same
// deliberately small icon inventory. Hosts building their own bundles select
// the modules their surfaces need.
export const stockSurfaceIconModules = Object.freeze([
  fileURLToPath(new URL('../../packages/elements/icons/circle-check.js', import.meta.url)),
]);
