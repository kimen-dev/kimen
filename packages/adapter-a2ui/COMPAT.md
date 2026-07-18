# @kimen/adapter-a2ui: protocol compatibility matrix

Constitution Art. VIII: each adapter declares the exact protocol version(s) it
supports, versioned with the adapter. A protocol's breaking release is
absorbed here and never forces a core change; an adapter that cannot absorb it
is retired.

This file is the human-readable projection of the machine-readable matrix in
`src/coverage.ts` (`SUPPORTED_A2UI_VERSIONS` and `A2UI_COVERAGE`). The
`coverage.spec.ts` suite (scenario S6) fails if this table and the code drift,
and if any mapped catalog counterpart leaves the generated catalog (Art. I).

## Supported A2UI protocol versions

A2UI is pre-1.0 and evolves between previews (v0.8 legacy, v0.9 previous
stable, v0.9.1 current, v1.0 candidate). This adapter release pins the current
stable line:

| Adapter version | A2UI protocol version(s) | Status |
| --- | --- | --- |
| 0.0.0 | 0.9.1 | supported |

A message tagged with any other protocol version is rejected naming the
supported set (scenario S5).

## Component-type coverage

`mapped` types render as their neutral `ki-*` counterpart. `inline` types
(text/heading) carry no element of their own — their resolved string becomes
inert text in the parent slot. `forbidden` types reject the whole message on
security grounds (scenario S7); the soft degradation path never applies to
them. Any A2UI type absent from this table is `unmapped`: it degrades per node
to a fixed fallback that carries no agent-supplied content (scenarios S4/S11).

| A2UI type | Coverage | Catalog counterpart |
| --- | --- | --- |
| Text | inline | (inline text) |
| Heading | inline | (inline text) |
| Card | mapped | ki-card |
| List | mapped | ki-list |
| ListItem | mapped | ki-list-item |
| Button | mapped | ki-button |
| TextField | mapped | ki-input |
| MultilineTextField | mapped | ki-textarea |
| Checkbox | mapped | ki-checkbox |
| Divider | mapped | ki-divider |
| Badge | mapped | ki-badge |
| Alert | mapped | ki-alert |
| Progress | mapped | ki-progress |
| html | forbidden | — |
| RawHtml | forbidden | — |
| script | forbidden | — |
| iframe | forbidden | — |

## Declared v1 gaps

- A2UI dynamic `template` children (data-driven list expansion) are not yet
  mapped; a component using `template` is rejected as `unsupported-feature`
  rather than dropped silently.
- Free-form styling passthrough is out of scope: appearance stays token-driven
  at the consuming application (Art. VI).
