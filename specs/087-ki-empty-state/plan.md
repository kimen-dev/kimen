# Implementation plan

1. Define the [public contract](contracts/empty-state.md) and lint the Gherkin
   scenarios.
2. Write the heading-level unit test, catalog test and S-ID browser tests.
3. Scaffold the component. Render a native heading and three content slots in a
   shadow root. Make the message a polite status when the app opts in.
4. Add the semantic token aliases, stories, documentation and four theme and
   scheme captures. Generate and check the public surfaces.
5. Send the implementation commit for design-system re-sync and collect browser
   results and Linux snapshots from the integrator.
