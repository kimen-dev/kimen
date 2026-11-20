# Implementation plan

Extend the existing native modal and its focus handling in `ki-dialog`. Keep its centered presentation as the default. Use a viewport query for the compact mode, and place the existing Kimen button and icon-button controls where the active layout requires them.

Add fullscreen surface and header tokens, build the existing element and regenerate its public surfaces. Verify the native dialog lifecycle, named controls, keyboard wrapping and responsive positioning in browser specs. Use the visual suite at 360 and 1024 pixels across both themes and schemes.
