import { Component, Element, h, Prop, Watch } from '@stencil/core';
import type { KiDialogCommand } from '../../utils/dialog-invoker';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press';

export type KiIconButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'ghost';
export type KiIconButtonTone = 'neutral' | 'success' | 'danger';
export type KiIconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * A token-styled, icon-only action button with native button semantics and a
 * mandatory accessible name.
 *
 * @whenToUse a compact, widely understood action where space precludes a
 * visible label: toolbars, card and dialog corners (close), media transport,
 * data-row actions. Always supply `label`; usually pair with ki-tooltip for
 * sighted discoverability. While the action it started is in progress, set
 * `loading` instead of disabling it.
 * @whenNotToUse whenever a visible label fits (use ki-button), toggling
 * state (a future toggle icon button), navigation (use a link), or form
 * submit/reset (ki-icon-button is not form-associated; use ki-button, whose
 * visible label communicates the consequence).
 *
 * @slot - Exactly one decorative icon. The slot is presentational: its
 * content is hidden from assistive technology and never contributes to the
 * accessible name — that comes from `label` alone.
 * @slot counter - Decorative ki-counter in the block-start inline-end corner.
 * Include its meaning in the button label.
 * @part button - Internal native button.
 * @part icon - Icon wrapper around the default slot.
 * @part spinner - Loading spinner drawn in place of the icon, in the button's
 * foreground ink, rendered only while `loading` is in effect.
 */
@Component({
  tag: 'ki-icon-button',
  styleUrls: ['../ki-button/ki-button.surface.css', 'ki-icon-button.css'],
  shadow: { delegatesFocus: true },
})
export class KiIconButton {
  @Element() private readonly host!: HTMLElement;

  /**
   * Visual hierarchy for the action. Use filled `primary` for the single main
   * action, outlined `secondary` for supporting actions, `quaternary` for
   * neutral icon actions, and `ghost` for accent icon actions.
   * When NOT to use: do not use variant to signal success or danger; use
   * `tone` for intent.
   *
   * @default 'secondary'
   * @deprecatedValue tertiary
   */
  @Prop({ reflect: true }) variant: KiIconButtonVariant = 'secondary';

  /**
   * Semantic intent for the action, independent of hierarchy. Use `success`
   * for confirming actions and `danger` for destructive actions.
   * When NOT to use: do not use tone for visual hierarchy; use `variant`.
   *
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiIconButtonTone = 'neutral';

  /**
   * Token-backed square size. Every size keeps at least the 24×24 minimum
   * pointer target (`xs` sits exactly on it); choose the size that matches
   * the density of the surrounding UI.
   * When NOT to use: do not shrink below `xs` through tokens; no theme may
   * go under the WCAG 2.2 pointer-target floor.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiIconButtonSize = 'md';

  /**
   * Accessible name of the internal focusable button ("Close", "Play").
   * Required in the catalog contract: the icon is presentational, so without
   * a label the control exposes no name and fails the accessibility audit.
   * The component never invents a fallback name.
   * When NOT to use: never omit it; never duplicate it as visible text (a
   * visible label means ki-button).
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * ID of a ki-dialog in the same document or shadow tree as this button.
   * Set it together with `command` to connect a dialog declaratively.
   *
   * @default undefined
   */
  @Prop({ reflect: true }) commandfor?: string;

  /**
   * Dialog action to run for `commandfor`. Use `show-modal` to open,
   * `close` for direct dismissal, or `request-close` for guarded dismissal.
   * Choose a command for local dialog control and omit it for other actions.
   *
   * @default undefined
   */
  @Prop({ reflect: true }) command?: KiDialogCommand;

  /**
   * Prevents activation, removes the icon button from keyboard reach, and
   * exposes the unavailable state through the internal native button. Wins
   * over `loading` when both are set.
   * When NOT to use: do not use disabled for pending/loading semantics; use
   * `loading`.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Pending state of the action this icon button started (refreshing,
   * sending). While set, every activation is blocked (pointer, Enter and
   * Space), but the icon button stays focusable, in the Tab order and at its
   * size: the icon stays laid out, transparent, and a spinner is drawn in its
   * place. The internal native button is exposed with `aria-disabled="true"`
   * and keeps its `label`, and `loadingLabel` is announced as a polite status
   * message. `disabled` wins over it. The application sets it when the
   * action starts and clears it when the action ends.
   * When to use: while the work a click on this icon button started is
   * running, so a second activation cannot repeat it.
   * When NOT to use: for an icon button the person cannot use yet (use
   * `disabled`), or for the progress of a page or region (use ki-progress).
   *
   * @default false
   */
  @Prop({ reflect: true }) loading = false;

  /**
   * Text of the polite status message announced while `loading` is set.
   * Override for localization; the default English string is the icon
   * button's only built-in user-visible text.
   * When to use: provide a localized message whenever the document language
   * is not English, or a more specific one ("Refreshing").
   * When NOT to use: do not repeat `label` here; the person already hears it
   * on focus.
   *
   * @default 'Loading'
   */
  @Prop({ attribute: 'loading-label', reflect: true }) loadingLabel = 'Loading';

  private button: HTMLButtonElement | undefined;
  private descriptionObserver?: MutationObserver;

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
  protected warnDeprecatedVariant(variant: KiIconButtonVariant): void {
    // Stencil replaces NODE_ENV in both lazy and custom-element bundles.
    if (process.env.NODE_ENV === 'development' && variant === 'tertiary') {
      console.warn(
        '[Kimen] ki-icon-button variant="tertiary" is deprecated. Use variant="secondary" instead.',
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
  // renders this attribute, so an imperative write survives re-renders intact
  // (002 FR-015 pattern, here FR-014).
  private syncForwardedDescription(): void {
    const description = this.host.getAttribute('aria-description');
    if (description === null) {
      this.button?.removeAttribute('aria-description');
    } else {
      this.button?.setAttribute('aria-description', description);
    }
  }

  /** Loading is in effect only on an icon button that is not disabled (046 D8). */
  private get effectiveLoading(): boolean {
    return this.loading && !this.disabled;
  }

  // A real browser never dispatches click on a disabled native button, but
  // synthetic activation (element.click(), dispatched events) still would:
  // cancel both phases so the disabled contract (S2) holds for every caller
  // (002 precedent). An aria-disabled (loading) button does dispatch real
  // clicks, for the pointer and for Enter/Space: cancelled the same way (046
  // D3).
  private readonly handleClick = (event: MouseEvent): void => {
    if (this.disabled || this.effectiveLoading) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  render() {
    // Not form-associated (FR-008): no ElementInternals, and the internal
    // native button is type="button" inside the shadow root, so activation
    // can never submit or reset an enclosing form.
    const loading = this.effectiveLoading;
    // The status region is rendered always, empty until the button loads: a
    // polite region created together with its text is not announced (042
    // D6). It sits outside the native button, next to it (046 D7).
    // Keep visible capped counts beside the button too, so they stay separate
    // from the control's own label.
    return [
      <span class="control">
        <button
          ref={(el) => {
            this.button = el;
          }}
          part="button"
          type="button"
          {...(this.commandfor === undefined ? {} : { commandfor: this.commandfor })}
          {...(this.command === undefined ? {} : { command: this.command })}
          tabIndex={this.disabled ? -1 : 0}
          disabled={this.disabled}
          aria-disabled={loading ? 'true' : undefined}
          aria-label={this.label}
          onClick={this.handleClick}
          onKeyDown={startKeyboardPress}
          onKeyUp={releaseKeyboardPress}
          onBlur={endKeyboardPress}
        >
          <span part="icon" aria-hidden="true">
            <slot />
          </span>
          {loading ? (
            // The circular ki-progress geometry (015), as in ki-button.
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
        </button>
        <slot name="counter" />
      </span>,
      <span class="status" role="status">
        {loading ? this.loadingLabel : null}
      </span>,
    ];
  }
}
