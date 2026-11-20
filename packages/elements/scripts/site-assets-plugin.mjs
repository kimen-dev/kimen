import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * Serve the generated token stylesheets where the hand-written site asks for
 * them while the browser suite mounts it from source.
 *
 * scripts/build-site.sh copies packages/tokens/dist/css/*.css into the
 * published assets/tokens/ directory, and the site scripts resolve the
 * optional Material 3 stylesheet against their own module URL. Mounted from
 * site/ in the browser suite, that address is site/assets/tokens/, which only
 * exists in the assembled artifact. Without this the request fails with a 404
 * and the page correctly withdraws the theme, so the suite would be testing a
 * blocked network instead of the published site.
 */
export function siteAssetsPlugin({ workspaceRoot = repositoryRoot } = {}) {
  const requestPrefix = `/@fs${join(workspaceRoot, 'site/assets/tokens')}/`;
  const tokensDirectory = join(workspaceRoot, 'packages/tokens/dist/css');
  const published = new Set(['tokens.css', 'tokens.material3.css']);

  return {
    name: 'kimen-site-assets',
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
        const file = path.startsWith(requestPrefix) ? path.slice(requestPrefix.length) : '';
        if (!published.has(file) || basename(file) !== file) {
          next();
          return;
        }
        try {
          const stylesheet = await readFile(join(tokensDirectory, file));
          response.setHeader('content-type', 'text/css; charset=utf-8');
          response.end(stylesheet);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
