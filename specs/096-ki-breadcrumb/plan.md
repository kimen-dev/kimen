# Implementation plan: Breadcrumb

Use two Stencil tags. The parent owns the semantic list, styles and responsive overflow menu. The data child supplies the text label and destination, following the select/option pattern. Observe the authored path for child, text and destination changes.

Keep native anchors for ancestor navigation in the trail and menu. Share Kimen's overlay positioning and dismissal and its keyboard navigation utilities. Theme both representations through the component tokens and existing density semantics.

Scaffold with the Nx generator. Write and record the scenario tests before implementation. Then build the gallery, docs and usage examples and regenerate the API, catalog and wrappers. The integrator runs the browser matrix and Linux visual baseline workflow.
