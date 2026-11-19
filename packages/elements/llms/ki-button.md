# ki-button

> A token-styled action button with native button semantics.

## When to use

trigger the single main action of a view, supporting actions
in descending hierarchy, or confirming/destructive actions through tone.
While the action a button started is in progress, set `loading` on that
button instead of disabling it.

## When not to use

navigation, icon-only actions, persistent toggles, or the
progress of a page or region (use ki-progress).

## Examples

A standalone primary action:

```html
<ki-button variant="primary">Save</ki-button>
```

`type` defaults to `submit`, so a bare `ki-button` inside a form submits it; opt out with `type="button"`:

```html
<form>
  <ki-button type="button">Cancel</ki-button>
  <ki-button variant="primary">Save changes</ki-button>
</form>
```

Programmatic creation after registration; string attributes and properties are interchangeable:

```ts
import { defineCustomElement } from '@kimen/elements/ki-button';

defineCustomElement();

const saveButton = document.createElement('ki-button');
saveButton.setAttribute('type', 'button');
saveButton.textContent = 'Save';
document.body.append(saveButton);
```

While the action a button started is in progress, set `loading` on it instead of `disabled`: it keeps its width and focus, ignores further activation (it neither submits nor resets its form), draws a spinner in place of its label and announces `loading-label` (default "Loading") as a polite status message. Clear it when the action ends:

```html
<form id="profile">
  <ki-button variant="primary" loading-label="Saving">Save changes</ki-button>
</form>
<script type="module">
  const form = document.getElementById('profile');
  const save = form.querySelector('ki-button');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.loading = true;
    try {
      await fetch('/profile', { method: 'POST', body: new FormData(form) });
    } finally {
      save.loading = false;
    }
  });
</script>
```

## Attributes

- `disabled` (boolean, default false): Prevents activation, removes the button from keyboard reach, and exposes the unavailable state through the internal native button. Wins over `loading` when both are set. When NOT to use: do not use disabled for pending/loading semantics; use `loading`.
- `loading` (boolean, default false): Pending state of the action this button started (saving, sending). While set, every activation is blocked (pointer, Enter and Space) and the button neither submits nor resets its form, but it stays focusable, in the Tab order and at its width: the label stays laid out, transparent, and a spinner is drawn in its place. The internal native button is exposed with `aria-disabled="true"` and keeps its name, and `loadingLabel` is announced as a polite status message. `disabled`, and a disabled fieldset, win over it. The application sets it when the action starts and clears it when the action ends. When to use: while the work a click on this button started is running, so a second activation cannot repeat it. When NOT to use: for a button the person cannot use yet (use `disabled`), or for the progress of a page or region (use ki-progress).
- `loading-label` (string, default 'Loading'): Text of the polite status message announced while `loading` is set. Override for localization; the default English string is the button's only built-in user-visible text. When to use: provide a localized message whenever the document language is not English, or a more specific one ("Saving"). When NOT to use: do not repeat the button's label here; the person already hears it on focus.
- `name` (string | undefined): Form-data key contributed when this button submits its form. When NOT to use: omit when no submitter value should be sent.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed button size. Every size keeps at least the minimum pointer target; choose the size that matches the density of the surrounding UI. When NOT to use: do not use `ki-button` for icon-only compact controls.
- `tone` ("danger" | "neutral" | "success", default 'neutral'): Semantic intent for the action, independent of hierarchy. Use `success` for confirming actions and `danger` for destructive actions. When NOT to use: do not use tone for visual hierarchy; use `variant`.
- `type` ("button" | "reset" | "submit", default 'submit'): Native form action type: `submit` submits the owning form (running constraint validation and contributing `name`/`value` to the form data), `reset` restores field defaults, `button` never touches the form. Cancel a submission from the form's `submit` event (`preventDefault()`); unlike a native button, `preventDefault()` on the `click` event does not cancel it. During submission `event.submitter` is a transient native button carrying this element's `name`/`value`, not the `ki-button` host. When NOT to use: use `button` when the action must never submit a form.
- `value` (string | undefined): Form-data value paired with `name` when this button submits its form. When NOT to use: omit when the default empty submitter value is intended.
- `variant` ("ghost" | "primary" | "quaternary" | "secondary" | "tertiary", default 'secondary'): Visual hierarchy for the action. Use filled `primary` for the single main action, outlined `secondary` for supporting actions, `quaternary` for neutral text actions, and `ghost` for accent text actions. When NOT to use: do not use variant to signal success or danger; use `tone` for intent.

## Slots

- (default): Label content. This is the accessible name source.
- `end`: Trailing icon or media. Follows writing direction.
- `start`: Leading icon or media. Follows writing direction.

## Parts

- `button`: Internal native button.
- `label`: Label wrapper around the default slot.
- `spinner`: Loading spinner drawn at the center of the button, in the button's foreground ink, rendered only while `loading` is in effect.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-button-backdrop-blur`: backdrop blur used by the button component glass variants (primary/secondary). material3 resolves to blur none via the semantic override.
- `--ki-button-border-width`: dimension used by the button component for border width (MarsUI bevel/outline stroke: 1px).
- `--ki-button-focus-ring-color`: color used by the button component for focus ring color.
- `--ki-button-focus-ring-offset`: dimension used by the button component for focus ring offset.
- `--ki-button-focus-ring-shadow`: shadow used by the button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring).
- `--ki-button-focus-ring-width`: dimension used by the button component for focus ring width.
- `--ki-button-font-family`: font family used by the button component for font family.
- `--ki-button-font-weight`: font weight used by the button component for font weight.
- `--ki-button-ghost-danger-hover-bg`: color used by the button component for ghost danger hover background.
- `--ki-button-ghost-danger-hover-border`: color used by the button component for ghost danger hover border.
- `--ki-button-ghost-danger-hover-fg`: color used by the button component for ghost danger hover foreground.
- `--ki-button-ghost-danger-rest-bg`: color used by the button component for ghost danger rest background.
- `--ki-button-ghost-danger-rest-border`: color used by the button component for ghost danger rest border.
- `--ki-button-ghost-danger-rest-fg`: color used by the button component for ghost danger rest foreground.
- `--ki-button-ghost-disabled-shadow`: value used by the button component for ghost disabled shadow.
- `--ki-button-ghost-hover-shadow`: value used by the button component for ghost hover shadow.
- `--ki-button-ghost-neutral-disabled-bg`: color used by the button component for ghost neutral disabled background.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border.
- `--ki-button-ghost-neutral-disabled-fg`: color used by the button component for ghost neutral disabled foreground.
- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground.
- `--ki-button-ghost-rest-shadow`: value used by the button component for ghost rest shadow.
- `--ki-button-ghost-success-hover-bg`: color used by the button component for ghost success hover background.
- `--ki-button-ghost-success-hover-border`: color used by the button component for ghost success hover border.
- `--ki-button-ghost-success-hover-fg`: color used by the button component for ghost success hover foreground.
- `--ki-button-ghost-success-rest-bg`: color used by the button component for ghost success rest background.
- `--ki-button-ghost-success-rest-border`: color used by the button component for ghost success rest border.
- `--ki-button-ghost-success-rest-fg`: color used by the button component for ghost success rest foreground.
- `--ki-button-label-padding-inline`: dimension used by the button component for the label Text_wrap inline padding (MarsUI 8003:300: 4px each side of the label; the flex gap subtracts the same value so icon-to-text keeps the composite distance).
- `--ki-button-lg-font-size`: dimension used by the button component for lg font size.
- `--ki-button-lg-gap`: dimension used by the button component for lg gap.
- `--ki-button-lg-height`: dimension used by the button component for lg height.
- `--ki-button-lg-icon-size`: dimension used by the button component for lg icon size.
- `--ki-button-lg-line-height`: dimension used by the button component for lg line height.
- `--ki-button-lg-min-target`: dimension used by the button component for lg min target.
- `--ki-button-lg-padding-inline`: dimension used by the button component for lg padding inline.
- `--ki-button-lg-radius`: dimension used by the button component for lg radius (Button master 8003:300 binds Radius/small-component/lg, the scale a radius mode reassigns).
- `--ki-button-lg-spinner-size`: dimension used by the button component for the lg loading spinner box (20px, the lg icon size; spec 046 D5: no Figma source, the spinner takes the place of the content).
- `--ki-button-md-font-size`: dimension used by the button component for md font size.
- `--ki-button-md-gap`: dimension used by the button component for md gap (MarsUI effective icon-to-text gap 6px).
- `--ki-button-md-height`: dimension used by the button component for md height.
- `--ki-button-md-icon-size`: dimension used by the button component for md icon size.
- `--ki-button-md-line-height`: dimension used by the button component for md line height.
- `--ki-button-md-min-target`: dimension used by the button component for md min target.
- `--ki-button-md-padding-inline`: dimension used by the button component for md padding inline.
- `--ki-button-md-radius`: dimension used by the button component for md radius (Button master 8003:300 binds Radius/small-component/md, the scale a radius mode reassigns).
- `--ki-button-md-spinner-size`: dimension used by the button component for the md loading spinner box (18px, the md icon size; spec 046 D5: no Figma source, the spinner takes the place of the content).
- `--ki-button-padding-block`: dimension used by the button component for padding block (MarsUI: 4px in every size).
- `--ki-button-primary-active-overlay`: Pressed state layer for the primary button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-button-primary-danger-hover-bg`: color used by the button component for primary danger hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-danger-hover-border`: color used by the button component for primary danger hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-danger-hover-fg`: color used by the button component for primary danger hover foreground.
- `--ki-button-primary-danger-rest-bg`: color used by the button component for primary danger rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/danger_med_em #f05149) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-danger-rest-border`: color used by the button component for primary danger rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-danger-rest-fg`: color used by the button component for primary danger rest foreground.
- `--ki-button-primary-disabled-shadow`: value used by the button component for primary disabled shadow.
- `--ki-button-primary-hover-overlay`: color used by the button component for the primary hover overlay layer (MarsUI hover_overlay, White/5).
- `--ki-button-primary-hover-shadow`: shadow used by the button component for button primary hover shadow (MarsUI Component_effect/primary_hover).
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-hover-bg`: color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-neutral-hover-border`: color used by the button component for primary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-hover-fg`: color used by the button component for primary neutral hover foreground.
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500).
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground.
- `--ki-button-primary-rest-border-bottom`: color used by the button component for the primary bevel bottom edge (MarsUI Outline/primary_button_bottom).
- `--ki-button-primary-rest-shadow`: shadow used by the button component for button primary rest shadow (MarsUI Component_effect/primary_default).
- `--ki-button-primary-success-hover-bg`: color used by the button component for primary success hover background (MarsUI: rest fill; hover lightening comes from the hover overlay).
- `--ki-button-primary-success-hover-border`: color used by the button component for primary success hover border (MarsUI bevel top/inline edge).
- `--ki-button-primary-success-hover-fg`: color used by the button component for primary success hover foreground.
- `--ki-button-primary-success-rest-bg`: color used by the button component for primary success rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/success_med_em #409b3f) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-success-rest-border`: color used by the button component for primary success rest border (MarsUI bevel top/inline edge).
- `--ki-button-primary-success-rest-fg`: color used by the button component for primary success rest foreground.
- `--ki-button-quaternary-danger-hover-bg`: color used by the button component for quaternary danger hover background.
- `--ki-button-quaternary-danger-hover-border`: color used by the button component for quaternary danger hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-danger-hover-fg`: color used by the button component for quaternary danger hover foreground.
- `--ki-button-quaternary-danger-rest-bg`: color used by the button component for quaternary danger rest background.
- `--ki-button-quaternary-danger-rest-border`: color used by the button component for quaternary danger rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-danger-rest-fg`: color used by the button component for quaternary danger rest foreground.
- `--ki-button-quaternary-disabled-shadow`: value used by the button component for quaternary disabled shadow.
- `--ki-button-quaternary-hover-shadow`: value used by the button component for quaternary hover shadow.
- `--ki-button-quaternary-neutral-disabled-bg`: color used by the button component for quaternary neutral disabled background.
- `--ki-button-quaternary-neutral-disabled-border`: color used by the button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-disabled-fg`: color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars.
- `--ki-button-quaternary-neutral-hover-bg`: color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover_overlay_inverse Black/3 wash over the transparent rest fill).
- `--ki-button-quaternary-neutral-hover-border`: color used by the button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-hover-fg`: color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-button-quaternary-neutral-rest-bg`: color used by the button component for quaternary neutral rest background.
- `--ki-button-quaternary-neutral-rest-border`: color used by the button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-neutral-rest-fg`: color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; the outlined-purple rest identity was a pre-master synthesis).
- `--ki-button-quaternary-rest-shadow`: value used by the button component for quaternary rest shadow.
- `--ki-button-quaternary-success-hover-bg`: color used by the button component for quaternary success hover background.
- `--ki-button-quaternary-success-hover-border`: color used by the button component for quaternary success hover border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-success-hover-fg`: color used by the button component for quaternary success hover foreground.
- `--ki-button-quaternary-success-rest-bg`: color used by the button component for quaternary success rest background.
- `--ki-button-quaternary-success-rest-border`: color used by the button component for quaternary success rest border (MarsUI quaternary is borderless in every state).
- `--ki-button-quaternary-success-rest-fg`: color used by the button component for quaternary success rest foreground.
- `--ki-button-secondary-active-overlay`: Pressed state layer for the secondary button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first.
- `--ki-button-secondary-danger-hover-bg`: color used by the button component for secondary danger hover background.
- `--ki-button-secondary-danger-hover-border`: color used by the button component for secondary danger hover border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-danger-hover-fg`: color used by the button component for secondary danger hover foreground.
- `--ki-button-secondary-danger-rest-bg`: color used by the button component for secondary danger rest background.
- `--ki-button-secondary-danger-rest-border`: color used by the button component for secondary danger rest border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-danger-rest-fg`: color used by the button component for secondary danger rest foreground.
- `--ki-button-secondary-disabled-shadow`: value used by the button component for secondary disabled shadow.
- `--ki-button-secondary-hover-overlay`: color used by the button component for the secondary hover overlay layer (MarsUI hover_overlay_inverse, Black/3).
- `--ki-button-secondary-hover-shadow`: shadow used by the button component for secondary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-button-secondary-neutral-disabled-bg`: color used by the button component for secondary neutral disabled background.
- `--ki-button-secondary-neutral-disabled-border`: color used by the button component for secondary neutral disabled border.
- `--ki-button-secondary-neutral-disabled-fg`: color used by the button component for secondary neutral disabled foreground.
- `--ki-button-secondary-neutral-hover-bg`: color used by the button component for secondary neutral hover background (MarsUI: rest fill; hover darkening comes from the hover overlay).
- `--ki-button-secondary-neutral-hover-border`: color used by the button component for secondary neutral hover border (MarsUI bevel top/inline edge).
- `--ki-button-secondary-neutral-hover-fg`: color used by the button component for secondary neutral hover foreground (MarsUI text/high_em).
- `--ki-button-secondary-neutral-rest-bg`: color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: gray glass, not a brand tint).
- `--ki-button-secondary-neutral-rest-border`: color used by the button component for secondary neutral rest border (MarsUI bevel top/inline edge).
- `--ki-button-secondary-neutral-rest-fg`: color used by the button component for secondary neutral rest foreground (MarsUI text/high_em).
- `--ki-button-secondary-rest-border-bottom`: color used by the button component for the secondary bevel bottom edge (MarsUI Outline/secondary_button_bottom).
- `--ki-button-secondary-rest-shadow`: shadow used by the button component for secondary rest shadow (MarsUI Component_effect/secondary_default).
- `--ki-button-secondary-success-hover-bg`: color used by the button component for secondary success hover background.
- `--ki-button-secondary-success-hover-border`: color used by the button component for secondary success hover border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-success-hover-fg`: color used by the button component for secondary success hover foreground.
- `--ki-button-secondary-success-rest-bg`: color used by the button component for secondary success rest background.
- `--ki-button-secondary-success-rest-border`: color used by the button component for secondary success rest border (MarsUI bevel top/inline edge, variant trait).
- `--ki-button-secondary-success-rest-fg`: color used by the button component for secondary success rest foreground.
- `--ki-button-sm-font-size`: dimension used by the button component for sm font size.
- `--ki-button-sm-gap`: dimension used by the button component for sm gap (Button master 8003:301: root gap Space/xxs 2px + Text_wrap inline padding Space/xs 4px = 6px icon-to-text).
- `--ki-button-sm-height`: dimension used by the button component for sm height.
- `--ki-button-sm-icon-size`: dimension used by the button component for sm icon size.
- `--ki-button-sm-line-height`: dimension used by the button component for sm line height.
- `--ki-button-sm-min-target`: dimension used by the button component for sm min target.
- `--ki-button-sm-padding-inline`: dimension used by the button component for sm padding inline.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns).
- `--ki-button-sm-spinner-size`: dimension used by the button component for the sm loading spinner box (16px, the sm icon size; spec 046 D5: no Figma source, the spinner takes the place of the content).
- `--ki-button-spinner-duration`: duration used by the button and icon button components for one turn of the loading spinner (spec 046 D5: the ki-progress indeterminate period). Applied only under prefers-reduced-motion: no-preference.
- `--ki-button-spinner-stroke-width`: dimension used by the button and icon button components for the loading spinner stroke (spec 046 D5: the circular ki-progress ring, drawn with a non-scaling stroke of this width).
- `--ki-button-tertiary-danger-hover-bg`: Tertiary alias of the secondary danger hover background.
- `--ki-button-tertiary-danger-hover-border`: color used by the button component for tertiary danger hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-danger-hover-fg`: color used by the button component for tertiary danger hover foreground.
- `--ki-button-tertiary-danger-rest-bg`: Tertiary alias of the secondary danger rest background.
- `--ki-button-tertiary-danger-rest-border`: color used by the button component for tertiary danger rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-danger-rest-fg`: color used by the button component for tertiary danger rest foreground.
- `--ki-button-tertiary-disabled-shadow`: value used by the button component for tertiary disabled shadow.
- `--ki-button-tertiary-hover-overlay`: Hover overlay for neutral tertiary buttons, shared with secondary by default.
- `--ki-button-tertiary-hover-shadow`: shadow used by the button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover).
- `--ki-button-tertiary-neutral-disabled-bg`: color used by the button component for tertiary neutral disabled background.
- `--ki-button-tertiary-neutral-disabled-border`: color used by the button component for tertiary neutral disabled border.
- `--ki-button-tertiary-neutral-disabled-fg`: color used by the button component for tertiary neutral disabled foreground.
- `--ki-button-tertiary-neutral-hover-bg`: Tertiary alias of the secondary neutral hover background.
- `--ki-button-tertiary-neutral-hover-border`: color used by the button component for tertiary neutral hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-neutral-hover-fg`: Tertiary alias of the secondary neutral hover foreground.
- `--ki-button-tertiary-neutral-rest-bg`: Tertiary alias of the secondary neutral rest background.
- `--ki-button-tertiary-neutral-rest-border`: color used by the button component for tertiary neutral rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-neutral-rest-fg`: Tertiary alias of the secondary neutral rest foreground.
- `--ki-button-tertiary-rest-border-bottom`: color used by the button component for the tertiary bevel bottom edge (MarsUI Outline/secondary_button_bottom — same bevel pair as secondary).
- `--ki-button-tertiary-rest-shadow`: shadow used by the button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override).
- `--ki-button-tertiary-success-hover-bg`: Tertiary alias of the secondary success hover background.
- `--ki-button-tertiary-success-hover-border`: color used by the button component for tertiary success hover border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-success-hover-fg`: color used by the button component for tertiary success hover foreground.
- `--ki-button-tertiary-success-rest-bg`: Tertiary alias of the secondary success rest background.
- `--ki-button-tertiary-success-rest-border`: color used by the button component for tertiary success rest border (MarsUI secondary bevel top/inline edge — tertiary carries the secondary_button outline pair).
- `--ki-button-tertiary-success-rest-fg`: color used by the button component for tertiary success rest foreground.
- `--ki-button-xl-font-size`: dimension used by the button component for xl font size.
- `--ki-button-xl-gap`: dimension used by the button component for xl gap (MarsUI effective icon-to-text gap 8px).
- `--ki-button-xl-height`: dimension used by the button component for xl height.
- `--ki-button-xl-icon-size`: dimension used by the button component for xl icon size.
- `--ki-button-xl-line-height`: dimension used by the button component for xl line height.
- `--ki-button-xl-min-target`: dimension used by the button component for xl min target.
- `--ki-button-xl-padding-inline`: dimension used by the button component for xl padding inline (MarsUI 14px).
- `--ki-button-xl-radius`: dimension used by the button component for xl radius (Button master 8003:300 binds Radius/small-component/xl, the scale a radius mode reassigns).
- `--ki-button-xl-spinner-size`: dimension used by the button component for the xl loading spinner box (24px, the xl icon size; spec 046 D5: no Figma source, the spinner takes the place of the content).
- `--ki-button-xs-font-size`: dimension used by the button component for xs font size: caption_2, 12px, the smallest size the library ships for informative text (spec 002 amendment A1, issue #321). The Figma Button master draws caption_1, 10px.
- `--ki-button-xs-gap`: dimension used by the button component for xs gap (MarsUI effective icon-to-text gap 4px).
- `--ki-button-xs-height`: dimension used by the button component for xs height.
- `--ki-button-xs-icon-size`: dimension used by the button component for xs icon size (MarsUI 14px).
- `--ki-button-xs-line-height`: dimension used by the button component for xs line height (caption_2 16px, the same height as caption_1).
- `--ki-button-xs-min-target`: dimension used by the button component for xs min target.
- `--ki-button-xs-padding-inline`: dimension used by the button component for xs padding inline.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns).
- `--ki-button-xs-spinner-size`: dimension used by the button component for the xs loading spinner box (14px, the xs icon size; spec 046 D5: no Figma source, the spinner takes the place of the content).
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve.
