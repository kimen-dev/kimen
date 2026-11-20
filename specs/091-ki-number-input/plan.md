# Implementation plan

1. Define the numeric, keyboard, accessibility, form and presentation rules in the Gherkin contract.
2. Scaffold with `pnpm component:new ki-number-input --spec 091-ki-number-input`. Commit the unit and S-ID browser tests before implementing their behavior.
3. Use a native text editor for localized entry, with pure number helpers, form association and two optional icon buttons. Style the field through semantic aliases and component tokens.
4. Complete the stories, usage, documentation and visual gallery. Regenerate the public surfaces, catalog and three framework wrappers, then record the API change.
5. Run the local checks. The integrator runs the browser matrix, creates the Linux snapshots in CI and sends the implementation commit for design-system re-sync.
