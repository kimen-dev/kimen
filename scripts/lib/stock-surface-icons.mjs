import { fileURLToPath } from 'node:url';

// The stock MCP Apps document and its server-side preflight use the same
// deliberately small icon inventory. Hosts building their own bundles select
// the modules their surfaces need.
export const stockSurfaceIconNames = Object.freeze(['circle-check']);

export const stockSurfaceIconModules = Object.freeze(
  stockSurfaceIconNames.map((name) =>
    fileURLToPath(new URL(`../../packages/elements/icons/${name}.js`, import.meta.url)),
  ),
);

// Spec 069 S14: the stock document and the bundled server also declare the
// selection as the only names a spec may use, so a glyph a component imports
// to draw itself is never offered to specs. Both builds evaluate this module
// right after the glyph imports, before anything can render or validate.
export const STOCK_SURFACE_ICON_SELECTION = 'kimen-stock:spec-icons';

export function stockSurfaceIconSelectionSource() {
  return `import { selectSpecIcons } from '@kimen/catalog';\nselectSpecIcons(${JSON.stringify(stockSurfaceIconNames)});\n`;
}

/** The esbuild plugin that serves the selection module, resolving the catalog from `resolveDir`. */
export function stockSurfaceIconSelectionPlugin(resolveDir) {
  return {
    name: 'stock-spec-icons',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^kimen-stock:spec-icons$/ }, (args) => ({
        namespace: 'kimen-stock',
        path: args.path,
      }));
      pluginBuild.onLoad({ filter: /.*/, namespace: 'kimen-stock' }, () => ({
        contents: stockSurfaceIconSelectionSource(),
        loader: 'js',
        resolveDir,
      }));
    },
  };
}
