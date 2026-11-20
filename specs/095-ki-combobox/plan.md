# Implementation plan

1. Define the component and adapter behavior in the feature contract.
2. Scaffold the component with the Nx generator. Write browser, pure-logic and adapter tests against the proposed public behavior.
3. Implement the form field, overlay, list navigation, option presentation and tag removal. Route long A2UI ChoicePickers through the neutral catalog.
4. Build theme tokens, examples, stories and a gallery with closed and expanded states. Regenerate discovery surfaces and declare the API delta.
5. Run local deterministic checks. Hand browser execution, Linux baselines and reference re-sync to the integrator.
