# Implementation plan for MobileNav

1. Scaffold both tags against the same contract. Use a named native `nav` and a native anchor in each item. Compose `ki-icon` and `ki-counter` with slotted label content.
2. Use safe-area-aware, tokenized fixed and floating styles. Measure the painted bar to reserve room for wrapped labels and watch the viewport while text entry can open the software keyboard.
3. Add browser scenarios for placement, scroll clearance, native keyboard navigation and announced names, plus theme, preference and pointer coverage. Exercise the viewport decision as pure logic.
4. Publish guided examples and galleries in both themes and schemes. Generate token, catalog, manifest and framework surfaces and check the declared API.
