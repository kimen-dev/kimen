// The module the Stencil compiler resolves `@stencil/core/internal/client`
// to, with or without the query its lazy build appends: the client runtime
// each Kimen build bundles, which the elements build's Rollup plugins
// rewrite or name.
const CLIENT_RUNTIME = /[\\/]@stencil[\\/]core[\\/]internal[\\/]client[\\/]index\.js(?:\?.*)?$/u;

/** Whether a Rollup module id is Stencil's client runtime. */
export const isStencilClientRuntime = (id) => CLIENT_RUNTIME.test(id);
