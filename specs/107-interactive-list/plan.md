# Implementation plan

1. Extend the existing list contract and add browser coverage before changing
   the components. Reuse the keyboard and type-ahead utilities.
2. Coordinate direct child options with the list and use ElementInternals for
   submission, required validation, fieldset disabling, and reset.
3. Render native anchors for navigation and style the radio, checkbox and
   chevron as decorative indicators. Preserve static row composition.
4. Publish the additive API through the existing manifests, catalog and
   framework-wrapper pipeline. Extend the existing docs, stories and galleries.
5. Run the build and static gates locally. Run the real-browser matrix and
   refresh changed Linux visual baselines through the integrator.
