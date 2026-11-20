# Implementation Plan for Search

- Scaffold the form-associated Search element and its declarative suggestion
  companion. Read the supplied children and render suggestions in Search's own
  accessibility tree so the editable combobox can reference its options.
- Use the shared anchored-overlay utilities for the docked top layer and a
  native modal dialog for full-screen search. Preserve the query across
  presentations and restore focus on dismissal.
- Add semantic token aliases in onmars and Material 3, with a fluid bar,
  logical layout, visible focus and system-color support.
- Verify the contract with browser specs, a pointer spec and four theme/scheme
  snapshots. Generate the catalog, public API, docs and framework wrappers
  from the implementation. CI owns Linux visual baselines.
