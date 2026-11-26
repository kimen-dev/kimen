import { readFile } from 'node:fs/promises';

// Serve the emitted package verbatim. Vitest's dynamic import wrapper
// belongs to its tester frame and is unavailable in a fresh document.
export function loaderBrowserPlugin() {
  return {
    name: 'kimen-loader-browser-fixture',
    /** @param {{ middlewares: { use(handler: (request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse, next: (error?: unknown) => void) => void): void } }} server */
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const path =
          /^\/kimen-loader-fixture\/(loader\/(?:index|register\/ki-[\w-]+)\.js|dist\/(?:index|components\/[\w.-]+)\.js)$/u.exec(
            pathname,
          )?.[1];
        if (!path) {
          next();
          return;
        }
        try {
          const module = await readFile(new URL(`../${path}`, import.meta.url));
          response.setHeader('content-type', 'text/javascript; charset=utf-8');
          response.end(module);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
