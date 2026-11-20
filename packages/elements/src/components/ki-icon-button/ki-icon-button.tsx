import { Component, Element, Event, type EventEmitter, h, Prop, Watch } from '@stencil/core';
import { syncButtonAria } from '../../utils/button-aria';
import type { KiDialogCommand } from '../../utils/dialog-invoker';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press';

export type KiIconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'ghost'
  | 'outline';
export type KiIconButtonTone = 'neutral' | 'success' | 'danger';
export type KiIconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * A token-styled, icon-only action button with native button semantics and a
 * mandatory accessible name.
 *
 * @whenToUse a compact, widely understood action where space precludes a
 * visible label: toolbars, card and dialog corners (close), media transport,
 * data-row actions. Always supply `label`; usually pair with ki-tooltip for
 * sighted discoverability. Enable `toggle` for persistent actions such as
 * Bookmark. While the action it started is in progress, set `loading`.
 * @whenNotToUse whenever a visible label fits (use ki-button),
 * navigation (use a link), or form
 * submit/reset (ki-icon-button is not form-associated; use ki-button, whose
 * visible label communicates the consequence).
 *
 * @slot - Exactly one decorative icon. The slot is presentational: its
 * content is hidden from assistive technology and never contributes to the
 * accessible name. Supply `label` or use a named trailing list control.
 * @slot selected - Optional decorative icon shown when the toggle is selected.
 * If omitted, the default icon stays visible and an inline SVG takes a current-colour fill.
 * @slot counter - Decorative ki-counter in the block-start inline-end corner.
 * Include its meaning in the button label.
 * @part button - Internal native button.
 * @part icon - Icon wrapper around the default slot.
 * @part spinner - Loading spinner drawn in place of the icon, in the button's
 * foreground ink, rendered only while `loading` is in effect.
 */
@Component({
  tag: 'ki-icon-button',
  styleUrls: [
    '../ki-button/ki-button.surface.css',
    '../ki-button/ki-button.surface.legacy.css',
    '../ki-button/ki-button.toggle.css',
    'ki-icon-button.css',
  ],
  shadow: { delegatesFocus: true },
})
export class KiIconButton {
  @Element() private readonly host!: HTMLElement;

  /**
   * Visual hierarchy for the action. Use filled `primary` for the single main
   * action, outlined `secondary` for supporting actions, `quaternary` for
   * neutral icon actions, `ghost` for accent icon actions and `outline` for
   * an unfilled action with a visible boundary.
   * When NOT to use: do not use variant to signal success or danger; use
   * `tone` for intent.
   *
   * @default 'secondary'
   * @deprecatedValue tertiary
   */
  @Prop({ reflect: true }) variant: KiIconButtonVariant = 'secondary';

  /**
   * Semantic intent for the action, independent of hierarchy. Use `success`
   * for confirming actions and `danger` for destructive actions. Toggle
   * palettes are specific to the variant.
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
   * Required in the catalog. When slotted as a trailing list control, the
   * row text supplies a fallback through the host aria-label.
   * Use ki-button when the action has a visible label.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Enables persistent press state for an action such as Bookmark. The
   * native button exposes `aria-pressed` and each activation switches
   * `selected`. Keep the same accessible label in both states.
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
  change!: EventEmitter<{ selected: boolean }>;

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

  /**
   * Application-owned toggle state. The native icon button exposes this as
   * `aria-pressed` when `toggle` is off. Omit for a momentary action.
   */
  @Prop() pressed?: boolean;

  /**
   * Application-owned disclosure state for a trigger that opens a popup.
   * The native icon button exposes this as `aria-expanded`. Use with
   * `aria-haspopup="menu"` for a menu trigger. Omit for other actions.
   */
  @Prop() expanded?: boolean;

  componentWillLoad(): void {
    if (process.env.NODE_ENV === 'development') {
      this.warnDeprecatedVariant(this.variant);
    }
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
    this.forwardButtonAria();
  }

  @Watch('aria-description')
  @Watch('aria-haspopup')
  @Watch('aria-label')
  @Watch('label')
  protected forwardButtonAria(): void {
    const button = this.host.shadowRoot?.querySelector('button');
    if (!button) return;
    syncButtonAria(this.host, button);
    button.ariaLabel = this.label || this.host.ariaLabel;
  }

  // A real browser never dispatches click on a disabled native button, but
  // synthetic activation (element.click(), dispatched events) still would:
  // cancel both phases so the disabled contract (S2) holds for every caller
  // (002 precedent). An aria-disabled (loading) button does dispatch real
  // clicks, for the pointer and for Enter/Space: cancelled the same way (046
  // D3).
  readonly #handleClick = (event: MouseEvent): void => {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else if (this.toggle) {
      const selected = !this.selected;
      this.selected = selected;
      this.change.emit({ selected });
    }
  };

  render() {
    // Not form-associated (FR-008): no ElementInternals, and the internal
    // native button is type="button" inside the shadow root, so activation
    // can never submit or reset an enclosing form.
    const loading = this.loading && !this.disabled;
    const pressed = this.toggle ? this.selected : this.pressed;
    const expanded = this.expanded;
    const defaultIcon = <slot key="glyph" />;
    const { command, commandfor } = this;
    const onClick = this.#handleClick;
    // The status region is rendered always, empty until the button loads: a
    // polite region created together with its text is not announced (042
    // D6). It sits outside the native button, next to it (046 D7).
    // Keep visible capped counts beside the button too, so they stay separate
    // from the control's own label.
    // Stable keys for this fixed tree avoid shipping Stencil's generated hashes.
    return [
      <span key="control" class="control">
        <button
          key="button"
          part="button"
          type="button"
          {...(commandfor === undefined ? {} : { commandfor })}
          {...(command === undefined ? {} : { command })}
          tabIndex={this.disabled ? -1 : 0}
          disabled={this.disabled}
          aria-disabled={loading ? 'true' : undefined}
          aria-pressed={pressed == null ? undefined : pressed ? 'true' : 'false'}
          aria-expanded={expanded == null ? undefined : expanded ? 'true' : 'false'}
          onClick={onClick}
          onKeyDown={startKeyboardPress}
          onKeyUp={releaseKeyboardPress}
          onBlur={endKeyboardPress}
        >
          <span key="icon" part="icon" aria-hidden="true">
            {this.toggle && pressed ? <slot name="selected">{defaultIcon}</slot> : defaultIcon}
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
        <slot key="counter" name="counter" />
      </span>,
      <span key="status" class="status" role="status">
        {loading ? this.loadingLabel : null}
      </span>,
    ];
  }
}
