# Layout implementation plan

- Scaffold the two tags under the component discovery registry. Keep layout
  gap and minimum tokens in the shared Layout token pair, with semantic aliases.
- Compose shadow slots with CSS flexbox and grid. Use a size query for fixed
  tracks, preserve sparse placement and source order, and keep host semantics
  passive.
- Preserve both A2UI dialects through the guarded renderer with one shared
  Row and Column translation. Keep action and slot order intact.
- Wire component-local stories and galleries, shared package docs, and the
  generated catalog, wrappers and API declaration.
- Run non-browser checks in the assigned worktree. Exercise the browser
  contract and the four theme/scheme galleries in CI.
