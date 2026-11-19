# Chip implementation plan

- Scaffold both elements with the Kimen component generator after the contract is lint-green.
- Write scenario tests and unit tests for reorder calculations and catalog action routing.
- Render the three variants using native buttons where there is an action. Let the labelled
  group own reordering and keep focus predictable during removal.
- Use semantic aliases in both themes and cover variants, states and sizes in the galleries.
- Document HTML and guarded catalog usage. Regenerate the public surfaces, declare the minor
  API addition and verify the deterministic checks available in the worktree.
