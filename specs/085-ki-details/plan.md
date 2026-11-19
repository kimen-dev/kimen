# Implementation plan — Details and accordion

1. Scaffold both tags from the component generator and add the scenario tests.
2. Render native details and summary in the member's light DOM so the native
   name group crosses component boundaries. Keep group names local to each
   accordion and preserve native keyboard behavior and find-in-page reveal.
3. Style the disclosure and group with semantic aliases and add stories, usage
   examples and the two-theme visual fixtures.
4. Regenerate tokens, catalog, manifests and framework wrappers. Declare the
   additive public API and verify the offline gates. Deliver the browser
   matrix, visual baseline generation and manual Find check to the integrator.
