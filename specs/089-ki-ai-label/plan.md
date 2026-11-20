# Implementation plan for AI provenance

Keep the AI label in its own Stencil component. Use the icon registry for
sparkles and the anchored-overlay utility for geometry, top-layer display
and dismissal. Render the provenance text directly and delegate reversion
to the application via a single event.

Append a same-shadow-root provenance description to `ki-input` when its end
slot contains an AI label. Preserve the field's existing help, error, name
and form logic.

Alias the component tokens to semantic tokens in both themes. Discover the
component through its registry entry, generate the public surfaces, then
verify traceability, API, token contrast, lint, build and component inventory.
The integrator runs the browser matrix and captures Linux visual baselines.
