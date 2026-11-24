# Implementation plan for Carousel

1. Scaffold both tags from spec 123. Write node tests for index and range
   rules and browser tests for the contract before component code.
2. Use native scroll snap and logical geometry to synchronize pointer scrolling,
   the public API and position controls. Keep rotation and focus management
   in the carousel and project slide content through the item.
3. Apply semantic tokens to the layout and controls. Add compact gallery
   examples for each layout, stories and authored API guidance.
4. Regenerate tokens, catalog, API and wrapper surfaces. Run the available
   local gates and hand off cross-browser and visual verification.

## Bundle measurements

Node 26.5.0 and pnpm 12.20.0 rebuilt each artifact twice in the assigned
worktree. The base run omitted Carousel source and token files. The second
run restored them and regenerated both packages. The component metadata
records the measured additions.

| Artifact | Build | Raw bytes | Gzip bytes | Brotli bytes |
| --- | --- | ---: | ---: | ---: |
| MCP Apps | Base | 810,714 | 192,031 | 152,715 |
| MCP Apps | Carousel | 833,316 | 197,826 | 157,364 |
| MCP Apps | Added | 22,602 | 5,795 | 4,649 |
| MCP server | Base | 2,777,667 | 532,408 | 390,067 |
| MCP server | Carousel | 2,811,216 | 540,553 | 395,473 |
| MCP server | Added | 33,549 | 8,145 | 5,406 |

The carousel group measured 5.95 kB marginal and 24.98 kB with the
Stencil runtime against the 9 kB and 25 kB element limits.

Amendment A1 (rotation floor) was measured on macOS against main 3329aea1
by rebuilding with and without the change. It adds 148 / 77 / 142 B to the
MCP Apps document and 190 / 84 / −32 B to kimen-mcp (raw / gzip / brotli):
the clamp, the development warning and the longer `autoplay` description,
which kimen-mcp embeds. The positive marginals are added to the carousel's
`sizeBudget`.
