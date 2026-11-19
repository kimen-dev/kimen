import { AttachInternals, Component, Element, h, Prop, State, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { LabelHint } from '../../utils/label-hint';
import { radioGroupFormValue } from './ki-radio-group.form';
import { arrowDirection, nextEnabledIndex } from './ki-radio-group.keyboard';

export type KiRadioGroupSize = 'sm' | 'md';

type KiRadioElement = HTMLElement & {
  disabled: boolean;
  value?: string;
};

/**
 * A token-styled radio group that owns selection, keyboard coordination and
 * form participation for slotted `ki-radio` options.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously, on the custom-elements build (not on hosts
 * created by the lazy loader).
 *
 * @whenToUse a person must choose exactly one of a small set of mutually
 * exclusive options that should all be visible at once.
 * @whenNotToUse many options or tight space (use `ki-select`), independent
 * on/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or
 * authored selection on options; set this group's `value` instead.
 *
 * @slot - `ki-radio` options. Document order is navigation order.
 * @part label - Visible group label and accessible-name source.
 * @part label-hint - The `label-hint` text after the group label text, inside the label
 * and part of the radiogroup's accessible name; rendered only while a hint is set.
 * @part help - Help line under the options, read as the radiogroup description.
 * @part error - Error line shown in place of the help text while the group is
 * invalid after the person submitted; a polite live region, starting with a
 * decorative error symbol.
 * @event change - Fired once after the user selects a different radio, composed
 * across the shadow boundary; `value` is already current when listeners run.
 * When to use: react to the committed choice. When NOT to use: do not expect
 * it for programmatic `value` writes, which are silent.
 */
@Component({
  tag: 'ki-radio-group',
  styleUrls: ['../../utils/field-message.css', '../../utils/label-hint.css', 'ki-radio-group.css'],
  shadow: true,
  formAssociated: true,
})
export class KiRadioGroup {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private roster: KiRadioElement[] = [];
  @State() private selectedRadio: KiRadioElement | null = null;
  @State() private formDisabled = false;
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';

  // Scoped to this group's shadow root, so a static id is unambiguous
  // (review 007 minor; matches the 003 call).
  private readonly labelId = 'group-label';
  private rosterObserver?: MutationObserver;
  private presenceObserver: MutationObserver | undefined;
  private resetValue = '';
  private suppressValueWatch = false;
  // A value requested by attribute, property or reset that no option matches
  // yet. `value` stays a projection of the selection (FR-002), so the request
  // is remembered here and honoured when a matching option arrives — streamed
  // generated UI and frameworks set the value before the options exist.
  private pendingValue = '';

  /**
   * Form-data key for the selected option's value. Omit when the group should
   * not contribute a form entry.
   * When NOT to use: do not put `name` on `ki-radio` options; their internal
   * native inputs are intentionally unnamed.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Projection of the current selection. The initial attribute selects the
   * first matching option; unmatched values leave the group unselected and
   * operable. Assigning the property updates selection silently.
   * When NOT to use: never author selection on `ki-radio`; set this value.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Visible label and accessible-name source for the radiogroup.
   * When NOT to use: do not omit it; unlabeled groups fail accessibility gates.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Token-backed size of every `ki-radio` the group holds: the circle is 18
   * or 20px in onmars, and `sm` takes the smaller option label (13/20, 8px
   * away). The group decides for all its options; the group's own label,
   * help and error keep their size. An unrecognized value matches no style
   * rule and keeps the medium metrics.
   * When to use: match the size of the text and controls around the group.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiRadioGroupSize = 'md';

  /**
   * Short text shown after the group label and read with it as part of the
   * radiogroup name, so people know before submitting whether to choose:
   * "(optional)" on the few optional questions of a mostly required form, or
   * "(required)" the other way round, in the page's own language. It changes
   * no validation; set `required` for that, and keep the two consistent.
   * When NOT to use: do not put what the choice decides in it (use
   * `help-text`), errors (use `error-text`), or a repeat of the label.
   */
  @Prop({ reflect: true }) labelHint?: string;

  /**
   * Requires one selected option for form submission. The group uses platform
   * `valueMissing` from its internal native radio inputs.
   * When NOT to use: do not use required when no answer is acceptable.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) required = false;

  /**
   * Makes the whole group unavailable, skips it in Tab order and removes its
   * form entry.
   * When NOT to use: do not use disabled for pending/loading semantics.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  /**
   * One line of help under the options, read with the group as its
   * description: what the choice decides. While an error shows, the error
   * takes its place.
   * When NOT to use: do not repeat the label, and do not use it for error
   * messages; use `error-text`.
   */
  @Prop({ reflect: true }) helpText?: string;

  /**
   * Message shown in place of the help text once a `required` group is left
   * without a choice, and its `validationMessage` ("Choose a plan"). Without
   * it the browser's own message shows, in the browser's language. An error
   * set with `setCustomValidity` outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; call
   * `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

  /**
   * Validation message for the current group validity state: the error set
   * with `setCustomValidity`, else `error-text`, else the browser's. Empty
   * when the group is valid.
   * Custom-elements build only.
   * When NOT to use: do not parse or localize the browser's message in
   * application code.
   */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  @Watch('value')
  protected handleValueChange(): void {
    if (this.suppressValueWatch) {
      return;
    }
    this.selectByValue(this.value);
  }

  // Never re-read the host attribute here: Stencil un-reflects a cleared
  // property only at the next render, so the attribute is still present while
  // this watch runs and reading it would undo `disabled = false` /
  // `required = false` assigned by a framework wrapper. Presence is applied in
  // componentWillLoad and by the attribute observer instead; the method keeps
  // its name because the class signature is part of the sealed API snapshot.
  @Watch('disabled')
  @Watch('required')
  protected normalizeBooleanProps(): void {
    this.syncInputs();
  }

  @Watch('errorText')
  protected errorTextChanged(): void {
    this.syncValidity();
  }

  // Presence semantics: a present attribute means `true` whatever its value
  // (`disabled="false"` still disables). Runs before the first render, while
  // the authored attributes are the only state there is.
  private applyAttributePresence(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.required = booleanFromAttributePresence(this.required, this.host.hasAttribute('required'));
  }

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
    // Presence semantics for attributes written after hydration: Stencil parses
    // `disabled="false"`/`required="false"` to `false` and would remove the
    // attribute on reflect. Only the attribute that was written is set: the
    // other one may still be on the host after its property was cleared.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(
      this.host,
      ['disabled', 'required'],
      (attribute) => {
        this[attribute] = true;
      },
    );
    // Added on every connection, as disconnectedCallback removes them: a group
    // that is moved in the document (a keyed reorder, a drag between lists)
    // connects again without loading again, and without these it would no
    // longer coordinate its options — two of them checked, the old value kept.
    this.host.addEventListener('input', this.handleInput, { capture: true });
    this.host.addEventListener('keydown', this.handleKeyDown);
    this.host.addEventListener('focusin', this.handleFocusIn);
    this.host.addEventListener('invalid', this.handleInvalid);
    // The roster observer was released too, and the options may have changed
    // while the group was out of the document. On the first connection the
    // slot is not rendered yet: componentDidLoad reads the roster.
    this.syncRoster();
  }

  componentWillLoad(): void {
    this.applyAttributePresence();
    this.pendingValue = this.value;
    this.syncInputs();
  }

  componentDidLoad(): void {
    this.syncRoster();
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('input', this.handleInput, { capture: true });
    this.host.removeEventListener('keydown', this.handleKeyDown);
    this.host.removeEventListener('focusin', this.handleFocusIn);
    this.host.removeEventListener('invalid', this.handleInvalid);
    this.rosterObserver?.disconnect();
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  formAssociatedCallback(): void {
    this.resetValue = this.value;
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncInputs();
  }

  formResetCallback(): void {
    this.userInvalid = false;
    this.selectByValue(this.resetValue);
  }

  private readonly handleSlotChange = (): void => {
    this.syncRoster();
  };

  private readonly handleInvalid = (): void => {
    this.userInvalid = true;
  };

  private lastFocusedRadio: KiRadioElement | null = null;

  private readonly handleFocusIn = (event: Event): void => {
    const target = event.target as Node | null;
    this.lastFocusedRadio = this.roster.find((radio) => radio === target) ?? null;
  };

  private readonly handleInput = (event: Event): void => {
    const radio = event
      .composedPath()
      .find((target): target is KiRadioElement => this.isKiRadio(target));

    // Only this group's own options are its business. Anything else composed
    // inside it (the text field beside an "Other" option) keeps its events:
    // stopping them here, in the capture phase, silences that control before
    // it has heard its own input.
    if (!radio || !this.roster.includes(radio)) {
      return;
    }

    if (this.effectiveDisabled || radio.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (radio === this.selectedRadio) {
      return;
    }

    this.pendingValue = '';
    this.setSelectedRadio(radio);
    // `change` follows `input` in the same task, as on a native radio, a
    // ki-checkbox or a ki-switch. It cannot be dispatched from here: this
    // listener runs in the capture phase, before anyone on the group has
    // heard `input`. The option's own native `change` comes right after
    // `input` has finished its whole path; it is not composed, so it stops at
    // the option's shadow root, and that is where the group waits for it.
    radio.shadowRoot?.addEventListener('change', this.emitChange, { once: true });
  };

  private readonly emitChange = (): void => {
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const direction = arrowDirection(event.key, this.host.matches(':dir(rtl)'));
    if (direction === null || this.effectiveDisabled) {
      return;
    }

    const currentRadio = event
      .composedPath()
      .find((target): target is KiRadioElement => this.isKiRadio(target));
    const currentIndex = currentRadio ? this.roster.indexOf(currentRadio) : -1;
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextEnabledIndex(
      this.roster.map((radio) => this.isOutOfReach(radio)),
      currentIndex,
      direction,
    );
    if (nextIndex === null) {
      return;
    }

    const nextRadio = this.roster[nextIndex];
    if (!nextRadio) {
      return;
    }

    const input = this.inputFor(nextRadio);
    if (!input) {
      return;
    }

    event.preventDefault();
    input.focus();
    input.click();
  };

  private syncRoster(): void {
    const slot = this.host.shadowRoot?.querySelector('slot');
    if (!slot) {
      // Nothing rendered yet: there is no roster to read.
      return;
    }
    const assigned = slot
      .assignedElements()
      .filter((element): element is KiRadioElement => this.isKiRadio(element));
    // syncInputs() only ever walks the CURRENT roster, so a radio that has just
    // left takes the group's disabled marker with it and keeps it forever —
    // standalone, permanently disabled-looking, with its own `disabled`
    // property unable to explain why. The marker is a claim of ownership, so it
    // is withdrawn here, before the roster that justified it is replaced.
    const departed = this.roster.filter((radio) => !assigned.includes(radio));
    for (const radio of departed) {
      radio.removeAttribute('data-ki-group-disabled');
    }
    this.roster = assigned;
    this.rosterObserver?.disconnect();
    this.rosterObserver = new MutationObserver(() => {
      this.reconcileSelection();
    });
    for (const radio of this.roster) {
      this.rosterObserver.observe(radio, {
        attributes: true,
        attributeFilter: ['disabled', 'hidden'],
      });
      // An option appended after the group loaded is rostered before its first
      // render, so there is no input yet to check or to take out of the tab
      // order — and its own render then makes it a tab stop. Reconcile again
      // when that render lands in its shadow root.
      if (radio.shadowRoot && !this.inputFor(radio)) {
        this.rosterObserver.observe(radio.shadowRoot, { childList: true });
      }
    }
    this.reconcileSelection();
  }

  private reconcileSelection(): void {
    // FR-006: if the option that HELD focus becomes disabled at runtime, the
    // browser has already dropped focus to <body> by the time this observer
    // fires — so we track the last-focused option (focusin retargets slotted
    // radios to their host) rather than reading a now-stale activeElement, and
    // move focus to the group's new single tab stop so a keyboard user keeps
    // their place.
    // Capture intent from the attribute (synchronous with setAttribute) BEFORE
    // syncInputs disables the native input. The browser then blurs that input
    // to <body> ASYNCHRONOUSLY, so the focus restore is deferred to the next
    // frame (FR-006: keep the keyboard user on the group's new tab stop).
    const focusedWillDisable =
      this.lastFocusedRadio !== null &&
      (this.effectiveDisabled || this.lastFocusedRadio.hasAttribute('disabled'));

    if (this.selectedRadio && !this.roster.includes(this.selectedRadio)) {
      this.setSelectedRadio(null);
    } else if (!this.selectedRadio && this.pendingValue) {
      this.selectByValue(this.pendingValue);
    } else {
      this.syncInputs();
    }

    if (focusedWillDisable) {
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) {
          return; // focus already went somewhere deliberate; leave it
        }
        const anchor = this.tabStopRadio() ?? this.roster[0];
        if (anchor) {
          this.inputFor(anchor)?.focus();
          this.lastFocusedRadio = anchor;
        }
      });
    }
  }

  private selectByValue(value: string): void {
    const radio = this.roster.find((candidate) => this.optionValue(candidate) === value) ?? null;
    this.pendingValue = radio ? '' : value;
    this.setSelectedRadio(radio);
  }

  private setSelectedRadio(radio: KiRadioElement | null): void {
    // Selection never dispatches change here; user-driven change is emitted
    // once from handleInput, programmatic selection stays silent (FR-002).
    this.selectedRadio = radio;
    this.suppressValueWatch = true;
    this.value = radio ? this.optionValue(radio) : '';
    this.suppressValueWatch = false;
    this.syncInputs();
  }

  private syncInputs(): void {
    // Marked on the group's own host too, not just the members: `disabled` is a
    // reflected prop, but `formDisabled` (an ancestor <fieldset disabled>) is
    // not, so `:host([disabled])` alone would leave the group label at full
    // emphasis for exactly the case S15 covers behaviourally.
    if (this.effectiveDisabled) {
      this.host.setAttribute('data-ki-group-disabled', '');
    } else {
      this.host.removeAttribute('data-ki-group-disabled');
    }

    for (const radio of this.roster) {
      // The group's own `disabled` reached the shadow input and the ARIA tree
      // and nothing else, because every disabled visual in ki-radio.css keys on
      // `:host([disabled])` and the host never got it — so a disabled group
      // rendered pixel-identical to an enabled one and still lit up on hover.
      // Marked with a distinct attribute rather than the member's own
      // `disabled` (ki-avatar-group precedent): writing `disabled` would make
      // the group unable to tell an option the consumer disabled from one it
      // disabled itself, and would clear the former on re-enable. It would also
      // feed the roster's own `disabled` MutationObserver.
      radio.toggleAttribute('data-ki-group-disabled', this.effectiveDisabled);

      const input = this.inputFor(radio);
      if (!input) {
        continue;
      }
      const unavailable = this.effectiveDisabled || radio.disabled;
      input.checked = radio === this.selectedRadio;
      input.disabled = unavailable;
      input.required = this.required && !this.selectedRadio && !this.effectiveDisabled;
      input.tabIndex = unavailable || radio !== this.tabStopRadio() ? -1 : 0;
    }

    this.internals.setFormValue(radioGroupFormValue(this.selectedFormOption()));
    this.syncValidity();
  }

  private syncValidity(): void {
    if (this.roster.length === 0) {
      return;
    }

    const valueMissing = this.required && !this.selectedRadio;
    if (this.effectiveDisabled || (!valueMissing && this.customValidity === '')) {
      this.internals.setValidity({});
      this.message = '';
      this.userInvalid = false;
      return;
    }

    const anchorRadio = this.tabStopRadio() ?? this.roster[0];
    const anchor = anchorRadio ? this.inputFor(anchorRadio) : null;
    if (!anchor) {
      return;
    }

    if (this.customValidity !== '') {
      // The application's error outranks the platform message, as on a
      // native field; a missing value still shows in the flags.
      this.internals.setValidity({ customError: true, valueMissing }, this.customValidity, anchor);
      this.message = this.internals.validationMessage;
      return;
    }

    this.internals.setValidity(
      { valueMissing: true },
      fieldValidationMessage('', this.errorText, this.valueMissingMessage()),
      anchor,
    );
    this.message = this.internals.validationMessage;
  }

  private valueMissingMessage(): string {
    const probe = document.createElement('input');
    probe.required = true;
    return probe.validationMessage;
  }

  private selectedFormOption(): { disabled: boolean; value?: string } | null {
    if (!this.selectedRadio) {
      return null;
    }

    const option = {
      disabled: this.effectiveDisabled || this.selectedRadio.disabled,
    };
    const value = this.selectedRadio.value;

    return value === undefined ? option : { ...option, value };
  }

  private tabStopRadio(): KiRadioElement | null {
    if (this.effectiveDisabled) {
      return null;
    }

    if (this.selectedRadio && !this.isOutOfReach(this.selectedRadio)) {
      return this.selectedRadio;
    }

    return this.roster.find((radio) => !this.isOutOfReach(radio)) ?? null;
  }

  /**
   * An option the keyboard must not land on: disabled, or taken out of the
   * page with the `hidden` attribute. A hidden option keeps its place in the
   * roster and, when selected, its value — it only stops being a focus stop,
   * so the visible options stay reachable.
   */
  private isOutOfReach(radio: KiRadioElement): boolean {
    return radio.disabled || radio.hasAttribute('hidden');
  }

  private optionValue(radio: KiRadioElement): string {
    return radio.value ?? 'on';
  }

  private inputFor(radio: KiRadioElement): HTMLInputElement | null {
    return radio.shadowRoot?.querySelector('input') ?? null;
  }

  private isKiRadio(target: EventTarget): target is KiRadioElement {
    return target instanceof HTMLElement && target.localName === 'ki-radio';
  }

  render() {
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid ? this.message : '',
    };
    return (
      <div>
        <span part="label" id={this.labelId}>
          {this.label}
          <LabelHint hint={fieldText(this.labelHint)} />
        </span>
        <div
          role="radiogroup"
          aria-labelledby={this.labelId}
          aria-disabled={this.effectiveDisabled ? 'true' : null}
          aria-required={this.required ? 'true' : null}
          aria-invalid={fieldInvalid(messages)}
          aria-describedby={fieldDescribedBy(messages)}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </div>
        <FieldMessage {...messages} />
      </div>
    );
  }
}
