# Implementation plan

1. Extend the shipped shadow card and its component token family. Reuse its
   slots, region observer and density handling.
2. Add a native heading control, keyboard focus paint and selectable surface
   activation. Check separate controls and activation inside forms.
3. Derive the catalog and wrappers from Stencil metadata. Use the existing
   guarded renderer URL and event policies.
4. Validate contract, traceability, build, unit tests, contrast, API, lint and
   generated surfaces locally. Hand off browser runs and Linux snapshots to
   the integrator.

## Constitutional check

The contract adds opt-in API as a MINOR change. The card retains its
component budget and adds no runtime dependency. Native controls provide
roles and keyboard behavior. Both themes derive new colour pairs from the
semantic layer. Catalog activation uses the existing declared-action policy.
