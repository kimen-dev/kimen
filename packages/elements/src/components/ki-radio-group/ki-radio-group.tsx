import { AttachInternals, Component, Element, h, Prop, State, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { radioGroupFormValue } from './ki-radio-group.form';
import { arrowDirection, nextEnabledIndex } from './ki-radio-group.keyboard';

type KiRadioElement = HTMLElement & {
  disabled: boolean;
  value?: string;
};
interface MaybeFormValueInternals {
  setFormValue?: unknown;
  setValidity?: unknown;
}

/**
 * A token-styled radio group that owns selection, keyboard coordination and
 * form participation for slotted `ki-radio` options.
 *
 * @whenToUse a person must choose exactly one of a small set of mutually
 * exclusive options that should all be visible at once.
 * @whenNotToUse many options or tight space (use `ki-select`), independent
 * on/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or
 * authored selection on options; set this group's `value` instead.
 *
 * @slot - `ki-radio` options. Document order is navigation order.
 * @part label - Visible group label and accessible-name source.
 * @event change - Fired once after the user selects a different radio, composed
 * across the shadow boundary; `value` is already current when listeners run.
 * When to use: react to the committed choice. When NOT to use: do not expect
 * it for programmatic `value` writes, which are silent.
 */
@Component({
  tag: 'ki-radio-group',
  styleUrl: 'ki-radio-group.css',
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
   * Platform validation message for the current group validity state. Empty
   * when the group is valid.
   * When NOT to use: do not parse or localize this value in application code;
   * it is provided by the browser.
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

  // Presence semantics: a present attribute means `true` whatever its value
  // (`disabled="false"` still disables). Runs before the first render and on
  // attribute mutations alone, so it never fights a property assignment.
  private applyAttributePresence(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.required = booleanFromAttributePresence(this.required, this.host.hasAttribute('required'));
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  connectedCallback(): void {
    // Presence semantics for attributes written after hydration: Stencil parses
    // `disabled="false"`/`required="false"` to `false` and would remove the
    // attribute on reflect.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(this.host, ['disabled', 'required'], () => {
      this.applyAttributePresence();
    });
  }

  componentWillLoad(): void {
    this.applyAttributePresence();
    this.pendingValue = this.value;
    this.syncInputs();
  }

  componentDidLoad(): void {
    this.host.addEventListener('input', this.handleInput, { capture: true });
    this.host.addEventListener('keydown', this.handleKeyDown);
    this.host.addEventListener('focusin', this.handleFocusIn);
    this.host.addEventListener('invalid', this.handleInvalid);
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
    setTimeout(() => {
      this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }, 0);
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
    const assigned = slot
      ?.assignedElements()
      .filter((element): element is KiRadioElement => this.isKiRadio(element));
    // syncInputs() only ever walks the CURRENT roster, so a radio that has just
    // left takes the group's disabled marker with it and keeps it forever —
    // standalone, permanently disabled-looking, with its own `disabled`
    // property unable to explain why. The marker is a claim of ownership, so it
    // is withdrawn here, before the roster that justified it is replaced.
    const departed = this.roster.filter((radio) => !(assigned ?? []).includes(radio));
    for (const radio of departed) {
      radio.removeAttribute('data-ki-group-disabled');
    }
    this.roster = assigned ?? [];
    this.rosterObserver?.disconnect();
    if (typeof MutationObserver !== 'function') {
      this.reconcileSelection();
      return;
    }
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
      // set/remove rather than toggleAttribute: Stencil's mock-doc, which the
      // unit suite renders against, does not implement toggleAttribute — which
      // is why the ki-avatar-group precedent uses this pair too.
      if (this.effectiveDisabled) {
        radio.setAttribute('data-ki-group-disabled', '');
      } else {
        radio.removeAttribute('data-ki-group-disabled');
      }

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

    const setFormValue = (this.internals as MaybeFormValueInternals).setFormValue;
    if (typeof setFormValue === 'function') {
      setFormValue.call(this.internals, radioGroupFormValue(this.selectedFormOption()));
    }
    this.syncValidity();
  }

  private syncValidity(): void {
    const setValidity = (this.internals as MaybeFormValueInternals).setValidity;
    if (typeof setValidity !== 'function') {
      return;
    }

    if (this.roster.length === 0) {
      return;
    }

    if (!this.required || this.selectedRadio || this.effectiveDisabled) {
      setValidity.call(this.internals, {});
      this.userInvalid = false;
      return;
    }

    const anchorRadio = this.tabStopRadio() ?? this.roster[0];
    const anchor = anchorRadio ? this.inputFor(anchorRadio) : null;
    if (!anchor) {
      return;
    }

    setValidity.call(this.internals, { valueMissing: true }, this.valueMissingMessage(), anchor);
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
    return radio.disabled || radio.hidden;
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
    return (
      <div>
        <span part="label" id={this.labelId}>
          {this.label}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={this.labelId}
          aria-disabled={this.effectiveDisabled ? 'true' : null}
          aria-required={this.required ? 'true' : null}
          aria-invalid={this.userInvalid ? 'true' : null}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </div>
    );
  }
}
