# FileUpload implementation plan

Use a Stencil shadow component with a native Browse button and file input. Keep
batch validation in a pure helper for picker and drop input. Render the accepted
and rejected rows with native list semantics, decorative icons and `ki-progress`.
Announce terminal changes through a persistent polite status region. Associate the
host with a form through ElementInternals.

Use the design-system drop area and compact row layout, with semantic token aliases,
logical properties and an opt-in touch density. Discover the component through the
standard registry and generate its catalog, wrappers, API and documentation surfaces.

Test validation first in Node and trace each S-ID in browser tests. Use the component
gallery for the onmars and Material 3 light and dark snapshots. CI supplies reference
images and runs the three-engine matrix.
