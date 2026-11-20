# Public interface

| Attribute | Type | Default |
| --- | --- | --- |
| `src` | URL | — |
| `title` | string | Audio player |
| `transcript-href` | URL | — |
| `rates` | comma-separated numbers | 0.75,1,1.25,1.5,2 |
| `play-label` / `pause-label` | string | Play / Pause |
| `mute-label` / `unmute-label` | string | Mute / Unmute |
| `seek-label` | string | Seek |
| `time-label` | string template | {elapsed} of {duration} |
| `speed-label` | string | Playback speed |
| `transcript-label` | string | Read the transcript |
| `error-label` | string | Audio could not be played |

The two URLs accept relative references and HTTP(S), subject to the guarded catalog's configured origin policy. The player exposes `play`, `pause`, `ended`, and `timeupdate` on its host. Playback begins on user activation. The catalog exposes `ended` as the trigger for a consumer-declared action. There are no slots.

The native range exposes an accessible time readout. The native select exposes the current playback rate and the available rates. Framework property bindings can set `audioTitle` for the HTML `title` attribute.
