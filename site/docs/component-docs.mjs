import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const workspace = new URL('../../', import.meta.url);
const localDocs = 'site/docs/src/content/docs';
const docsExtensions = '{markdown,mdown,mkdn,mkd,mdwn,md,mdx}';
export const localDocsPattern = `${localDocs}/**/[^_]*.${docsExtensions}`;
export const componentDocs = 'packages/elements/src/components/ki-*/docs/site.mdx';

export function docsEntryId(entry) {
  const relativePath = entry.replaceAll('\\', '/');
  if (relativePath.startsWith(`${localDocs}/`)) {
    return relativePath
      .slice(localDocs.length + 1)
      .replace(/\.[^.]+$/u, '')
      .replace(/\/index$/u, '');
  }
  const tag = relativePath.split('/').at(-3);
  return `components/${tag.slice(3)}`;
}

export function componentSidebarItems(root = workspace) {
  // Starlight's autogenerate option uses paths inside its content directory.
  // Derive the same component routes from both supported source locations.
  const entries = globSync([`${localDocs}/components/[^_]*.${docsExtensions}`, componentDocs], {
    cwd: fileURLToPath(root),
  });
  const pathsById = new Map();
  for (const entry of entries) {
    const id = docsEntryId(entry);
    if (pathsById.has(id)) {
      throw new Error(
        `Duplicate component documentation for ${id}: ${pathsById.get(id)}, ${entry}`,
      );
    }
    pathsById.set(id, entry);
  }
  return [...pathsById.keys()].sort();
}
