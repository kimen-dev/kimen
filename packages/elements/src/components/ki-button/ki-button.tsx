import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { normalizeKiButtonType } from './ki-button.form';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press';

export type KiButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'ghost'
  | 'outline';
export type KiButtonTone = 'neutral' | 'success' | 'danger';
export type KiButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type KiButtonType = 'submit' | 'reset' | 'button';

/**
 * A token-styled action button with native button semantics.
 *
 * @whenToUse trigger the single main action of a view, supporting actions
 * in descending hierarchy, confirming/destructive actions through tone, or
 * persistent actions such as Bold with `toggle`.
 * While the action a button started is in progress, set `loading` on that
 * button instead of disabling it.
 * @whenNotToUse navigation, icon-only actions, form values, or the
 * progress of a page or region (use ki-progress).
 *
 * @slot - Label content. This is the accessible name source.
 * @slot start - Leading icon or media. Follows writing direction.
 * @slot end - Trailing icon or media. Follows writing direction.
 * @part button - Internal native button.
 * @part label - Label wrapper around the default slot.
 * @part spinner - Loading spinner drawn at the center of the button, in the
 * button's foreground ink, rendered only while `loading` is in effect.
 */
@Component({
  tag: 'ki-button',
  styleUrls: ['ki-button.surface.css', 'ki-button.toggle.css', 'ki-button.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiButton {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Visual hierarchy for the action. Use filled `primary` for the single main
   * action, outlined `secondary` for supporting actions, `quaternary` for
   * neutral text actions, `ghost` for accent text actions and `outline` for
   * an unfilled action with a visible boundary.
   * When NOT to use: do not use variant to signal success or danger; use
   * `tone` for intent.
   *
   * @default 'secondary'
   * @deprecatedValue tertiary
   */
  @Prop({ reflect: true }) variant: KiButtonVariant = 'secondary';

  /**
   * Semantic intent for the action, independent of hierarchy. Use `success`
   * for confirming actions and `danger` for destructive actions. Toggle
   * palettes are specific to the variant.
   * When NOT to use: do not use tone for visual hierarchy; use `variant`.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiButtonTone = 'neutral';

  /**
   * Token-backed button size. Every size keeps at least the minimum pointer
   * target; choose the size that matches the density of the surrounding UI.
   * When NOT to use: do not use `ki-button` for icon-only compact controls.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiButtonSize = 'md';

  /**
   * Enables persistent press state for an action such as Bold. The native
   * button exposes `aria-pressed` and each activation switches `selected`.
   * Use the same label in both states. A toggle does not submit or reset a form.
   *
   * @default false
   */
  @Prop({ reflect: true }) toggle = false;

  /**
   * Current press state in toggle mode. Set this to initialize or synchronize
   * the state programmatically without emitting a change.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) selected = false;

  /** Emitted after toggle activation with the new selected state. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  selectionChange!: EventEmitter<{ selected: boolean }>;

  /**
   * Native form action type: `submit` submits the owning form (running
   * constraint validation and contributing `name`/`value` to the form data),
   * `reset` restores field defaults, `button` never touches the form. Toggle
   * mode takes precedence over this property.
   * Cancel a submission from the form's `submit` event (`preventDefault()`);
   * unlike a native button, `preventDefault()` on the `click` event does not
   * cancel it. During submission `event.submitter` is a transient native
   * button carrying this element's `name`/`value`, not the `ki-button` host.
   * When NOT to use: use `button` when the action must never submit a form.
   *
   * @default 'submit'
   */
  @Prop({ reflect: true }) type: KiButtonType = 'submit';

  /**
   * Form-data key contributed when this button submits its form.
   * When NOT to use: omit when no submitter value should be sent.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value paired with `name` when this button submits its form.
   * When NOT to use: omit when the default empty submitter value is intended.
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Prevents activation, removes the button from keyboard reach, and exposes
   * the unavailable state through the internal native button. Wins over
   * `loading` when both are set.
   * When NOT to use: do not use disabled for pending/loading semantics; use
   * `loading`.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Pending state of the action this button started (saving, sending).
   * While set, every activation is blocked (pointer, Enter and Space) and the
   * button neither submits nor resets its form, but it stays focusable, in
   * the Tab order and at its width: the label stays laid out, transparent,
   * and a spinner is drawn in its place. The internal native button is
   * exposed with `aria-disabled="true"` and keeps its name, and
   * `loadingLabel` is announced as a polite status message. `disabled`, and
   * a disabled fieldset, win over it. The application sets it when the
   * action starts and clears it when the action ends.
   * When to use: while the work a click on this button started is running,
   * so a second activation cannot repeat it.
   * When NOT to use: for a button the person cannot use yet (use
   * `disabled`), or for the progress of a page or region (use ki-progress).
   *
   * @default false
   */
  @Prop({ reflect: true }) loading = false;

  /**
   * Text of the polite status message announced while `loading` is set.
   * Override for localization; the default English string is the button's
   * only built-in user-visible text.
   * When to use: provide a localized message whenever the document language
   * is not English, or a more specific one ("Saving").
   * When NOT to use: do not repeat the button's label here; the person
   * already hears it on focus.
   *
   * @default 'Loading'
   */
  @Prop({ attribute: 'loading-label', reflect: true }) loadingLabel = 'Loading';

  @State() private formDisabled = false;
  private button: HTMLButtonElement | undefined;
  private descriptionObserver?: MutationObserver;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** Loading is in effect only on a button that is not disabled (046 D8). */
  private get effectiveLoading(): boolean {
    return this.loading && !this.effectiveDisabled;
  }

  connectedCallback(): void {
    // Armed on every connection, not once on load: disconnectedCallback
    // releases the observer, and a button that is moved in the document (a
    // keyed reorder, a drag between lists) connects again without loading
    // again.
    this.descriptionObserver?.disconnect();
    this.descriptionObserver = new MutationObserver(() => {
      this.syncForwardedDescription();
    });
    this.descriptionObserver.observe(this.host, {
      attributeFilter: ['aria-description'],
    });
    // A description written while the button was out of the document. On the
    // first connection there is no inner button yet: componentDidLoad syncs.
    this.syncForwardedDescription();
  }

  componentWillLoad(): void {
    this.warnDeprecatedVariant(this.variant);
  }

  @Watch('variant')
  protected warnDeprecatedVariant(variant: KiButtonVariant): void {
    // Stencil replaces NODE_ENV in both lazy and custom-element bundles.
    if (process.env.NODE_ENV === 'development' && variant === 'tertiary') {
      console.warn(
        '[Kimen] ki-button variant="tertiary" is deprecated. Use variant="secondary" instead.',
      );
    }
  }

  componentDidLoad(): void {
    this.syncForwardedDescription();
  }

  disconnectedCallback(): void {
    this.descriptionObserver?.disconnect();
  }

  // Assistive tech announces the DELEGATED inner button, not this focus-
  // delegating host, so an `aria-description` set on the host (e.g. by a
  // wrapping ki-tooltip) is never announced. Mirror it onto the inner button.
  // Done imperatively, not in JSX: aria-description is a valid ARIA 1.3 global
  // (jsx-a11y's allow-list is stale and flags it), and Stencil's vdom never
  // renders this attribute, so an imperative write survives re-renders intact.
  private syncForwardedDescription(): void {
    const description = this.host.getAttribute('aria-description');
    if (description === null) {
      this.button?.removeAttribute('aria-description');
    } else {
      this.button?.setAttribute('aria-description', description);
    }
  }

  // A disabled native button never dispatches a real click, but an
  // aria-disabled one (loading) does, for the pointer and for Enter/Space:
  // cancel both, so no activation reaches the application and the form is
  // never touched (046 D3).
  private readonly handleClick = (event: MouseEvent): void => {
    if (this.effectiveDisabled || this.effectiveLoading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (this.toggle) {
      this.selected = !this.selected;
      this.selectionChange.emit({ selected: this.selected });
    } else {
      this.activateFormAction();
    }
  };

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  private activateFormAction(): void {
    const form = this.internals.form;
    if (!form) {
      return;
    }

    const type = normalizeKiButtonType(this.type);
    if (type === 'button') {
      return;
    }

    if (type === 'reset') {
      form.reset();
      return;
    }

    // Form-associated custom elements have no native activation behavior, so
    // a temporary native submitter carries this button's name/value through
    // requestSubmit: constraint validation runs and the submit event fires
    // with native semantics, without dispatching any synthetic click.
    const submitter = document.createElement('button');
    submitter.type = 'submit';
    submitter.hidden = true;
    if (this.name) {
      submitter.name = this.name;
      submitter.value = this.value ?? '';
    }
    form.append(submitter);
    try {
      form.requestSubmit(submitter);
    } finally {
      submitter.remove();
    }
  }

  render() {
    const loading = this.effectiveLoading;
    // The status region is rendered always, empty until the button loads: a
    // polite region created together with its text is not announced (042
    // D6). It sits outside the native button, so its text never joins the
    // button's name (046 D7).
    return [
      <button
        ref={(el) => {
          this.button = el;
        }}
        part="button"
        type="button"
        tabIndex={this.effectiveDisabled ? -1 : 0}
        disabled={this.effectiveDisabled}
        aria-disabled={loading ? 'true' : undefined}
        aria-pressed={this.toggle ? (this.selected ? 'true' : 'false') : undefined}
        onClick={this.handleClick}
        onKeyDown={startKeyboardPress}
        onKeyUp={releaseKeyboardPress}
        onBlur={endKeyboardPress}
      >
        <slot name="start" />
        <span part="label">
          <slot />
        </span>
        <slot name="end" />
        {loading ? (
          // The circular ki-progress geometry (015): a 40-unit grid, a ring
          // of radius 18 measured as 100 units, a non-scaling stroke.
          <svg part="spinner" viewBox="0 0 40 40" aria-hidden="true">
            <circle
              cx="20"
              cy="20"
              r="18"
              pathLength="100"
              fill="none"
              stroke="currentColor"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        ) : null}
      </button>,
      <span class="status" role="status">
        {loading ? this.loadingLabel : null}
      </span>,
    ];
  }
}
