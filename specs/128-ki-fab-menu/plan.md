# Implementation plan · Floating action menu

1. Check the behavior contract and scaffold the menu and its item from the Nx generator.
2. Write scenario-linked tests for state and events, keyboard and accessibility tree, theming and coarse pointers.
3. Implement the native trigger and item controls. Reuse Menu's keyboard utilities and FAB's trigger tokens. Derive the available actions from the default slot and keep its closed content hidden.
4. Build the item and scrim styles from semantic aliases. Exercise the two themes, schemes and accessibility modes with existing contrast and browser gates.
5. Publish component documentation and gallery states. Generate catalog, wrapper, token and API surfaces from the registered sources.

The browser matrix and visual baseline workflow run during integration. Local checks cover contracts, source, types, build, tokens, contrast and generated surfaces.
