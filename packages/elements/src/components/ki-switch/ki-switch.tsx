import { AttachInternals, Component, Element, h, Listen, Prop, State, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { FieldMessage, fieldDescribedBy, fieldInvalid, fieldText } from '../../utils/field-message';
import { checkedFromMarkup, resolveSubmittedValue } from './ki-switch.form';

export type KiSwitchSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * A token-styled switch for immediate on/off settings.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously, on the custom-elements build (not on hosts
 * created by the lazy loader).
 *
 * @whenToUse binary settings whose change takes effect immediately, always
 * with a slotted label.
 * @whenNotToUse selections collected for later form submission; use
 * ki-checkbox for recorded choices, ki-radio-group for mutually exclusive
 * choices, and ki-button for actions.
 *
 * @slot - Label content. This is the accessible name source.
 * @part track - On/off channel.
 * @part thumb - Traveling handle.
 * @part label - Label wrapper around the default slot.
 * @part help - Help line under the switch, read as its description.
 * @part error - Line that shows, in place of the help text, an error the
 * application set with `setCustomValidity` once the form is submitted; a polite
 * live region, starting with a decorative error symbol.
 * @event change - Fired once after a user toggle commits, composed across the shadow
 * boundary; `checked` is already current when listeners run. When to use:
 * apply the on/off effect. When NOT to use: do not expect it for programmatic
 * `checked` writes, which are silent.
 */
@Component({
  tag: 'ki-switch',
  styleUrls: ['../../utils/field-message.css', 'ki-switch.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiSwitch {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Live on/off state. Boolean presence semantics apply: any present
   * `checked` attribute value, including `checked="false"` or malformed
   * agent output, means on. Omit the attribute to express off.
   * When to use: set the initial on state for a setting that applies
   * immediately.
   * When NOT to use: do not use a switch for choices saved only on submit;
   * use ki-checkbox for that pattern.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /**
   * Token-backed size: the track is 32 x 18, 40 x 22, 48 x 26 or 56 x 32px in
   * onmars (`xl` is the design's mobile size), with its thumb. `sm` also takes
   * the smaller label (13/20, 8px away). An unrecognized value matches no
   * style rule and keeps the medium metrics.
   * When to use: match the size of the text and controls around it.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiSwitchSize = 'md';

  /**
   * Prevents toggling, removes the switch from keyboard reach, excludes it
   * from form data, and exposes the unavailable state to assistive technology.
   * When to use: make a setting temporarily unavailable while preserving its
   * current state.
   * When NOT to use: do not use disabled for pending or loading states.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Form-data key contributed while the switch is on.
   * When to use: include the immediate setting in native form data when on.
   * When NOT to use: omit when no form entry should be submitted.
   *
   * @default undefined
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value submitted while on. Omit for native checkbox parity: the
   * submitted value defaults to `on`.
   * When to use: submit a domain-specific value instead of the default `on`.
   * When NOT to use: do not set a value to represent off; off contributes
   * nothing.
   *
   * @default 'on'
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * One line of help under the switch, read with it as its description: what
   * turning it on changes.
   * When NOT to use: do not repeat the label. A switch has no constraint of
   * its own, so it takes no error text; an error the application sets with
   * `setCustomValidity` shows in this line's place.
   */
  @Prop({ reflect: true }) helpText?: string;

  @State() private formDisabled = false;
  // Whether the application's error has been reported to the person (a
  // blocked submission, checkValidity or reportValidity).
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals.
  @State() private message = '';

  private input: HTMLInputElement | undefined;
  private resetChecked = false;
  private presenceObserver: MutationObserver | undefined;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  // The application's own error (setCustomValidity); '' when none. It is
  // reapplied on every validity sync, so the control's own revalidation never
  // drops it.
  private customValidity = '';

  /**
   * Validity of the control, as on a native form control: which constraint
   * fails, if any, including an error set with `setCustomValidity`. Present
   * on the custom-elements build (`@kimen/elements/ki-*`,
   * `@kimen/elements/components` and the framework wrappers), not on hosts
   * created by the lazy loader.
   * When NOT to use: do not read it to style the control; the control shows
   * its own invalid state after a blocked submission.
   */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /**
   * Validation message for the current validity state: the browser's, or the
   * error set with `setCustomValidity`. Empty when the control is valid.
   * Custom-elements build only.
   * When NOT to use: do not parse or localize the browser's message in
   * application code.
   */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /**
   * Whether the control takes part in constraint validation: false while it
   * is disabled, directly or through a fieldset. Custom-elements build only.
   * When NOT to use: do not use it to test whether the control is disabled;
   * read `disabled` for that.
   */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /**
   * Answers at once whether the control satisfies its constraints, firing
   * `invalid` when it does not, exactly as a native field does.
   * Custom-elements build only.
   * When NOT to use: use `reportValidity()` instead when the user should see
   * the problem.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /**
   * Like `checkValidity()`, and when the control is invalid the browser shows
   * its message and moves focus to the control. Custom-elements build only.
   * When NOT to use: do not call it on every keystroke; it interrupts the user.
   */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /**
   * Sets an error of the application's own, such as a server-side or
   * cross-field rule. While `message` is not empty the control is invalid,
   * blocks its form and reports that message, and it keeps doing so through
   * the user's edits until `setCustomValidity('')` clears it.
   * Custom-elements build only.
   * When NOT to use: do not use it for `required` or other constraints the
   * control already enforces.
   */
  setCustomValidity(message: string): void {
    this.customValidity = message;
    this.syncValidity();
  }

  connectedCallback(): void {
    // Boolean presence semantics must survive hydration. Stencil natively adopts
    // `checked=""`/removal, but parses a present-but-falsy `checked="false"` set
    // after load to `false`; restore presence semantics for that case. Armed on
    // every connection: disconnectedCallback releases the observer, and a
    // switch that is moved in the document connects again without loading
    // again.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(
      this.host,
      ['checked', 'disabled'],
      this.handlePresentAttribute,
    );
  }

  componentWillLoad(): void {
    this.checked = checkedFromMarkup(this.host.hasAttribute('checked'), this.checked);
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
  }

  componentDidLoad(): void {
    this.syncInput();
    this.syncFormValue();
  }

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  // Correct ONLY the case Stencil gets wrong: a present-but-falsy attribute set
  // after hydration. Absence and Stencil's own reflect writes already agree with
  // the prop, so skipping them avoids fighting the reflection on every toggle.
  private readonly handlePresentAttribute = (attribute: string): void => {
    if (attribute === 'checked' && !this.checked) {
      this.checked = true;
    } else if (attribute === 'disabled' && !this.disabled) {
      this.disabled = true;
    }
  };

  @Watch('checked')
  protected checkedChanged(): void {
    this.syncInput();
    this.syncFormValue();
  }

  @Watch('disabled')
  protected disabledChanged(): void {
    this.syncInput();
    this.syncUserInvalid();
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncFormValue();
  }

  formAssociatedCallback(): void {
    this.resetChecked = checkedFromMarkup(this.host.hasAttribute('checked'), this.checked);
    this.syncFormValue();
  }

  formResetCallback(): void {
    this.checked = this.resetChecked;
    this.userInvalid = false;
    this.syncInput();
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncInput();
    this.syncFormValue();
    this.syncUserInvalid();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.userInvalid = true;
  }

  // A disabled switch takes no part in validation, so its error stops showing.
  private syncUserInvalid(): void {
    if (this.effectiveDisabled) {
      this.userInvalid = false;
    }
  }

  private readonly setInput = (input: HTMLInputElement | undefined): void => {
    this.input = input;
    this.syncInput();
    this.syncValidity();
  };

  // A switch has no constraint of its own: only the application's error can
  // make it invalid. The native input carries it so its message and anchor
  // are the platform's.
  private syncValidity(): void {
    if (!this.input) {
      return;
    }

    this.input.setCustomValidity(this.customValidity);
    if (this.input.validity.valid) {
      this.internals.setValidity({});
      this.message = '';
      this.userInvalid = false;
      return;
    }

    this.internals.setValidity(this.input.validity, this.input.validationMessage, this.input);
    this.message = this.internals.validationMessage;
  }

  private syncInput(): void {
    if (!this.input) {
      return;
    }

    this.input.checked = this.checked;
    this.input.disabled = this.effectiveDisabled;
  }

  private syncFormValue(): void {
    this.internals.setFormValue(resolveSubmittedValue(this.checked, this.value));
  }

  // The native `input` event is composed and reaches page listeners BEFORE
  // `change`, so `checked` and the form value must be current by then — a
  // consumer reading `new FormData(form)` from an `input` listener otherwise
  // sees the previous state (S1, codex review). Update on input; keep the
  // composed `change` dispatch below.
  private readonly handleInput = (event: Event): void => {
    this.checked = (event.currentTarget as HTMLInputElement).checked;
    this.syncFormValue();
  };

  private readonly handleChange = (event: Event): void => {
    this.checked = (event.currentTarget as HTMLInputElement).checked;
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  render() {
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid && !this.effectiveDisabled ? this.message : '',
    };
    return [
      // eslint-disable-next-line jsx-a11y/label-has-associated-control -- Shadow label wraps the native input and slotted accessible-name content.
      <label class="base">
        <input
          ref={this.setInput}
          type="checkbox"
          role="switch"
          tabIndex={this.effectiveDisabled ? -1 : 0}
          checked={this.checked}
          disabled={this.effectiveDisabled}
          name={this.name ?? ''}
          value={this.value ?? 'on'}
          aria-describedby={fieldDescribedBy(messages)}
          aria-invalid={fieldInvalid(messages)}
          onInput={this.handleInput}
          onChange={this.handleChange}
        />
        <span part="track">
          <span part="thumb">
            {/* State glyphs (MarsUI Toggle master): ON check, OFF+disabled
                dash. Filled rounded vectors adapted from the Figma pointer
                exports; ink comes from currentColor via CSS. */}
            <svg class="glyph glyph-check" viewBox="0 0 9.2 7.5" aria-hidden="true">
              <path
                d="M8.84 1.71 3.98 6.82c-.17.18-.4.28-.63.28-.24 0-.47-.1-.63-.28L.36 4.34c-.35-.37-.35-.97 0-1.33.35-.37.92-.37 1.27 0l1.72 1.82L7.57.38c.35-.37.92-.37 1.27 0 .35.37.35.96 0 1.33Z"
                fill="currentColor"
              />
            </svg>
            <svg class="glyph glyph-dash" viewBox="0 0 8 2" aria-hidden="true">
              <path d="M1 0h6a1 1 0 0 1 0 2H1a1 1 0 0 1 0-2Z" fill="currentColor" />
            </svg>
          </span>
        </span>
        <span part="label">
          <slot />
        </span>
      </label>,
      <FieldMessage {...messages} />,
    ];
  }
}
