# ki-audio

> A recording player with play, pause, a seek timeline, elapsed and total time, playback speed, mute, and an optional transcript link.

## When to use

play a voice note, interview, or other prerecorded audio that a person deliberately starts. Provide a title and the equivalent text transcript URL when available.

## When not to use

show video (use ki-video), play an ambient loop or start playback automatically, or record audio.

## Examples

# Using ki-audio

Offer a voice note or recording with a clear title and an adjacent transcript.

```html
<ki-audio
  src="/ep4.mp3"
  title="Interview, episode 4"
  transcript-href="/ep4/transcript"
></ki-audio>
```

Set the speeds and translate the control labels in the language of the page.
The seek announcement substitutes the formatted elapsed and total times into
the `time-label` template.

```html
<ki-audio
  lang="es"
  src="/notas/7.mp3"
  title="Nota de voz"
  rates="0.75,1,1.5"
  play-label="Reproducir"
  pause-label="Pausar"
  seek-label="Posición"
  time-label="{elapsed} de {duration}"
  speed-label="Velocidad"
  mute-label="Silenciar"
  unmute-label="Activar sonido"
  transcript-href="/notas/7/transcripcion"
  transcript-label="Leer la transcripción"
  error-label="No se pudo reproducir el audio"
></ki-audio>
```

Listen on the player for `play`, `pause`, `timeupdate` and `ended`. For
example, an experiment can observe completion after the listener reaches the
end of a recording.

```js
const player = document.querySelector('ki-audio');
player?.addEventListener('ended', () => {
  document.querySelector('#next-recording')?.removeAttribute('hidden');
});
```

## Attributes

- `title` (string | undefined, default 'Audio player'): Visible title and accessible name of the player.
- `error-label` (string, default 'Audio could not be played'): Message shown if playback cannot start or the recording fails to load.
- `mute-label` (string, default 'Mute'): Accessible name of the mute button.
- `pause-label` (string, default 'Pause'): Accessible name of the pause button.
- `play-label` (string, default 'Play'): Accessible name of the play button.
- `rates` (string, default '0.75,1,1.25,1.5,2'): Comma-separated playback speeds between 0.25 and 4. Normal speed (1) is always available.
- `seek-label` (string, default 'Seek'): Accessible name of the timeline slider.
- `speed-label` (string, default 'Playback speed'): Accessible label for the playback-rate picker.
- `src` (string, required, URL): Source URL for the recording. Use an HTTP(S) URL or a relative URL.
- `time-label` (string | undefined, default '{elapsed} of {duration}'): Accessible time template. Keep the {elapsed} and {duration} placeholders.
- `transcript-href` (string | undefined, URL): URL for the recording's text transcript. Use an HTTP(S) URL or a relative URL.
- `transcript-label` (string, default 'Read the transcript'): Text of the transcript link.
- `unmute-label` (string, default 'Unmute'): Accessible name of the unmute button.

## Slots

None.

## Parts

- `mute`: Mute and unmute control.
- `play`: Play and pause control.
- `player`: The named group and themed surface.
- `progress`: Played portion of the timeline rail.
- `seek`: Native seek slider.
- `speed`: Native playback-rate picker.
- `status`: Playback failure message.
- `time`: Elapsed and total time readouts.
- `title`: Visible recording title.
- `track`: Timeline rail.
- `transcript`: Transcript link.

## Events

- `ended` (CustomEvent<void>): Forwarded when the recording ends. The catalog can bind a declared action here.
- `pause` (CustomEvent<void>): Forwarded when native playback pauses.
- `play` (CustomEvent<void>): Forwarded when the native playback state switches to playing.
- `timeupdate` (CustomEvent<void>): Forwarded when the native playback position is updated.

## Methods

None.

## CSS custom properties

- `--ki-audio-backdrop-filter`: Complete backdrop filter applied to the player, off by default.
- `--ki-audio-bg`: Background behind the player and transcript link.
- `--ki-audio-bg-image`: Optional image painted over the player background.
- `--ki-audio-border`: Boundary of the player panel.
- `--ki-audio-fg`: Text on the player background.
- `--ki-audio-progress-bg`: Colour of the elapsed timeline and seek thumb.
- `--ki-audio-radius`: Corner radius of the player panel.
- `--ki-audio-speed-radius`: Corner radius of the playback speed button.
- `--ki-audio-title-family`: Font family of the recording title.
- `--ki-audio-track-bg`: Colour of the inactive timeline.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border.
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-hover-bg`: color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-neutral-hover-border`: color used by the button component for primary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-hover-fg`: color used by the button component for primary neutral hover foreground.
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500).
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground.
- `--ki-button-quaternary-neutral-disabled-bg`: color used by the button component for quaternary neutral disabled background.
- `--ki-button-quaternary-neutral-disabled-fg`: color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars.
- `--ki-button-quaternary-neutral-hover-bg`: color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover_overlay_inverse Black/3 wash over the transparent rest fill).
- `--ki-button-quaternary-neutral-hover-fg`: color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-button-quaternary-neutral-rest-bg`: color used by the button component for quaternary neutral rest background.
- `--ki-button-quaternary-neutral-rest-fg`: color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-control-radius-track`: Corner radius of a track containing adjacent controls.
- `--ki-control-size-md`: Medium control track height, 40 CSS px at the default root size.
- `--ki-control-size-sm`: Small control track height, 32 CSS px at the default root size.
- `--ki-corner-activity-mark`: Round corners for rings and typing dots.
- `--ki-corner-inline`: Small radius for an outline around inline content.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-glyph-size-md`: Medium glyph for body content (20px at the default root size).
- `--ki-glyph-size-sm`: Small glyph for dense layouts (16px at the default root size).
- `--ki-media-layout-inline-max`: Maximum inline size of a self-contained media control panel.
- `--ki-scale-control-coarse-target`: Minimum grip target when a value scale has a coarse primary pointer.
- `--ki-scale-control-track-height`: Thickness of the inactive rail of a value scale.
- `--ki-spacing-action-inset`: Interior space at the edge of an action surface or divider.
- `--ki-spacing-block`: Deprecated alias kept for pre-Fase-1 consumers; use ki.space.xl.
- `--ki-spacing-media-caption`: Block spacing between a media frame and its caption.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-underline-offset`: Gap between text and its underline.
- `--ki-typography-underline-thickness`: Stroke width of a resting text underline.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
