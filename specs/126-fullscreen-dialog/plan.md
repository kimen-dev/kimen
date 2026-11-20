# Implementation plan

Extend the existing native modal and its focus handling in `ki-dialog`. Keep its centered presentation as the default. Use a viewport query for the compact mode, and put the confirm control in the active layout. Reuse the registered Kimen button with a native fallback for direct imports. Give the close button its own accessible name and a decorative Kimen icon.

Add fullscreen surface and header tokens, build the existing element and regenerate its public surfaces. Verify the native dialog lifecycle, named controls, keyboard wrapping and responsive positioning in browser specs. Use the visual suite at 360 and 1024 pixels across both themes and schemes.
