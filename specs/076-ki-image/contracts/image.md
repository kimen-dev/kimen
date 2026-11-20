# Public contract for ki-image

| Attribute | Values | Default |
| --- | --- | --- |
| `src` | Relative or HTTP(S) URL | Required to load |
| `alt` | Nonblank descriptive text | Required for informative images |
| `decorative` | Boolean | False |
| `ratio` | `auto`, `1:1`, `4:3`, `3:2`, `16:9` | `auto` |
| `fit` | `cover`, `contain` | `cover` |
| `radius` | `none`, `md`, `lg` | `lg` |
| `loading` | `lazy`, `eager` | `lazy` |
| `fallback-label` | Localized unavailable-image label | Image unavailable |

Explicit ratios keep the same frame throughout loading, success and failure. Auto uses the image's intrinsic aspect ratio after load and reserves 16:9 while awaiting dimensions or showing a fallback.

Content in the named `caption` slot is rendered in a native `figcaption`. The image supplies no keyboard or form controls. Decorative media have empty alt and are hidden from assistive technology, including in the fallback state.

The element emits a bubbling, composed `ki-error` event when a nonempty source fails or the URL policy refuses it. Each attempt reports at most one error. Changing the source starts a new attempt. Empty source and missing required alt enter fallback before a source attempt.

CSS parts are `figure`, `frame`, `image`, `fallback` and `caption`. Theme overrides can set the image radius and the fallback foreground, background, background image or backdrop filter tokens.
