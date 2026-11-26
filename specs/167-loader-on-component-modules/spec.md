# Feature Specification: The lazy loader registers each component from its own module

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II and Art. IX
     (a public entry point changes behaviour), with Art. IV (lightness). -->

**Feature Branch**: `perf/elements-loader-on-components` (spec
`167-loader-on-component-modules`)

**Created**: 2026-11-26

**Status**: The founder approved scenarios S1–S11 on 2026-11-26 and chose
to release the loader change as a breaking change in 0.5.0. The all-107 page
must fit within the current payload in both bundlers.

**Input**: step 3 of the Stencil-vs-Lit report (2026-11-26) and opportunity
10 of the weight report (2026-11-25), both in the founder's `internal/`.
`@kimen/elements` ships Stencil's lazy build, `dist/esm`, only for
`./loader` and the deprecated root: 4,368,929 B with its maps, a third of
the package. The per-component modules in `dist/components` already carry
every component.

**Constitution check**: Art. II requires this contract: the behaviour of a
public entry point changes. Art. IX: it is a breaking change of the loader's
documented behaviour, released in a minor version while Kimen is pre-1.0
(the founder's release rule of 2026-11-20). The public API gate records one addition, `observeRoot`.

## What changes for a consumer

Stencil's lazy runtime can define a tag before its code arrives, because its
component classes are not `HTMLElement` subclasses. The `dist/components`
classes are, so a tag can only be defined once its module has loaded. The
loader therefore watches the document and loads a tag's module the first
time an element of that tag reaches it.

| | Before (Stencil lazy build) | After (`dist/components`) |
|---|---|---|
| When a tag is defined | every tag, when `defineCustomElements()` runs | the first time the document, a Kimen component's shadow root or a root handed to `observeRoot(root)` shows it |
| `customElements.whenDefined(tag)` | resolves at once | resolves when the page first shows the tag |
| A `ki-*` in an application's own shadow root | defined | defined once the root is handed to `observeRoot(root)` |
| `element.componentOnReady()` | present | absent; await `customElements.whenDefined(tag)`, then the first render |
| Synchronous members (`checkValidity()` and the rest) | absent on loader hosts | present |
| `import { KiButton } from '@kimen/elements'` | the lazy build's class | the class `@kimen/elements/ki-button` exports |
| `window.HTMLElement` | patched for ES5 when the loader is imported | untouched |

`defineCustomElements(win?, options?)` keeps its signature and `setNonce`
keeps its own. `options.exclude` keeps excluding tags; the lazy runtime's
other options (`resourcesUrl`, `syncQueue`, `jmp`, `raf`, `ael`, `rel`)
configured a runtime that no longer exists.

## Design decisions

- **Discovery.** One `MutationObserver` watches the document, the open
  shadow root of every Kimen element the loader meets (Kimen components
  draw some children by name, such as `ki-markdown`'s `ki-code-block` and
  `ki-segment`'s `ki-tooltip`), and every root handed to `observeRoot`.
  An undefined `ki-*` element in any of them loads its tag's module, which
  defines the tag. Children drawn in shadow DOM are discovered separately.
- **Chunk grouping.** Each registry entry imports a class-only module. The
  bundler can combine the component facade, its implementation and helpers
  with the same importers. Each independently usable tag has a separate entry,
  and conditional shadow children are discovered at render time.
- **`observeRoot(root)`** is the one new export: it searches a root the
  application owns (an open or closed shadow root, or any element) and keeps
  watching it. It returns a promise that resolves once the components
  already in the root are defined. The name follows the DOM's own
  `MutationObserver.observe`.
- **`defineCustomElements()`** resolves once the components already in the
  document are defined.
- **`setNonce`** keeps its contract: a nonce set before or after the first
  component loads reaches the runtime. The loader imports the runtime
  chunk only with the first component, so a page pays nothing for it until
  then.
- **What replaces `componentOnReady()`**: `customElements.whenDefined(tag)`
  ends when the tag's module has loaded and the element has upgraded; the
  component renders right after it. Tests keep using retrying locators, or
  poll for the part they read, as with the per-component subpaths.
- **The root facade** (`import { KiButton } from '@kimen/elements'`)
  re-exports the 20 frozen values from the per-component modules. Its
  declarations do not change.

## Consumer migration

Keep calling `defineCustomElements()` in the browser. Render or append each
tag before awaiting `customElements.whenDefined(tag)`. Use a retrying locator
or poll for the first render where you used `componentOnReady()`. Pass
application-owned open or closed shadow roots to `observeRoot(root)`, or
register tags directly from their subpaths if you need them before insertion.
Only `exclude` affects registration among the existing loader options.

## Measured weight (to repeat on the final build)

Brotli (quality 11) of every JavaScript file the page requests, bundled as
`scripts/consumer-loader-bundles.mjs` bundles it and served to Chromium; a
prototype of this design on 0.4.0's per-component modules:

| Page | esbuild before | esbuild after | Vite before | Vite after |
|---|---:|---:|---:|---:|
| The loader alone | 16,269 B | 8,592 B (about 2 KB without the static runtime import) | 18,617 B | 4,616 B |
| One `ki-button` | 19,929 B | 12,544 B | 22,304 B | 15,102 B |
| The ten gate components | 59,844 B | 54,862 B | 62,401 B | 57,434 B |

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: The lazy loader registers each component from its own module
  `@kimen/elements/loader` registers a ki-* component the first time a page
  shows it, from the module its `@kimen/elements/<tag>` subpath publishes,
  and downloads nothing for the components the page never shows. It keeps
  every export it had. What changes is when a tag becomes defined: on first
  use, not when the loader starts. The loader searches the page and the
  shadow roots of the Kimen components on it; a shadow root the application
  owns is searched once the application hands it to the loader.

  Rule: The loader defines a component the first time the page shows it

    # S1
    Scenario: A component already on the page renders once the loader starts
      Given a page that shows a ki-button labeled "Continue"
      When the application starts the loader
      Then the ki-button renders a button named "Continue"

    # S2
    Scenario: A component added later renders when it reaches the page
      Given a page whose application started the loader
      When the application appends a ki-card to the page
      Then the ki-card renders

    # S3
    Scenario Outline: A bundled page downloads only the components it shows
      Given an application that starts the loader, bundled with <bundler>
      And a page that shows one ki-button
      When the page loads
      Then the ki-button renders from its own chunk
      And the page requests no chunk of a component it does not show

      Examples:
        | bundler |
        | esbuild |
        | Vite    |

    # S4
    Scenario: A component the page has not shown yet is not defined
      Given a page whose application started the loader and shows no ki-dialog
      When the application asks whether ki-dialog is defined
      Then ki-dialog is not defined

    # S5
    Scenario: Waiting for a component's definition ends when the page first shows it
      Given a page whose application started the loader and waits for ki-dialog to be defined
      When the application appends a ki-dialog to the page
      Then the wait ends
      And the ki-dialog opens when the application calls its show method

    # S6
    Scenario: An excluded component stays undefined
      Given a page whose application started the loader without ki-card
      When the application appends a ki-card to the page
      Then ki-card stays undefined

  Rule: The loader searches the shadow roots of Kimen components and of the roots it is handed

    # S7
    Scenario: A component a Kimen component draws inside its own shadow root renders
      Given a page whose application started the loader and shows no ki-code-block
      When the application appends a ki-markdown whose text holds a fenced code block
      Then the markdown shows that code in a ki-code-block that renders

    # S8
    Scenario: A component inside an application's own shadow root is not found by default
      Given a page whose application started the loader and shows no other ki-button
      When the application renders a ki-button inside the shadow root of its own element
      Then ki-button stays undefined

    # S9
    Scenario: A shadow root handed to the loader has its components defined
      Given a page whose application started the loader and handed it the shadow root of its own element
      When the application renders a ki-button inside that shadow root
      Then the ki-button renders

  Rule: The loader's elements are the per-component elements

    # S10
    Scenario: A form control from the loader reports its validity without waiting
      Given a page whose application started the loader and shows a required, empty ki-input
      When the application checks the input's validity
      Then the check reports the input invalid at once

    # S11
    Scenario: The deprecated root export is the component's own class
      Given an application that imports KiButton from the package root
      When it compares that class with KiButton from @kimen/elements/ki-button
      Then the two are the same class
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a package entry point, not a UI component. Every component keeps its
own contract; the loader changes when its tag is defined.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11 | |
| Keyboard path | | N/A — the loader adds no interaction; each component keeps its keyboard contract |
| Assistive-tech outcome | | N/A — the loader exposes nothing to the accessibility tree |
| Form participation | | N/A — each form control keeps its contract; S10 shows its synchronous validity on a loader host |
| Theming | | N/A — the loader loads no style of its own |
