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
   version. Fetch only the components you use; `https://kimen.dev/llms-full.txt`
   has them all in one large file.
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

Every `@kimen/*` package is on npm, and they release together at one
version: install the ones you use at the same version. Kimen is pre-1.0, so
expect breaking changes between minor versions. Only to try a change that is
not released yet, link it from a repository build; see
`references/install-from-source.md`.

Then, once per page or app entry point:

```ts
import '@kimen/tokens/css/core';       // required: the theme, light + dark
import '@kimen/tokens/css/ki-button';  // required: one sheet per ki-* tag the page uses
import '@kimen/tokens/css/ki-input';
import '@kimen/tokens/css/base';       // page background, text colour, body font, layout before registration

// Register only what you use (tree-shakable)…
import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';
defineKiButton();

// …or register everything lazily (each component loads on first use).
import { defineCustomElements } from '@kimen/elements/loader';
defineCustomElements();
```

- The token stylesheets are not optional styling: without them the
  components have no appearance. Load them once, before the components
  paint.
- **One token sheet per tag.** The core carries every token but the
  component ones. Each `ki-*` tag the page uses needs its own sheet, named
  like the element import (`@kimen/tokens/css/ki-button` beside
  `@kimen/elements/ki-button`). A tag's sheet already carries the tokens of
  the components that tag renders, so you never add sheets for those; you
  add one for every `ki-*` tag your own markup uses, slotted ones included
  (`ki-tab` and `ki-tab-panel` inside `ki-tabs`). A tag without its sheet
  paints silently wrong.
- **The simple alternative: the full sheet.** `@kimen/tokens/css` in place
  of the core and the tag sheets declares every token in one stylesheet.
  Use it when the page uses most of the catalog or cannot list its tags in
  advance. It costs more: a page with one `ki-button` ships about 8.1 KB of
  token CSS with the core and its sheet, and 20.7 KB with the full sheet
  (brotli).

  ```ts
  import '@kimen/tokens/css';
  import '@kimen/tokens/css/base';
  ```

- Overrides work the same way with either. Load your own `:root` or
  theme-root token overrides after the core. A tag sheet never beats them,
  even when a bundler loads it later.
- Registration is client-side. In server-rendered pages the tags arrive as
  markup and upgrade when the registration code runs. Until then an
  unregistered tag is an inline box, so the labels of group items run
  together (`DayWeekMonth`): load `@kimen/tokens/css/base`, which lays out
  segments, radios, checkboxes, options and menu, list, tab, tree, step,
  timeline, sidebar and mobile-nav items one per line until their tags
  register.
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
  actions take lower variants. A call to action that navigates is the same
  button with `href` (a native link inside). Use `loading` on the button whose
  action is in progress instead of disabling it.
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
- Generated wrappers add typed props and each framework's form idiom, and
  importing a wrapper component registers its element. Install one with the
  tokens, for example `pnpm add @kimen/react @kimen/tokens`: `@kimen/react`
  (peers `react` and `react-dom` `^18 || ^19`), `@kimen/vue` (`vue >=3.4.38`),
  `@kimen/angular` (`@angular/core` and `@angular/forms` `^22.0.0`, `rxjs
  ^7.8.0`). Each depends on `@kimen/elements` at its own version. The plain
  tags always work without them.

## Theming

Customise in this order and stop at the first that works:

1. **Tokens.** Reassign semantic `--ki-*` custom properties (for example
   `--ki-surface-s0`, `--ki-text-high-em`) on `:root`, or for a region on an
   element that carries `data-ki-theme`. Only the root and theme roots
   recompute the tokens that alias the one you set: on a plain element the
   change reaches what reads it directly, not component tokens such as
   `--ki-button-*`. On a page with its own theme, a region repeats that
   theme's name (`<section data-ki-theme="acme" class="sheet">`, the `.sheet`
   rule after the theme rule); another name makes the region another theme,
   starting from Kimen's defaults. Component tokens
   (`--ki-button-md-radius`) also work on a single element. Never style
   component internals.
2. **Parts.** `ki-button::part(…)` for the parts a contract lists.
3. **Slots.** Put your own markup in the slots a contract lists.

The palette (`--ki-color-*` ramps such as `--ki-color-brand-500`) belongs to
themes. Building a theme, a complete restyle the user asked for, may redefine
it, on `:root` or on `[data-ki-theme='name']`; the translucent
`--ki-color-*-500-alpha-*` variants follow their ramp step, and the theme is
then responsible for contrast. Customising an app on an existing theme
reassigns semantic tokens and leaves the palette alone. Preference modes
(more contrast, reduced transparency) apply over any theme on their own. A
theme that wants its own value under a mode sets the mode token,
`--ki-<mode>-<token>` such as `--ki-contrast-more-outline-control` (the
*Preference modes* table of the Tokens reference in Kimen's Storybook lists
them), never the token itself under the mode's media query. A theme never
declares `color-scheme` with attribute specificity or more: that overrides
`data-ki-color-scheme` and breaks a light/dark toggle.

Never use `!important`, `/deep/`-style piercing or inline styles to fight a
component; if you need them, the component is missing a token or part, so
report it instead. Colour scheme follows the OS; force it with
`data-ki-color-scheme="light|dark"` on `<html>`. The Material 3 reference
theme is `import '@kimen/tokens/css/material3'` plus
`<html data-ki-theme="material3">`. In your own CSS around components use
logical properties (`margin-inline`, `padding-block`) so layouts mirror in
right-to-left languages.

## Testing

Test in a real browser, with Playwright or Vitest browser mode: component
roles and names live in shadow roots, which Testing Library queries never
enter. Before you write a test that finds a component by role, waits for it
to render or checks a `ki-alert`, read `references/testing.md`.

## Before you finish

- [ ] Every `ki-*` tag you used is registered (subpath or loader) and every
      icon name is imported.
- [ ] `@kimen/tokens/css/core` loads once, before first paint, with the
      sheet of every `ki-*` tag the page's markup uses, or the full
      `@kimen/tokens/css` in place of both.
- [ ] Every attribute, slot and event name was read from the contract, not
      guessed; enum values are spelled as listed.
- [ ] Every control has an accessible name; one primary action per view.
- [ ] No hard-coded colours, spacings or radii fight the tokens.
- [ ] You looked at the page in a real browser, in light and dark scheme.

Generative UI (an agent producing UI at run time) has its own rules and its
own skill: `kimen-genui`.
