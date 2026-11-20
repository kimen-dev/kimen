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
