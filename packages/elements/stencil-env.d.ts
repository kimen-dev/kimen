// Components read process.env.NODE_ENV, which Stencil replaces at build time.
// The Stencil program (tsconfig.stencil.json) compiles the package sources
// without the Node types, so it declares only that. The TypeScript gate's
// program gets the full Node types through Storybook and never sees this file.
declare const process: { readonly env: { readonly NODE_ENV?: string } };
