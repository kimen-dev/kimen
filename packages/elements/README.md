# @kimen/elements

Kimen web components (`ki-*`): standards-first [Stencil](https://stenciljs.com)
components with tokens-only styling and machine-readable contracts (Custom
Elements Manifest + `llms.txt`). Part of
[Kimen](https://github.com/kimen-dev/kimen), an AI-first Web Components
foundation for generative UI.

**Status**: pre-v1, not published to npm yet. The instructions below are the
contract the first release ships with; they are validated in CI against
packed tarballs on every release dry run.

## Install

```sh
pnpm add @kimen/elements @kimen/tokens
# or: npm install @kimen/elements @kimen/tokens
```

`@kimen/tokens` provides the `--ki-*` custom properties every component
consumes; without its stylesheet the components render unstyled. Its
`@kimen/tokens/css/base` export is the **page contract** — load it once per
page (see [Theming](#theming)).

## Register components

Preferred: import each component from its direct subpath. This registers only
what you use and lets bundlers tree-shake the rest:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';

defineKiButton();
```

Each `@kimen/elements/ki-*` subpath is a single-export module: importing it
has no side effects and nothing registers until you call
`defineCustomElement()`.

Alternative: the lazy loader registers every `ki-*` tag up front and fetches
each implementation on first use — convenient when you render arbitrary
subsets of the catalog and cannot know the tags in advance:

```ts
import { defineCustomElements } from '@kimen/elements/loader';

defineCustomElements();
```

Imports from the package root (`import { KiButton } from '@kimen/elements'`)
are a deprecated compatibility facade; see the
[root-imports migration guide](https://github.com/kimen-dev/kimen/blob/main/docs/migrations/root-imports.md).

## Minimal example

With any bundler that resolves package exports and CSS imports (Vite shown):

```html
<!-- index.html -->
<ki-button variant="primary">Save</ki-button>
<script type="module" src="/main.ts"></script>
```

```ts
// main.ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';

defineKiButton();

document.querySelector('ki-button')?.addEventListener('click', () => {
  console.log('saved');
});
```

## Theming

```ts
import '@kimen/tokens/css'; // onmars default theme, light/dark via prefers-color-scheme
import '@kimen/tokens/css/base'; // page contract: color-scheme + page colors
import '@kimen/tokens/css/material3'; // optional: Material 3 reference theme
```

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

`@kimen/tokens/css/base` is the page contract: it declares `color-scheme` and
paints the page from the semantic tokens, which a token-only stylesheet
cannot do. Without it, a dark-scheme page renders 14 of 29 components below
4.5:1 contrast — the components paint correct dark-scheme text while the
browser keeps a light canvas. Load it, or pin the page with
`data-ki-color-scheme="light"`.

Every visual value is a `--ki-*` custom property; themes reassign tokens, not
component CSS. Details in the
[`@kimen/tokens` README](https://github.com/kimen-dev/kimen/blob/main/packages/tokens/README.md).

## Server-side rendering

The components are client-side custom elements. Importing a `ki-*` subpath is
side-effect-free and safe in server code, but `defineCustomElement()` and the
loader touch `customElements`, so call them only in code that runs in the
browser (a client entry point, a framework `onMounted`/`useEffect` hook, or a
plain `<script type="module">`). Static and server-rendered HTML containing
`ki-*` tags is fine: the tags upgrade when the definitions load.

## Frameworks

Custom elements work natively in React 19+, Vue 3 and Angular: set properties
and attributes as usual and listen to the `ki-*` `CustomEvent`s
(`ki-change`, `ki-close`, `ki-dismiss`) with each framework's event syntax.
Form controls participate in native forms via `ElementInternals`. Details and
per-framework notes live in the
[framework documentation](https://kimen.dev/docs/).

## For agents

[`llms.txt`](./llms.txt) (shipped inside this package) documents every
component — attributes, slots, parts, events, methods, CSS custom properties,
plus when-to-use / when-not-to-use guidance — and
`generated/custom-elements.json` is the machine-readable Custom Elements
Manifest. Both are generated from component JSDoc; never edit them by hand.
The `llms.txt` code examples are executed against the packed packages during
release validation, so they are guaranteed to run.

## Explore

Read the guides and per-component pages on the
[documentation site](https://kimen.dev/docs/), or browse
every component with live theme switching in the public
[Storybook](https://kimen.dev/storybook/).

## License

[Apache-2.0](https://github.com/kimen-dev/kimen/blob/main/LICENSE)
