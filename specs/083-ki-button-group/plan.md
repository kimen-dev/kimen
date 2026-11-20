# Implementation plan for ki-button-group

1. Lint and synchronize the contract, scaffold with Kimen’s component generator, and write the scenario-linked browser tests before implementing behavior.
2. Implement spacing, attachment and size forwarding for the two button types. Use logical edges and the exposed button parts for attachment. Compose the split example with separate primary and menu actions.
3. Use Kimen's existing roving-focus conventions for the toolbar. Preserve keyboard activation, accessible names, icon tooltips, pressed states and the authored tab order outside toolbar mode.
4. Define the component token aliases in both themes. Add the design-system example states to the gallery, Storybook and component documentation.
5. Opt into component discovery. Regenerate and verify the tokens, catalog, wrappers and public API. Hand off all three browsers, Linux baselines and design-system re-sync to integration.
