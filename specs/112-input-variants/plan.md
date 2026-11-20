# InputVariants implementation plan

1. Verify #348 in the base and specify the extension to the two shipped fields.
2. Write length normalization and threshold tests plus browser scenarios for
   rendering, keyboard entry, descriptions, live announcements, validity,
   themes, responsive layout and accessibility modes.
3. Extend the two components, reusing their field messages, focus and form
   semantics. Add appearance and count tokens to the existing input token family.
4. Extend the component docs, stories and galleries. Regenerate and validate
   API, wrappers, catalog, token references and agent documentation.
5. Hand off browser verification, Linux visual baselines and the design-system
   card re-sync to the integrator.
