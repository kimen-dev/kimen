# Implementation plan for Format

[Behavior contract](./spec.md) · [Public API](./contracts/format.md)

- Scaffold all three tags with the component generator. Use one Format token
  source per theme and one shared overview. Discover the tags through the
  standard package, generated catalog, wrapper, and docs paths.
- Put parsing and relative-time calculations in pure helpers. Use Intl for
  localized output. Render native timestamps and keep timer ownership within
  the connected relative-time element.
- Trace the contract through browser tests. Cover the calculation boundaries
  with unit tests, and cover inherited styling, forced colors, reduced motion,
  coarse pointers and assistive text in the browser projects.
- Generate the public surfaces and declare the additions as a minor API change.
  Run the local gates and provide the visual matrix to the integrator.
