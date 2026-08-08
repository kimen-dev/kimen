The four regions — `media`, `header`, default body and `footer`; supply the heading element yourself, because plain text in the `header` slot carries no heading semantics:

```html
<ki-card>
  <img slot="media" src="/telemetry.png" alt="Orbit trajectory plot" />
  <h3 slot="header">Mission telemetry</h3>
  <p>Latest downlink completed at 14:02 UTC. All systems nominal.</p>
  <ki-button slot="footer" type="button" variant="tertiary">View details</ki-button>
</ki-card>
```

Any subset of regions works — a text-only card is valid:

```html
<ki-card>
  <h3 slot="header">Storage almost full</h3>
  <p>You are using 92% of your plan. Consider archiving old projects.</p>
</ki-card>
```

Actions go in the `footer` slot (no dedicated actions slot exists in v1), and interactive elements always sit inside a region — the card itself is never a click target:

```html
<ki-card>
  <h3 slot="header">Invite your team</h3>
  <p>Collaborators can review specs and approve merges.</p>
  <ki-button slot="footer" type="button" variant="primary">Invite</ki-button>
  <ki-button slot="footer" type="button" variant="ghost">Later</ki-button>
</ki-card>
```
