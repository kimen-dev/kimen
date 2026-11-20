# Confirmation component contract

The host sets `heading`, `action`, `approve-label` and `deny-label`. Project
details through the default slot. Set `consequence` for a warning Note and
`tone="danger"` for a destructive approval. The optional `remember` checkbox
starts clear. Override `remember-label` to name the permission and localize it.

Activation emits `ki-approve` with `{ remember: boolean }` or `ki-deny`
without a payload. The events bubble and cross the shadow boundary. Neither event
changes the host-controlled `state` or executes the tool. The trusted host owns
the request identifier and handles only the declared actions it associates with
this particular prompt. The displayed tool identifier carries no execution authority.

Set `state` to `approved`, `denied` or `expired` to render a compact outcome.
Supply `resolved-by` and `resolved-at` as display strings. Use `approved-label`,
`denied-label` and `expired-label` to localize the outcome. Call
`focusPrompt()` only when the person is waiting on the assistant.
