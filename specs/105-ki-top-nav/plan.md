# TopNav implementation plan

1. Freeze the Gherkin contract and record the public surface.
2. Scaffold with the Kimen Nx generator. Specify the menu path, scroll states,
   responsive layout and theme behavior in tests.
3. Build one shadow component with a header layout and a screen app-bar layout.
   Use the shared anchored overlay for the two menu presentations and project
   consumer controls through slots. Keep one heading when the layout changes.
4. Alias semantic tokens in both themes. Build the gallery and authoring examples.
5. Regenerate the catalog, API, docs and framework wrappers. Verify the available
   local gates and hand the browser matrix and design-system card to integration.
