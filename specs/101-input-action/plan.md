# Plan for InputAction

Extend ki-input's existing shadow field and preserve its form behavior. Keep the
new spacing opt-in using the logical inline margins of the slotted action. Alias
the spacing tokens to semantic space in the component token source.

Write browser coverage for the action's geometry, tab stop, accessible name, and
form behavior before implementation. Cover token overrides, forced colors, and
RTL. Reuse existing tests for the base field and the form-associated button.

Document search and subscribe compositions on the existing input pages. Add a
gallery fixture and regenerate the public API, docs, and catalog from source.
Declare the added slot and tokens as a minor API change.
