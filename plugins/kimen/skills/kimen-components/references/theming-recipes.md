# Theming recipes

Read each tag's installed contract first and load its sheet with the core.
[Live demos](https://kimen.dev/docs/guides/theming/#recipes)

## Choice cards

Size each toggle to its grid cell and start-align both lines. The outline
selected tokens mark pressed cards, and the outline hover tokens style
unpressed cards.

```html
<style>
  .choices {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ki-layout-spacing-sm);
  }
  .choices ki-button {
    --ki-button-inline-size: 100%;
    --ki-button-justify-content: flex-start;
    --ki-button-text-align: start;
    --ki-button-outline-selected-bg: var(--ki-surface-primary-tint);
    --ki-button-outline-selected-fg: var(--ki-text-high-em);
    --ki-button-outline-selected-border: var(--ki-outline-primary-high-em);
    --ki-button-outline-hover-bg: var(--ki-surface-s1);
    --ki-button-outline-hover-border: var(--ki-outline-control-hover);
  }
</style>
<div class="choices" role="group" aria-label="Report sections">
  <ki-button variant="outline" toggle selected>
    <strong>Summary</strong><br /><small>Key findings</small>
  </ki-button>
  <ki-button variant="outline" toggle>
    <strong>Activity</strong><br /><small>Recent changes</small>
  </ki-button>
</div>
```

## End-aligned header links

The justify token aligns links to the inline end and the gap token sets
their spacing. With `collapse-at="none"`, links stay visible and move
below the brand and actions when they run out of room.

```html
<ki-top-nav collapse-at="none" style="
  --ki-top-nav-links-justify: flex-end;
  --ki-top-nav-links-gap: var(--ki-layout-spacing-sm);
">
  <a slot="brand" href="/">Field Notes</a>
  <a href="/research">Research notes</a>
  <a href="/settings">Editorial settings</a>
</ki-top-nav>
```

## Settings row

Make the host a block to span the field and place the trailing value in
`end`. The two label tokens set its font size and line height independently
of that value.

```html
<ki-switch name="digest" checked style="
  display: block;
  --ki-switch-label-font-size: var(--ki-typography-size-body-1);
  --ki-switch-label-line-height: var(--ki-typography-line-height-body-1);
">
  Digest emails
  <span slot="end">Weekly</span>
</ki-switch>
```

## Headerless Gherkin

Hide the caption and copy control for a source-only block. Use the keyword
weight token to emphasize Gherkin keywords.

```html
<ki-code-block language="gherkin" header-hidden copyable="false" style="
  --ki-code-keyword-weight: var(--ki-typography-weight-body-semibold);
">Feature: Email digest</ki-code-block>
```
