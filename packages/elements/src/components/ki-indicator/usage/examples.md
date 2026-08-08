Two integers determine everything — one dot per `count` position with the 1-based `current` highlighted — and `label` names the sequence (the exposed name reads "&lt;label&gt;, &lt;current&gt; / &lt;count&gt;"):

```html
<ki-indicator label="Slide position" count="5" current="2"></ki-indicator>
```

Malformed declarations never break the row: `current` above `count` clamps to the last position, a non-numeric one falls back to the first, and an invalid `count` renders zero dots (an authoring mistake, not an error state):

```html
<ki-indicator label="Slide position" count="5" current="9"></ki-indicator>
<!-- fifth dot current -->
```

Drive it from the composing carousel by updating `current` (1-based); the highlight and exposed text follow immediately, and the indicator never announces changes (no live region) — announcements belong to the carousel:

```html
<ki-indicator id="gallery-position" label="Photo position" count="4" current="1"></ki-indicator>

<script type="module">
  const indicator = document.getElementById('gallery-position');
  indicator.current = 3;
</script>
```
