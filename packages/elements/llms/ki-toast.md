# ki-toast

> A short, transient message about something the person just did, shown without blocking the page. It leaves on its own after its time, which stops while the person points at the toaster, works inside it or is away from the page; a toast with an action, or reporting an error, waits for the person.

## When to use

confirm an action that happened elsewhere on screen ("Changes
saved", "Link copied"), report a background result ("Export ready"), or
offer a quick undo. Raise it into a `ki-toaster`, in markup or with its
`show()` method; express urgency with `tone`.

## When not to use

anything the person must read or act on to continue belongs
to `ki-dialog`; form validation belongs to the field's error text; a lasting
condition of the page belongs to `ki-alert`, which stays inline.

Assistive technology note: a toast announces as it appears, so append it
when the event happens; a toast present at initial page load is exposed with
its role but its announcement is not guaranteed. The heading and the message
are the whole announcement: the icon, the action and the dismiss button
stay outside the live region.

## Examples

Put a toast in a `ki-toaster` when something happens; it announces itself as it appears and leaves on its own after 5 seconds. `tone` picks the icon and its ink and the live-region urgency: `danger` exposes `role="alert"`, every other value `role="status"`:

```html
<ki-toaster>
  <ki-toast tone="success" heading="Changes saved">Workspace settings are up to date.</ki-toast>
</ki-toaster>
```

`duration` (milliseconds) changes the time; `0` keeps the toast until it is dismissed. A toast in the `danger` tone, or holding an action, never leaves on its own, whatever its `duration`. The time stops while the pointer rests on the toaster, while focus is inside it, or while the page is hidden:

```html
<ki-toast duration="8000">The export is ready in your downloads.</ki-toast>
<ki-toast tone="danger" heading="Upload failed">The file is larger than 20 MB.</ki-toast>
```

The `action` slot takes one ghost `ki-button size="sm"`. Its own click handler runs, then the toast leaves:

```html
<ki-toast heading="Message archived">
  The conversation moved to your archive.
  <ki-button slot="action" variant="ghost" size="sm">Undo</ki-button>
</ki-toast>
```

`ki-dismiss` says why the toast left: `detail.reason` is `"timeout"`, `"button"`, `"escape"` or `"action"`. `dismissible="false"` drops the dismiss button (Escape still works on a focused toast); `dismiss-label` is the component's only built-in word, so localize it whenever the document language is not English:

```html
<ki-toast lang="es" dismiss-label="Descartar">Borrador guardado.</ki-toast>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-toast`: the default, only the tokens ki-toast needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

## Attributes

- `dismiss-label` (string, default 'Dismiss'): Accessible name of the dismiss button. Override for localization; the default English word is the component's only built-in text. When to use: whenever the document language is not English. When NOT to use: do not put the message here; use the default slot.
- `dismissed` (boolean, default false): Reflected state: true once the toast has left. The timer, the dismiss button, Escape and the action set it; the page may set or clear it. While true the host stays in the document but renders nothing and leaves the accessibility tree. Clearing it shows the toast again with its full time. When to use: show a toast again, or close it from the page. When NOT to use: do not read programmatic changes as dismissals; `ki-dismiss` reports only the timer and the person.
- `dismissible` (boolean, default true): Shows the dismiss button, a ghost `ki-icon-button` named by `dismiss-label`. Escape still dismisses a focused toast without it. When to use: keep it on unless the toast leaves on its own and the page offers no other way to read it again. When NOT to use: do not turn it off on a toast that waits for the person.
- `duration` (number | undefined, minimum 0): How long the toast stays, in milliseconds, before it leaves on its own; `0` keeps it until it is dismissed. Ignored (treated as `0`) when the toast holds an action or its tone is `danger`. Unset, or not a finite number of zero or more, it is 5000. The time stops while the pointer rests on the toaster, while focus is inside it, or while the page is hidden, and continues with what was left. Changing it restarts the time. When to use: give a longer message more time. When NOT to use: do not shorten it below what a person needs to read the message.
- `heading` (string | undefined): Optional bold first line, inside the live region. Empty strings render no heading. It is a `strong` element, never a document heading. When to use: a short label for the event ("Changes saved"). When NOT to use: do not use it for page structure.
- `queued` (boolean, default false): Output-only state written by an enclosing `ki-toaster`: true while the toast waits for a place. A queued toast renders nothing, is absent from the accessibility tree and its time does not run. Authors do not set it; the toaster overwrites it.
- `tone` ("danger" | "info" | "neutral" | "success" | "warning" | string & {}, default 'neutral'): Picks the icon and its ink, and the live-region urgency: `danger` exposes `role="alert"` and never leaves on its own; `neutral`, `info`, `success`, `warning`, absent and unrecognized values expose `role="status"`. The surface and the text look the same in every tone. Unknown values render neutral. When to use: choose the tone that describes what happened. When NOT to use: do not use tone for emphasis; a lasting failure belongs in `ki-alert`.

## Slots

- (default): Message text. It lives inside the live-region boundary.
- `action`: At most one action, as a `ki-button size="sm" variant="ghost"`. Its own click handler runs, then the toast leaves (`reason: "action"`). A toast holding an action never leaves on its own. When NOT to use: a response the person cannot skip belongs in `ki-dialog`.

## Parts

- `action`: Wrapper around the `action` slot, rendered only when it holds content.
- `dismiss`: The dismiss `ki-icon-button`, rendered only when `dismissible`.
- `heading`: Optional bold first line, rendered only when non-empty.
- `icon`: The tone icon, drawn by the component in the tone's ink.
- `message`: Message wrapper around the default slot.
- `toast`: The flat surface: fill, image, edge, radius, padding, elevation and backdrop filter.

## Events

- `ki-dismiss` (CustomEvent<KiToastDismissDetail>): Fired once when the toast leaves because its time ran out (`reason: "timeout"`), the person used the dismiss button (`"button"`), pressed Escape inside it (`"escape"`) or activated its action (`"action"`), after it is hidden and focus has been handed on. Not cancelable. When to use: remove the element, or record that the message was seen. When NOT to use: do not expect it for programmatic `dismissed` changes.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-motion-distance-sm`: Motion travel distance sm (4px): small slide/settle offsets.
- `--ki-motion-duration-medium-1`: M3 md.sys.motion.duration.medium1 (250ms). onmars: MarsUI moderate step (240ms, 2x the 120ms base).
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
- `--ki-toast-backdrop-filter`: filter used by the toast component behind its surface, taken whole: none by default; a theme may blur here (document 2, rule 6; issue #342).
- `--ki-toast-bg`: color used by the toast component for its flat raised surface (issue #353: surface-raised, the deprecated alias of surface.s1, so the step itself).
- `--ki-toast-bg-image`: image used by the toast component over its background color: none by default; a theme may paint a gradient here (document 2, rule 6).
- `--ki-toast-border`: color used by the toast component for its hairline edge (issue #353).
- `--ki-toast-border-width`: dimension used by the toast component for its hairline edge.
- `--ki-toast-danger-icon`: color used by the toast component for the danger tone icon: the tone lives in the icon alone (issue #353).
- `--ki-toast-fg`: color used by the toast component for the heading ink (issue #353).
- `--ki-toast-gap`: dimension used by the toast component between icon, text, action and dismiss button (issue #353: 12px).
- `--ki-toast-heading-font-family`: Font family for the toast heading (document 2, rule 6; issue #347). Override it to give toasts their own heading typeface.
- `--ki-toast-icon-size`: dimension used by the toast component for the tone icon.
- `--ki-toast-info-icon`: color used by the toast component for the info tone icon: the tone lives in the icon alone (issue #353).
- `--ki-toast-message-fg`: color used by the toast component for the message ink (issue #353).
- `--ki-toast-neutral-icon`: color used by the toast component for the neutral tone icon: the tone lives in the icon alone (issue #353).
- `--ki-toast-padding`: dimension used by the toast component for its padding (issue #353: 12px).
- `--ki-toast-radius`: dimension used by the toast component for its corners (issue #353: 16px).
- `--ki-toast-shadow`: shadow used by the toast component for its elevation (issue #353: e4). The only theme-controlled shadow in the toast's box-shadow (document 2, rule 6).
- `--ki-toast-success-icon`: color used by the toast component for the success tone icon: the tone lives in the icon alone (issue #353).
- `--ki-toast-warning-icon`: color used by the toast component for the warning tone icon: the tone lives in the icon alone (issue #353).
- `--ki-toast-width`: dimension used by the toast component for the widest a toast gets (issue #353: 22.5rem).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
