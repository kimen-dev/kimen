---
name: kimen-components
description: >-
  Build ordinary web pages and apps with the Kimen component library
  (`ki-*` web components, `@kimen/elements`, `@kimen/tokens`, `--ki-*` design
  tokens). Use it whenever code adds, configures, themes or debugs a `ki-*`
  element in an application: installing and registering components, loading
  the token stylesheets, picking the right component for a job, forms and
  events, React/Vue/Angular integration, theming and dark mode. Not for
  authoring new `ki-*` components inside the Kimen repository itself (that is
  the `frontend-best-practices` skill there), and not for agent-generated UI
  specs (use `kimen-genui`).
---

# Using Kimen components in an application

Kimen is a library of standards-based web components (`<ki-button>`,
`<ki-card>`, `<ki-input>`, …) whose every visual value comes from `--ki-*`
design tokens. They are plain custom elements: HTML in, DOM events out, in
any framework or none.

## Rule zero: read the contract, never guess it

Kimen ships its component contracts in machine-readable form, generated from
the source, so they cannot drift. Before you write an attribute, slot, event
or token name, read it from one of these, in this order of convenience:

1. **The Kimen MCP server**, if it is connected (tools named
   `kimen_list_components` and `kimen_describe_component`). The listing gives
   every component's when-to-use guidance in one call.
2. **llms.txt**: `https://kimen.dev/llms.txt` is the index (one line per
   component); each line links the component's full contract, for example
   `https://kimen.dev/llms/ki-button.md`. Inside an installed package the
   same files are at `node_modules/@kimen/elements/llms.txt` and
   `node_modules/@kimen/elements/llms/<tag>.md` and match the installed
   version. Fetch only the components you use; `llms-full.txt` is large.
3. **custom-elements.json** (`@kimen/elements/generated/custom-elements.json`)
   when a tool wants structured data.

Each contract has a **When to use** and a **When not to use** section. Follow
them: they are the library's design decisions, not suggestions. If the
"when not to use" names another component, use that one.

## Install and load

Install both packages from npm with the project's package manager:

```sh
pnpm add @kimen/elements @kimen/tokens   # or: npm install @kimen/elements @kimen/tokens
```

Kimen is pre-1.0, so expect breaking changes between minor versions. To use
an unreleased change, or a Kimen package that has no release on npm yet
(`npm view <package> version` prints nothing, or only `0.0.0`, which reserves
the name), link it from a repository build; see
`references/install-from-source.md`.

Then, once per page or app entry point:

```ts
import '@kimen/tokens/css';        // required: the theme, light + dark
import '@kimen/tokens/css/base';   // optional: page background, text colour, body font

// Register only what you use (tree-shakable)…
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
defineKiButton();

// …or register everything lazily (each component loads on first use).
import { defineCustomElements } from '@kimen/elements/loader';
defineCustomElements();
```

- The token stylesheet is not optional styling: without `@kimen/tokens/css`
  the components have no appearance. Load it once, before the components
  paint.
- Registration is client-side. In server-rendered pages the tags arrive as
  markup and upgrade when the registration code runs.
- Icons are per-glyph imports of Lucide names, made before the icon mounts:
  `import '@kimen/elements/icons/triangle-alert';` then
  `<ki-icon name="triangle-alert"></ki-icon>`. A name that was not imported
  draws nothing.
- Components register the glyphs they draw themselves (the close `x`, the
  chevrons, `plus` and `minus`): import only the names your own `ki-icon`
  elements use.

## Choosing components

- Prefer native HTML for what HTML already does well (headings, paragraphs,
  links inside prose, tables of plain text) and Kimen for behaviour and
  consistent styling: buttons, form controls, dialogs, tabs, menus, alerts,
  toasts, cards, layout stacks (`ki-stack`, `ki-grid`).
- One primary action per view (`<ki-button variant="primary">`); supporting
  actions take lower variants. Use `loading` on the button whose action is in
  progress instead of disabling it.
- Status and feedback: inline persistent message → `ki-alert`; transient
  confirmation → `ki-toast` in one `ki-toaster` per page; short status text
  on an entity → `ki-badge`; progress of a task → `ki-progress`.
- Overlays: `ki-dialog` (open it declaratively from a `ki-button` with
  `commandfor`/`command="show-modal"`), `ki-popover`, `ki-menu`, `ki-tooltip`
  (only for a hint that is also discoverable elsewhere).
- When two components seem to fit, read both contracts' when-not-to-use
  sections; they name the boundary.

## Forms and events

- Form controls (`ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox`,
  `ki-radio-group`, `ki-switch`, …) are form-associated: give them a `name`
  inside a native `<form>` and they submit, reset and validate like native
  controls. No framework binding is needed.
- Listen to `input` and `change` exactly as on native controls (Kimen
  re-dispatches `change` across the shadow boundary). Component
  notifications are `ki-*` CustomEvents with a typed `detail`, such as
  `ki-change` on `ki-tabs` or `ki-close` on `ki-dialog`; the contract lists
  each event and its detail.
- Every control needs an accessible name: its `label` attribute or slotted
  text, as the contract specifies. Do not add `role` or `aria-*` that
  duplicate what the component already exposes.
- When a question is already written on the page, name `ki-radio-group` or
  `ki-checkbox-group` from it with the host's `aria-labelledby` and omit
  `label`. To keep a `label` as the name but not show it, use `label-hidden`;
  never hide it with `::part()` and a clip, which leaves it in reading order.

## Frameworks

- **React 19**: use the tags directly. Props that match element properties
  are set as properties; events bind as `on` + the exact event name
  (`onki-dismiss`, `onki-close`). Declare the tags in `JSX.IntrinsicElements`
  for types (the element interfaces are exported from each subpath).
- **Vue 3**: set `compilerOptions.isCustomElement: (tag) => tag.startsWith('ki-')`
  in the Vue plugin, then bind with `:prop` and `@event` (`@ki-close`).
- **Angular**: add `CUSTOM_ELEMENTS_SCHEMA`, bind `[prop]` and `(event)`.
- Generated wrappers (`@kimen/react`, `@kimen/vue`, `@kimen/angular`) add
  typed props and each framework's form idiom. Use them only if they resolve
  from your registry or link; the plain tags always work.

## Theming

Customise in this order and stop at the first that works:

1. **Tokens.** Reassign semantic `--ki-*` custom properties (for example
   `--ki-surface-s0`, `--ki-text-high-em`) on `:root` or a container. Never
   reassign primitive palette tokens and never style component internals.
2. **Parts.** `ki-button::part(…)` for the parts a contract lists.
3. **Slots.** Put your own markup in the slots a contract lists.

Never use `!important`, `/deep/`-style piercing or inline styles to fight a
component; if you need them, the component is missing a token or part, so
report it instead. Colour scheme follows the OS; force it with
`data-ki-color-scheme="light|dark"` on `<html>`. The Material 3 reference
theme is `import '@kimen/tokens/css/material3'` plus
`<html data-ki-theme="material3">`. In your own CSS around components use
logical properties (`margin-inline`, `padding-block`) so layouts mirror in
right-to-left languages.

## Before you finish

- [ ] Every `ki-*` tag you used is registered (subpath or loader) and every
      icon name is imported.
- [ ] `@kimen/tokens/css` loads once, before first paint.
- [ ] Every attribute, slot and event name was read from the contract, not
      guessed; enum values are spelled as listed.
- [ ] Every control has an accessible name; one primary action per view.
- [ ] No hard-coded colours, spacings or radii fight the tokens.
- [ ] You looked at the page in a real browser, in light and dark scheme.

Generative UI (an agent producing UI at run time) has its own rules and its
own skill: `kimen-genui`.
