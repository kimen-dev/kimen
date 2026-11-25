# Testing pages that use Kimen components

Kimen components render their roles, names and states inside open shadow
roots. A test sees them only with a tool that looks inside shadow roots,
running in a real browser.

## Use a real browser

- Playwright locators (`getByRole`, `getByText`, `getByLabel`, CSS) pierce
  open shadow roots. XPath does not.
- Vitest browser mode with the Playwright provider, which Kimen's own suites
  use, does the same: `page.getByRole` from `vitest/browser` finds the
  button inside a component's shadow root.
- Testing Library queries (`getByRole`, `getByText`, …) search the light DOM
  only. They never enter a shadow root, in jsdom or in a real browser:
  `queryAllByRole(document.body, 'alert')` finds nothing on a page with a
  danger `ki-alert`. `getByText` finds text you slotted, never text a
  component draws itself, such as its `heading`. jsdom also runs no layout,
  so visibility and computed styles cannot be checked there.

## Wait for the first render, not only the tag

- `customElements.whenDefined('ki-alert')` resolves when the tag is
  registered, not when the component has rendered. With the lazy loader
  (`defineCustomElements()`), every tag is registered before its code loads,
  so the shadow root can still be empty after `whenDefined`.
- Locator assertions and actions retry until they match, so they cover that
  gap: Playwright's `expect(locator)` assertions and actions wait, and so
  does Vitest's `expect.element(locator)`. Prefer them.
- Before you read the DOM directly (`page.evaluate`, `element.shadowRoot`, a
  property), wait for the first render. With the lazy loader, await
  `element.componentOnReady()` (a Stencil method that the per-component
  `defineCustomElement()` build does not have). Otherwise poll
  (`expect.poll`) for the part you need.

## Find a `ki-alert` by its text, then check its role

- `ki-alert` exposes `role="alert"` for `tone="danger"` and
  `tone="warning"`, and `role="status"` for every other tone (`neutral`,
  `success`, `info`, no tone, an unknown value). Pick the role by tone:
  `getByRole('alert')` does not find a success message.
- `alert` and `status` take their accessible name from the author, never
  from their content (ARIA). The message is not the name:
  `getByRole('alert', { name: 'Payment failed' })` matches nothing, and
  Chromium's accessibility tree gives the region an empty name too.
- `.filter({ hasText })` on the role does not match the message either. The
  role sits on an element inside the shadow root, the message is slotted
  text, and the text match does not follow it through the slot. It matches
  only text the component draws itself, such as `heading`.
- Match the `ki-alert` element by its text, then check the role inside it:

```ts
const alert = page.locator('ki-alert', { hasText: 'Payment failed' });
await expect(alert.getByRole('alert')).toBeVisible(); // danger and warning
await expect(alert).toMatchAriaSnapshot('- alert: Payment failed'); // role and text together
```

In Vitest browser mode, scope the same way from the element you mounted:
`page.elementLocator(alertElement).getByRole('alert')`.

## Never wrap a `ki-alert` in another live region

- A `ki-alert` is its own live region. Do not put it inside `role="alert"`,
  `role="status"` or `aria-live` markup of your own. That nests two live
  regions, which screen readers handle inconsistently; some announce the
  message twice.
- It also breaks tests: `getByRole('alert')` resolves to both regions, and
  Playwright's strict mode fails every action and assertion on that locator.
- To have a message announced, insert the `ki-alert` when the message
  appears, or show it again by clearing `dismissed`. An alert present at
  page load is exposed with its role, but platforms do not reliably announce
  it.
