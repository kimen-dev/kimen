# Implementation Plan: Toolbar

## Component

Build the pill, docked surface and optional FAB placement in the shadow
root. The default slot exposes a named toolbar and the FAB slot renders as its
sibling in the floating variant. Reuse the shared keyboard-intent and
roving-focus helpers. Observe slotted controls as they hydrate or change
availability and release any managed tab stops when they leave.

## Styling

Alias the toolbar surfaces, sizing, spacing, focus-related behavior and motion
to Kimen tokens. Use a logical bottom inset and add the platform safe area to
the docked padding. Keep hidden actions reachable by Tab and restore their
surface on focus. Render a system-color outline in forced colors.

## Verification

Trace the contract with real-browser tests and prepare a gallery for both
themes and schemes. Run the applicable local checks, regenerate discovery
surfaces and declare a minor API addition. The integrator runs the browser
matrix and generates Linux visual baselines.
