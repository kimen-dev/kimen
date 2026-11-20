# Implementation plan

1. Record the Tree hierarchy, selection, lazy loading, and keyboard contracts.
2. Scaffold both elements through the Kimen generator. Cover the interaction
   scenarios in real-browser tests and test any pure logic in Node.
3. Implement selection and keyboard coordination on the tree and render row,
   disclosure and group states on each item. Use the existing Icon and Spinner.
4. Add semantic token aliases, examples, stories and visual galleries. Verify
   that the layout works in right-to-left text direction and on coarse pointers.
5. Generate and verify the catalog, API manifests and framework wrappers.
   Provide the integration checks and design-system handoff in the PR report.
