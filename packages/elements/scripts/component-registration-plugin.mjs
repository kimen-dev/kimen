import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
// The inventory belongs to the repository gates, outside the package graph.
const { discoverComponents } = await import(
  new URL('../../../scripts/lib/component-inventory.mjs', import.meta.url).href
);
const registrations = 'virtual:kimen-component-registrations';
const fixtures = 'virtual:kimen-component-fixtures';

/** Emit static per-component imports for the browser gate and the docs demos. */
export function componentRegistrationPlugin({
  workspaceRoot = repositoryRoot,
  usePackageExports = false,
} = {}) {
  return {
    name: 'kimen-component-registration',
    /** @param {string} id */
    resolveId(id) {
      return id === registrations || id === fixtures ? `\0${id}` : null;
    },
    /** @param {string} id */
    async load(id) {
      if (id !== `\0${registrations}` && id !== `\0${fixtures}`) return null;

      const components = await discoverComponents({ workspaceRoot });
      if (id === `\0${fixtures}`) {
        const imports = components.map(({ sourceModule }, index) => {
          const gallery = resolve(workspaceRoot, dirname(sourceModule), 'gallery.ts');
          return `import gallery${index} from ${JSON.stringify(gallery)};`;
        });
        const entries = components.map(({ tag, metadata }, index) => {
          const { barePage, pointer } = metadata;
          return `${JSON.stringify(tag)}: { gallery: gallery${index}, barePage: ${JSON.stringify(barePage)}, pointer: ${JSON.stringify(pointer)} }`;
        });
        return [...imports, `export const componentFixtures = { ${entries.join(',\n')} };`].join(
          '\n',
        );
      }

      const imports = components.map(({ tag, distModule }, index) => {
        const specifier = usePackageExports
          ? `@kimen/elements/${tag}`
          : resolve(workspaceRoot, 'packages/elements', distModule);
        return `import { defineCustomElement as define${index} } from ${JSON.stringify(specifier)};`;
      });
      const definitions = components.map(
        ({ tag }, index) => `[${JSON.stringify(tag)}, define${index}]`,
      );
      return [
        ...imports,
        `const registrations = [${definitions.join(',\n')}];`,
        'export const componentTags = registrations.map(([tag]) => tag);',
        'export function defineAllComponents() {',
        '  for (const [tag, define] of registrations) {',
        '    define();',
        '    if (!customElements.get(tag)) throw new Error(`Built component did not register ${tag}`);',
        '  }',
        '}',
      ].join('\n');
    },
  };
}
