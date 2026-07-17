import { Component, Element, h, Prop } from '@stencil/core';

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
 * sighted discoverability.
 * @whenNotToUse whenever a visible label fits (use ki-button), toggling
 * state (a future toggle icon button), navigation (use a link), or form
 * submit/reset (ki-icon-button is not form-associated; use ki-button, whose
 * visible label communicates the consequence).
 *
 * @slot - Exactly one decorative icon. The slot is presentational: its
 * content is hidden from assistive technology and never contributes to the
 * accessible name — that comes from `label` alone.
 * @part button - Internal native button.
 * @part icon - Icon wrapper around the default slot.
 */
@Component({
  tag: 'ki-icon-button',
  styleUrl: 'ki-icon-button.css',
  shadow: { delegatesFocus: true },
})
export class KiIconButton {
  @Element() private readonly host!: HTMLElement;

  /**
   * Visual hierarchy for the action. Use `primary` for the single main action
   * in a view and lower-emphasis variants for supporting actions.
   * When NOT to use: do not use variant to signal success or danger; use
   * `tone` for intent.
   *
   * @default 'secondary'
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
  @Prop({ reflect: true }) label?: string;

  /**
   * Prevents activation, removes the icon button from keyboard reach, and
   * exposes the unavailable state through the internal native button.
   * When NOT to use: do not use disabled for pending/loading semantics.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  private button: HTMLButtonElement | undefined;
  private descriptionObserver?: MutationObserver;

  componentDidLoad(): void {
    this.syncForwardedDescription();
    if (typeof MutationObserver !== 'undefined') {
      this.descriptionObserver = new MutationObserver(() => {
        this.syncForwardedDescription();
      });
      this.descriptionObserver.observe(this.host, {
        attributeFilter: ['aria-description'],
      });
    }
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

  // A real browser never dispatches click on a disabled native button, but
  // synthetic activation (element.click(), dispatched events) still would:
  // cancel both phases so the disabled contract (S2) holds for every caller
  // (002 precedent).
  private readonly handleClick = (event: MouseEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  render() {
    // Not form-associated (FR-008): no ElementInternals, and the internal
    // native button is type="button" inside the shadow root, so activation
    // can never submit or reset an enclosing form.
    return (
      <button
        ref={(el) => {
          this.button = el;
        }}
        part="button"
        type="button"
        tabIndex={this.disabled ? -1 : 0}
        disabled={this.disabled}
        aria-label={this.label}
        onClick={this.handleClick}
      >
        <span part="icon" aria-hidden="true">
          <slot />
        </span>
      </button>
    );
  }
}
