# Implementation plan

Extend the existing tabs and tab components. Keep group ownership of
selection, keyboard navigation, and panel relationships. Resolve group
presentation through the existing slotted-tab token cascade.

Add the contract and regression tests before changing behavior. Derive the
new Component API Manifest, catalog, and wrappers from the TypeScript
contract. Extend the existing docs, stories, and gallery. Run local gates
and hand off the browser matrix and Linux baselines for integration.
