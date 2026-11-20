# Drawer plan

1. Scaffold with the Kimen component generator after the contract passes lint.
2. Write browser checks for placement, slots, focus, dismissal and theme
   behavior. Use a Node unit spec for downward gesture recognition.
3. Build on native modal and non-modal dialogs. Share the dialog focus helpers,
   keep dismissal cancelable, and style the surface with logical edges and
   tokens shared across themes.
4. Ship documentation and galleries, regenerate API, catalog and wrappers,
   then run the local gates. Hand the implementation commit to the integrator
   for the browser matrix, Linux baselines and design-system re-sync.
