The four regions — `media`, `header`, default body and `footer`; supply the heading element yourself, because plain text in the `header` slot carries no heading semantics:

```html
<ki-card>
  <img slot="media" src="/telemetry.png" alt="Orbit trajectory plot" />
  <h3 slot="header">Mission telemetry</h3>
  <p>Latest downlink completed at 14:02 UTC. All systems nominal.</p>
  <ki-button slot="footer" type="button" variant="secondary">View details</ki-button>
</ki-card>
```

Any subset of regions works — a text-only card is valid:

```html
<ki-card>
  <h3 slot="header">Storage almost full</h3>
  <p>You are using 92% of your plan. Consider archiving old projects.</p>
</ki-card>
```

Place independent actions in the `footer` slot.

```html
<ki-card>
  <h3 slot="header">Invite your team</h3>
  <p>Collaborators can review specs and approve merges.</p>
  <ki-button slot="footer" type="button" variant="primary">Invite</ki-button>
  <ki-button slot="footer" type="button" variant="ghost">Later</ki-button>
</ki-card>
```

Use `href` for a primary destination. Use `interactive` to emit the
`ki-activate` action event. Supply a single text heading for either option
and keep secondary controls in their own slot content.

```html
<ki-card href="/incidents/42" variant="outlined">
  <h3 slot="header">Search index rebuild</h3>
  <p>Scheduled for midnight.</p>
  <ki-button slot="footer" type="button" variant="secondary">Bookmark</ki-button>
</ki-card>

<ki-card interactive variant="filled">
  <h3 slot="header">Preview monthly report</h3>
  <p>Review the new report before publishing it.</p>
</ki-card>
```
