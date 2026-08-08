Slot exactly one native `<video>` carrying its own poster, sources and `<track>` captions; `label` names the play control (required — never rendered visually) and the native chrome returns the moment the facade yields:

```html
<ki-video label="Play the product tour">
  <video muted playsinline width="1280" height="720" poster="tour.jpg">
    <source src="tour.webm" type="video/webm" />
    <track kind="captions" srclang="en" label="English" src="tour.en.vtt" />
  </video>
</ki-video>
```

Everything on the media element passes through untouched — offer format fallbacks through multiple `<source>` children, and the native media events (`play`, `pause`, `ended`) keep firing on the element you own; ki-video emits no events of its own:

```html
<ki-video label="Play the setup walkthrough">
  <video width="1280" height="720" poster="walkthrough.jpg">
    <source src="walkthrough.webm" type="video/webm" />
    <source src="walkthrough.mp4" type="video/mp4" />
    <track kind="captions" srclang="en" label="English" src="walkthrough.en.vtt" />
  </video>
</ki-video>
```

The frame fills its container's inline size and the media keeps the intrinsic aspect ratio declared by `width`/`height` (16:9 is a demonstration, not a constraint); `autoplay` and `controls` on arriving media are cleared — playback begins only from the play control:

```html
<ki-video label="Play the workshop recording">
  <video width="800" height="600" poster="workshop.jpg">
    <source src="workshop.mp4" type="video/mp4" />
    <track kind="captions" srclang="en" label="English" src="workshop.en.vtt" />
  </video>
</ki-video>
```
