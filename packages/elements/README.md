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
consumes; without its stylesheet the components render unstyled.

## Register components

Preferred: import each component from its direct subpath. This registers only
what you use and lets bundlers tree-shake the rest:

```ts
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
import '@kimen/tokens/css';

defineKiButton();
```

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

defineKiButton();

document.querySelector('ki-button')?.addEventListener('click', () => {
  console.log('saved');
});
```

## Theming

```ts
import '@kimen/tokens/css'; // onmars default theme, light/dark via prefers-color-scheme
import '@kimen/tokens/css/material3'; // optional: Material 3 reference theme
```

```html
<html data-ki-theme="material3" data-ki-color-scheme="dark">
```

Every visual value is a `--ki-*` custom property; themes reassign tokens, not
component CSS. Details in the
[`@kimen/tokens` README](https://github.com/kimen-dev/kimen/blob/main/packages/tokens/README.md).

## For agents

[`llms.txt`](./llms.txt) (shipped inside this package) documents every
component — attributes, slots, parts, events, methods, CSS custom properties,
plus when-to-use / when-not-to-use guidance — and
`generated/custom-elements.json` is the machine-readable Custom Elements
Manifest. Both are generated from component JSDoc; never edit them by hand.
The `llms.txt` code examples are executed against the packed packages during
release validation, so they are guaranteed to run.

## Explore

Browse every component with live theme switching in the public
[Storybook](https://kimen-dev.github.io/kimen/storybook/).

## License

[Apache-2.0](https://github.com/kimen-dev/kimen/blob/main/LICENSE)
