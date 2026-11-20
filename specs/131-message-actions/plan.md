# Implementation plan

- Extend the existing message slot with opt-in toolbar semantics, focus and
  visibility. Keep Conversation's transcript implementation intact.
- Render token-backed branch controls and a polite branch status. Emit
  typed requests for the application to handle.
- Add the Conversation recipe and a Message gallery. Verify the focused
  behavior, check the public API and regenerate the affected surfaces.
