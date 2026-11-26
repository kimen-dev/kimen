// Prototype: rewrite an extracted @kimen/elements package so ./loader runs on
// dist/components and dist/esm is gone. Usage: node prototype-loader.mjs <package dir>
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [packageDirectory] = process.argv.slice(2);
const components = join(packageDirectory, 'dist/components');
const tags = (await readdir(components))
  .filter((file) => /^ki-[a-z0-9-]+\.d\.ts$/u.test(file))
  .map((file) => file.slice(0, -'.d.ts'.length))
  .sort();
const index = await readFile(join(components, 'index.js'), 'utf8');
const nonce = /export\{([^}]*)\}from"\.\/stencil-client\.js"/u
  .exec(index)[1]
  .split(',')
  .map((entry) => entry.trim().split(' as '))
  .find(([, name]) => name === 'setNonce')[0];

const loader = `export { ${nonce} as setNonce } from '../dist/components/stencil-client.js';

const modules = {
${tags.map((tag) => `  '${tag}': () => import('../dist/components/${tag}.js'),`).join('\n')}
};

const requested = new Map();
const define = (tag) => {
  let loading = requested.get(tag);
  if (loading === undefined) {
    loading = modules[tag]().then(({ defineCustomElement }) => defineCustomElement());
    requested.set(tag, loading);
  }
  return loading;
};

export async function defineCustomElements(win, options = {}) {
  if (typeof window === 'undefined') return undefined;
  const excluded = new Set(options.exclude ?? []);
  const wanted = (element) =>
    Object.hasOwn(modules, element.localName) && !excluded.has(element.localName);
  const discover = (root) => {
    const found = [];
    if (root.nodeType === 1 && wanted(root) && !customElements.get(root.localName)) found.push(define(root.localName));
    for (const element of root.querySelectorAll(':not(:defined)')) {
      if (wanted(element)) found.push(define(element.localName));
    }
    return found;
  };
  const observer = new MutationObserver((records) => {
    for (const { addedNodes } of records) {
      for (const node of addedNodes) if (node.nodeType === 1) discover(node);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  await Promise.all(discover(document.documentElement));
}
`;
await writeFile(join(packageDirectory, 'loader/index.js'), loader);
await rm(join(packageDirectory, 'dist/esm'), { recursive: true, force: true });
await writeFile(join(packageDirectory, 'dist/index.js'), 'export {};\n');
