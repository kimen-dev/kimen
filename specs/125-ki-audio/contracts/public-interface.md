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

The two URLs accept relative references and HTTP(S), subject to the guarded catalog's configured origin policy. The player exposes `play`, `pause`, `ended`, and `timeupdate` on its host. Playback begins on user activation. The catalog supplies no slots or actions.

The seek control uses `ki-slider` with the new optional `value-text` attribute, which sets the accessible value text of a single thumb while preserving the numeric value and the visual readout.
