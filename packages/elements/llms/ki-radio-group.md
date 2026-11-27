# ki-radio-group

> A token-styled radio group that owns selection, keyboard coordination and form participation for slotted `ki-radio` options. Like a native field, it answers `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, `validity`, `validationMessage` and `willValidate` synchronously on a defined custom element.

## When to use

a person must choose exactly one of a small set of mutually
exclusive options that should all be visible at once.

## When not to use

many options or tight space (use `ki-select`), independent
on/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or
authored selection on options; set this group's `value` instead.

## Examples

The group owns the `label` (mandatory; the radiogroup's accessible name), the form `name` and the selected `value`; user selection dispatches a composed `change` event, while programmatic `value` writes stay silent:

```html
<ki-radio-group label="Delivery speed" name="delivery" value="standard">
  <ki-radio value="standard">Standard (3–5 days)</ki-radio>
  <ki-radio value="express">Express (1–2 days)</ki-radio>
  <ki-radio value="overnight">Overnight</ki-radio>
</ki-radio-group>
```

Without an initial `value` the group renders unselected and operable; `required` blocks form submission through the platform `valueMissing` validity until an option is chosen:

```html
<form>
  <ki-radio-group label="Billing cycle" name="cycle" required>
    <ki-radio value="monthly">Monthly</ki-radio>
    <ki-radio value="yearly">Yearly</ki-radio>
  </ki-radio-group>
  <ki-button variant="primary">Continue</ki-button>
</form>
```

A `disabled` group is skipped in Tab order and contributes no form entry; do not use it for pending or loading semantics:

```html
<ki-radio-group label="Region" name="region" value="eu" disabled>
  <ki-radio value="eu">Europe</ki-radio>
  <ki-radio value="us">United States</ki-radio>
</ki-radio-group>
```

When the question is already written on the page, name the group from it with `aria-labelledby` on the host and omit `label`, so the question is shown and read once:

```html
<h2 id="plan-question">Which plan suits you?</h2>
<ki-radio-group aria-labelledby="plan-question" name="plan">
  <ki-radio value="basic">Basic</ki-radio>
  <ki-radio value="pro">Pro</ki-radio>
</ki-radio-group>
```

When the layout makes the question obvious but the group still needs its own name, `label-hidden` hides the label from view and from reading order; it stays the group's accessible name and is announced once:

```html
<ki-radio-group label="Your answer" label-hidden name="answer">
  <ki-radio value="yes">Yes</ki-radio>
  <ki-radio value="no">No</ki-radio>
</ki-radio-group>
```

## An error from the application

Set `custom-error` to show the application's verdict on the submitted
choice. The group is invalid, blocks its form and is announced as invalid at
once. Choosing another option withdraws the error. Remove the attribute when
a new attempt starts: setting the same text again while it is still set
shows nothing.

```html
<ki-radio-group label="Plan" name="plan" value="team" custom-error="The Team plan is sold out this month.">
  <ki-radio value="solo">Solo</ki-radio>
  <ki-radio value="team">Team</ki-radio>
</ki-radio-group>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-radio-group`: the default, only the tokens ki-radio-group needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `custom-error` (string | undefined): An error of the application's own, such as a server-side verdict on the submitted choice ("This plan is sold out"). While it holds text the group is invalid, blocks its form, shows the text in place of the help text at once and is announced as invalid. It stops counting when the person chooses another option, or when the form is reset, so it never blocks the corrected answer. It outranks `error-text` and an error set with `setCustomValidity`. When to use: report a verdict from a declarative spec, a live update or a framework binding. Remove it when a new attempt starts. When NOT to use: do not use it for a `required` group left without a choice; `error-text` words that. Setting the same text again while the prop still holds it shows nothing: remove it first, then set it again.
- `disabled` (boolean, default false): Makes the whole group unavailable, skips it in Tab order and removes its form entry. When NOT to use: do not use disabled for pending/loading semantics.
- `error-text` (string | undefined): Message shown in place of the help text once a `required` group is left without a choice, and its `validationMessage` ("Choose a plan"). Without it the browser's own message shows, in the browser's language. An error set with `custom-error` or `setCustomValidity` outranks it. When NOT to use: do not use it for server-side or cross-field errors; set `custom-error` or call `setCustomValidity` for those.
- `help-text` (string | undefined): One line of help under the options, read with the group as its description: what the choice decides. While an error shows, the error takes its place. When NOT to use: do not repeat the label, and do not use it for error messages; use `error-text`.
- `label` (string, required): Visible label and accessible-name source for the radiogroup. When NOT to use: do not omit it unless the host's `aria-labelledby` names the group from the page; a group with neither fails accessibility gates. Naming from the page: set `aria-labelledby` on the host to the ids of elements in the same document or shadow root, such as the heading that already asks the question. The group then takes its name from them, followed by its own `label` and `label-hint` when set. The ids are read when the group renders and whenever the attribute changes. When to use: the question is written on the page above the options; omit `label` so the question is not shown, or read, twice. When NOT to use: do not reference elements inside another component's shadow root, which an id reference cannot reach.
- `label-hidden` (boolean, default false): Hides the `label` (and its hint) from view and from reading order while it stays the radiogroup's accessible name, so a screen reader announces it once, as the group's name. When to use: the layout already makes the question obvious to sighted people (a heading in a card, an icon row) but the group still needs a name of its own. When NOT to use: do not hide a label that repeats a question already on the page; point `aria-labelledby` at that question instead. Do not hide the only description of what a choice decides; that is `help-text`.
- `label-hint` (string | undefined): Short text shown after the group label and read with it as part of the radiogroup name, so people know before submitting whether to choose: "(optional)" on the few optional questions of a mostly required form, or "(required)" the other way round, in the page's own language. It changes no validation; set `required` for that, and keep the two consistent. When NOT to use: do not put what the choice decides in it (use `help-text`), errors (use `error-text`), or a repeat of the label.
- `name` (string | undefined): Form-data key for the selected option's value. Omit when the group should not contribute a form entry. When NOT to use: do not put `name` on `ki-radio` options; their internal native inputs are intentionally unnamed.
- `required` (boolean, default false): Requires one selected option for form submission. The group uses platform `valueMissing` from its internal native radio inputs. When NOT to use: do not use required when no answer is acceptable.
- `size` ("md" | "sm", default 'md'): Token-backed size of every `ki-radio` the group holds: the circle is 18 or 20px in onmars, and `sm` takes the smaller option label (13/20, 8px away). The group decides for all its options; the group's own label, help and error keep their size. An unrecognized value matches no style rule and keeps the medium metrics. When to use: match the size of the text and controls around the group. When NOT to use: do not pick a smaller size to fit a dense region or a larger one for touch; declare `data-ki-density` on the region instead, which composes with every size.
- `value` (string, default ''): Projection of the current selection. The initial attribute selects the first matching option; unmatched values leave the group unselected and operable. Assigning the property updates selection silently. When NOT to use: never author selection on `ki-radio`; set this value.

## Slots

- (default): `ki-radio` options. Document order is navigation order.

## Parts

- `error`: Error line shown in place of the help text while the group is invalid after the person submitted; a polite live region, starting with a decorative error symbol.
- `help`: Help line under the options, read as the radiogroup description.
- `label`: Visible group label and accessible-name source.
- `label-hint`: The `label-hint` text after the group label text, inside the label and part of the radiogroup's accessible name; rendered only while a hint is set.

## Events

- `change` (Event): Fired once after the user selects a different radio, composed across the shadow boundary; `value` is already current when listeners run. `click()` on a `ki-radio` from a script selects it like a native radio: one `input`, then one `change`. When to use: react to the committed choice. When NOT to use: do not expect it for programmatic `value` writes, which are silent.

## Methods

None.

## CSS custom properties

- `--ki-radio-group-gap`: dimension used by the radio group component for gap.
- `--ki-radio-group-label-font-size`: dimension used by the radio group component for label font size.
- `--ki-radio-group-label-font-weight`: font weight used by the radio group component for label font weight.
- `--ki-radio-group-label-hint-fg`: color used by the radio group component for the label hint after the label text (spec 047: the supporting-text role, a declared a11y deviation from the MarsUI Input_label support text Text/low_em, which reads 2.8-3.13:1 on the onmars light surfaces; under more contrast it strengthens with every other supporting text).
- `--ki-radio-group-label-hint-gap`: dimension used by the radio group component for the gap between the label text and the label hint (MarsUI Input_label: Space/xs 4px).
- `--ki-radio-group-label-line-height`: dimension used by the radio group component for label line height (closest measured analogue: Radio_label sm 13/20; no group-title master exists — low-confidence refinement).
- `--ki-radio-sm-control-size`: dimension used by the radio component for the sm circle (Radio 10053:1943 sm: 18px in a 20px cell).
- `--ki-radio-sm-dot-size`: dimension used by the radio component for the sm dot (Radio 10053:1943 sm: 8px, as at md).
- `--ki-radio-sm-gap`: dimension used by the radio component for the sm gap between control and label (Radio-label 10100:3931 sm binds Space/md, 8px; spec 050 D4).
- `--ki-radio-sm-label-font-size`: dimension used by the radio component for the sm label font size (Radio-label 10100:3931 sm: UI/para 13/20; spec 050 D4).
- `--ki-radio-sm-label-line-height`: dimension used by the radio component for the sm label line height (Radio-label 10100:3931 sm: UI/para 13/20).
- `--ki-radio-sm-min-target`: dimension used by the radio component for the sm min target: 24px, the WCAG 2.5.8 minimum, above the master's 20px cell.
- `--ki-text-danger-high-em`: semantic color for text danger high em.
- `--ki-text-high-em`: semantic color for text high em.
- `--ki-text-med-em`: semantic color for text med em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
