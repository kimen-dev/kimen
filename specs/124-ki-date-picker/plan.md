# DatePicker implementation plan

1. Lint the behavior contract and scaffold the component with the Nx generator.
2. Write pure date-logic tests and browser behaviors mapped to scenario IDs.
3. Implement UTC civil-date arithmetic and localized formatting and parsing.
4. Connect the form lifecycle and calendar draft to a non-modal anchored grid.
5. Build both token themes, document the live examples and regenerate the
   wrappers, catalog, token sheets and API snapshot.
6. Verify the offline gates. The integrator runs the browser matrix, manual APG
   walkthrough and Linux visual baselines, then supplies the shipping commit to
   the design system for synchronization.
