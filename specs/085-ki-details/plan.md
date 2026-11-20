# Implementation plan — Details and accordion

1. Scaffold both tags from the component generator and add the scenario tests.
2. Render native details and summary in shadow DOM to adopt their stylesheet
   under the MCP Apps content policy. Coordinate accordion membership and
   same-tree name groups while preserving keyboard behavior and native reveal.
3. Style the disclosure and group with semantic aliases and add stories, usage
   examples and the two-theme visual fixtures.
4. Regenerate tokens, catalog, manifests and framework wrappers. Declare the
   additive public API and verify the offline gates. Deliver the browser
   matrix, visual baseline generation and manual Find check to the integrator.
