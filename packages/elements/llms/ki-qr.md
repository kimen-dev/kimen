# ki-qr

> A machine-scannable QR code that hands a declared value — a link, a pairing payload — from the screen to a nearby camera, encoded locally and restyled entirely through tokens.

## When to use

hand a URL or machine-readable payload from the screen to a
nearby camera device: login pairing, tickets and passes, "continue on
mobile" links, Wi-Fi sharing. Declare `value` (encoded verbatim, always
locally) and a purpose-stating `label` ("Open onmars.dev on your phone"),
and always offer the same payload through an accessible alternative next
to the code — a visible link or copyable text — because a QR code is only
useful to someone who can point a second device's camera at the screen.

## When not to use

data the person must read on this same screen (render text
or a link), one-dimensional barcodes (out of scope), anything interactive
(a QR code is not a button — pair it with a real control instead), secret
values (anyone who can photograph the screen can decode them), or as the
sole carrier of the payload (the accessible alternative is mandatory
guidance). An always-empty ki-qr and a value beyond the ~2,331-byte
capacity are authoring mistakes: both render nothing, silently.

## Examples

A scannable link with a purpose-stating `label` (the accessible name) and the same payload offered as a visible link next to the code — the accessible alternative is mandatory, the code never travels alone:

```html
<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>
<a href="https://onmars.dev">onmars.dev</a>
```

`value` is data, never behavior: it is encoded locally byte-for-byte and never interpreted, resolved, navigated to or fetched; non-ASCII text round-trips exactly:

```html
<ki-qr value="Reunión mañana — Zúrich" label="Add the meeting to your phone"></ki-qr>
```

Malformed declarations never break a page: with no `value` (or one beyond the ~2,331-byte capacity) nothing renders and nothing errors:

```html
<ki-qr label="Nothing to encode"></ki-qr>
```

## Attributes

- `label` (string | undefined): Accessible name stating the code's purpose ("Open onmars.dev on your phone"). The component exposes exactly one non-interactive image named by it, falling back to the encoded value when absent (FR-005) — never an unnamed graphic. The label is never rendered visually, and naming the purpose is what tells assistive-technology users to look for the accessible alternative carrying the same payload (documented catalog guidance, FR-013).
- `value` (string | undefined): The exact text the code encodes — the single source of the content, encoded locally as one UTF-8 byte segment at error-correction level M (non-ASCII text additionally carries the UTF-8 ECI designator, so real scanners decode the declared string rather than an ISO-8859-1 misreading), so an independent decoder recovers it byte-for-byte, including non-ASCII text (FR-001), and no network request is ever made — the value is data, never behavior: the component never interprets, resolves, navigates to or fetches it (FR-002). Changes re-encode in place. When absent, empty or beyond the capacity of the densest symbol (~2,331 bytes at level M), nothing renders and nothing errors (FR-003).

## Slots

None.

## Parts

- `code`: The code tile: size, tile background and corners, quiet zone, module and finder shape/color.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-motion-easing-standard-decelerate`: Utility entrance curve. M3 md.sys.motion.easing.standard-decelerate. onmars: the MarsUI decelerate curve (ki.easing.out).
- `--ki-qr-background`: color used by the qr component for the light tile behind the modules: the Figma symbol is transparent over the showcase card's Surface/s0 white, but a scannable code owns its tile — the scheme-stable white keeps dark-on-light module contrast in both schemes (FR-010, a documented theme obligation).
- `--ki-qr-color`: color used by the qr component for module/finder ink (the master binds Text/high_em, whose light-scheme hue is Gray/950 #0a0c11; referenced as the scheme-stable primitive because FR-010 keeps QR ink from flipping in dark — 18.9:1 on white).
- `--ki-qr-finder-radius`: dimension used by the qr component for the corner radius of the three finder rings, applied to the ring's midline in the code's internal coordinate space of 8px per module: Type=square renders square concentric finders (radius 0); the documented round value is {ki.radius.2xl} (14px midline = 18px outer edge, the 2.25-module radius measured on Type=round); the inner-edge and center radii derive by construction (stroke geometry and a 3/7 scale — design-extraction §5).
- `--ki-qr-module-radius`: dimension used by the qr component for the corner radius of every data module, in the code's internal coordinate space of 8px per module: Type=square (the set default) renders pure squares (radius 0); the documented round value is {ki.radius.xs} (4px = half a module, the MarsUI Type=round dot carried as a token value, never an attribute — FR-007, 002 shape precedent).
- `--ki-qr-quiet-zone`: dimension used by the qr component for the light quiet zone around the modules: the 8px band measured on both 128px variants (about two modules of the sample matrices), painted as tile padding and preserved at any token-driven size (FR-008).
- `--ki-qr-radius`: dimension used by the qr component for the tile corners: the QR_code frames are square with no own radius (the rounded showcase card beneath is framing, not anatomy — design-extraction §1).
- `--ki-qr-size`: dimension used by the qr component for size (MarsUI 128x128 symbol frame via the dedicated ki.size.qr surface size; replaces the 120px space-scale approximation).
- `--ki-typography-family-body`: semantic font family for typography family body.
