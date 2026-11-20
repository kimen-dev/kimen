// Stencil emits separate direct and lazy builds. The side-effect modules and
// catalog guard resolve the same geometry in whichever build the host uses.
const registryKey = Symbol.for('kimen.icon-registry.v1');

export function getIcon(name) {
  return globalThis[registryKey]?.get(name);
}

export function registerIcon(name, markup) {
  let registry = globalThis[registryKey];
  if (registry === undefined) {
    registry = new Map();
    Object.defineProperty(globalThis, registryKey, { value: registry });
  }
  registry.set(name, markup);
}
