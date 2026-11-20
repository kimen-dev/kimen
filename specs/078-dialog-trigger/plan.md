# DialogTrigger implementation plan

Extend the shipped button, icon button and dialog contracts. Use native button activation and native modal focus management. Route built-in command names across the invoker's shadow boundary and use the dialog's guarded close request. Keep existing token sources and variants.

Validate neutral command references against the complete guarded surface before assigning DOM IDs. Translate A2UI Modal into an entry point and dialog within that surface. Use the existing component registrations, parser and renderer. Update the existing component docs and stories.

## Constitution check

- Art. I keeps the component source authoritative for the generated API and catalog.
- Arts. II–III require the contract, regression tests and the fast quality gates.
- Arts. IV–VI preserve native modal behavior, keyboard use and token styling.
- Art. VIII requires the same-surface guard and an adapter-local protocol mapping.
- Art. IX requires an API declaration for the new attributes and widened close-reason union.
