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
