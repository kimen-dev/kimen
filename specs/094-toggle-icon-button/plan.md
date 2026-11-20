# Implementation plan

1. Extend the shipped button contracts and write browser cases for native
   activation, accessibility, form behavior and the appearance of both states.
2. Route state changes through the native click handlers. Preserve the
   existing focus, keyboard, disabled and loading paths.
3. Add semantic token aliases for both states, the outline variant and the
   selected shape. Verify the contrast matrix and reuse the existing
   theme galleries.
4. Update the existing docs, regenerate the public surfaces and run
   the available local gates. Record browser and baseline work for integration.
