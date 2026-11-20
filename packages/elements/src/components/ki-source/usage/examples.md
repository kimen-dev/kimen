# Using ki-source

Declare a source directly inside the default slot of `ki-sources`.

```html
<ki-sources open>
  <ki-source id="methods" href="/methods" title="Study design" snippet="How the study ran."></ki-source>
</ki-sources>
```

Use a unique identifier in the current document or shadow root. In a
guarded spec, use the `source-id` prop instead of the native `id`. The
disclosure displays the hostname from the resolved URL.
