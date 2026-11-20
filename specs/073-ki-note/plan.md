# Implementation plan for Note

Scaffold `ki-note` using the component generator. Use Shadow DOM to encapsulate
a tokenized surface and its decorative icon. Project the explanation through the
default slot and expose the surface, icon and message as CSS parts. Select the
default icon by tone and use semantic tokens for the size and color styles.
Follow the reference's first-line icon alignment in each writing direction.

Exercise the contract in the component browser suite, with light and dark
Onmars and Material 3 galleries. Check the token contrast matrix and register
the static component through discovery. Regenerate the public API, catalog,
documentation surfaces and framework wrappers from the component contract.
