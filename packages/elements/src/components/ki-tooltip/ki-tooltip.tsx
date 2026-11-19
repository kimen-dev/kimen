import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { parseDelay } from './ki-tooltip.delay.js';
import {
  normalizePlacement,
  resolveTooltipPosition,
  type KiTooltipPlacement,
} from './ki-tooltip.position.js';

/**
 * A transient, text-only description bubble for one slotted trigger.
 *
 * @whenToUse add a brief clarifying hint for an icon-only, abbreviated, or
 * otherwise ambiguous control when the same information is discoverable
 * elsewhere in the interface.
 * @whenNotToUse essential or unique information in a tooltip; interactive
 * or rich content in a tooltip; form validation messages, disabled controls,
 * or touch-primary flows. Use visible layout text or a future `ki-popover`
 * pattern for those cases.
 *
 * @slot - Exactly one interactive trigger. The component reflects `label` to
 * the trigger's `aria-description`.
 * @part tooltip - The non-focusable tooltip bubble.
 */
@Component({
  tag: 'ki-tooltip',
  styleUrl: 'ki-tooltip.css',
  shadow: true,
})
export class KiTooltip {
  @Element() private readonly host!: HTMLElement;

  /**
   * The entire tooltip content. The string is reflected to the slotted
   * trigger's accessible description without changing its name. Empty or
   * whitespace-only labels render no tooltip and expose no description.
   * When to use: a short hint that clarifies the slotted trigger.
   * When NOT to use: never use `label` for essential information, rich
   * content, interactive content, validation messages, or information attached
   * to disabled controls; put that content in visible UI or a future popover.
   *
   * @default ''
   */
  @Prop() label = '';

  /**
   * Preferred placement for the tooltip. The component may flip or clamp the
   * rendered placement to keep the bubble inside the viewport; unknown runtime
   * values fall back to `top`.
   * When NOT to use: do not depend on placement for meaning or reading order.
   *
   * @default 'top'
   */
  @Prop({ reflect: true }) placement: KiTooltipPlacement = 'top';

  @State() private visible = false;
  @State() private effectivePlacement: KiTooltipPlacement = 'top';
  @State() private crossAxisShift = 0;

  private pointerWithin = false;
  private focusWithin = false;
  private trigger: Element | undefined;
  // The trigger's consumer-authored aria-description, captured when the trigger
  // is assigned so it can be restored on teardown/blank-label instead of being
  // destroyed. `null` = the author set none.
  private authoredDescription: string | null = null;
  private tooltipEl: HTMLDivElement | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeningForEscape = false;

  private get normalizedLabel(): string {
    // Typed as a string, yet a framework passes `undefined` for a prop it has
    // no value for, and removing the attribute assigns `null`: both mean "no
    // label", exactly as an empty one does.
    return (this.label as string | null | undefined)?.trim() ?? '';
  }

  private get hasLabel(): boolean {
    return this.normalizedLabel !== '';
  }

  connectedCallback(): void {
    this.effectivePlacement = normalizePlacement(this.placement);
    this.host.addEventListener('pointerenter', this.handlePointerEnter);
    this.host.addEventListener('pointerleave', this.handlePointerLeave);
    // focusin/focusout bubble and compose across the shadow boundary, so they
    // catch focus on the slotted trigger — no redundant capturing focus/blur
    // pair (review 013 minor).
    this.host.addEventListener('focusin', this.handleFocusIn);
    this.host.addEventListener('focusout', this.handleFocusOut);
    // Back in the document after a move (a reordered row, a keyed list): the
    // trigger kept its place in the slot, so no slotchange describes it again.
    // disconnectedCallback handed the description back to the trigger, so what
    // it carries now is the author's own. On the first connection there is no
    // trigger yet: the first slotchange takes it.
    if (this.trigger) {
      this.authoredDescription = this.trigger.getAttribute('aria-description');
      this.syncTriggerDescription();
    }
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('pointerenter', this.handlePointerEnter);
    this.host.removeEventListener('pointerleave', this.handlePointerLeave);
    this.host.removeEventListener('focusin', this.handleFocusIn);
    this.host.removeEventListener('focusout', this.handleFocusOut);
    this.clearTimer();
    this.removeEscapeListener();
    this.clearTriggerDescription();
    // Leaving the document takes the pointer and the focus away without a
    // pointerleave or a focusout, and closes the popover: what was true of
    // them is not true any more, and the tooltip has to come back hidden.
    this.pointerWithin = false;
    this.focusWithin = false;
    this.visible = false;
  }

  @Watch('label')
  protected handleLabelChange(): void {
    this.syncTriggerDescription();
    if (!this.hasLabel) {
      this.hideNow();
    } else if (this.visible) {
      // Measure AFTER Stencil renders the new label text, or the bubble is
      // positioned from the previous size and can overflow near an edge until
      // it is hidden and shown again (codex review).
      requestAnimationFrame(() => {
        if (this.visible) {
          this.positionTooltip();
        }
      });
    }
  }

  @Watch('placement')
  protected handlePlacementChange(): void {
    if (this.visible) {
      this.positionTooltip();
      return;
    }

    this.effectivePlacement = normalizePlacement(this.placement);
  }

  private readonly handleSlotChange = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const nextTrigger = slot.assignedElements()[0];
    if (nextTrigger !== this.trigger) {
      // Restore the outgoing trigger, then snapshot the incoming trigger's own
      // description BEFORE we overwrite it — re-capture only on a real trigger
      // change so a content-only slotchange never mistakes our label for the
      // author's value.
      this.clearTriggerDescription();
      this.trigger = nextTrigger;
      this.authoredDescription = nextTrigger?.getAttribute('aria-description') ?? null;
    }
    this.syncTriggerDescription();
    this.hideNow();
  };

  private readonly handlePointerEnter = (event: PointerEvent): void => {
    // v1 is a hover/focus affordance and excludes touch: a touch contact also
    // dispatches pointerenter, and left unfiltered it would arm the timer and
    // reveal the tooltip on a tap or long-press (codex review).
    if (event.pointerType === 'touch') {
      return;
    }
    this.pointerWithin = true;
    this.clearTimer();

    if (this.focusWithin || this.visible) {
      this.showNow();
      return;
    }

    const delay = this.readDelay('--ki-tooltip-show-delay');
    if (delay === 0) {
      this.showNow();
      return;
    }

    this.timer = setTimeout(() => {
      this.showNow();
    }, delay);
  };

  private readonly handlePointerLeave = (): void => {
    this.pointerWithin = false;
    this.clearTimer();

    if (this.focusWithin || !this.visible) {
      return;
    }

    const delay = this.readDelay('--ki-tooltip-hide-delay');
    if (delay === 0) {
      this.hideNow();
      return;
    }

    this.timer = setTimeout(() => {
      if (!this.pointerWithin && !this.focusWithin) {
        this.hideNow();
      }
    }, delay);
  };

  private readonly handleFocusIn = (): void => {
    this.focusWithin = true;
    this.clearTimer();
    this.showNow();
  };

  private readonly handleFocusOut = (): void => {
    this.focusWithin = false;
    this.clearTimer();

    if (!this.pointerWithin) {
      this.hideNow();
    }
  };

  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.visible) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.hideNow();
  };

  private clearTimer(): void {
    if (this.timer === undefined) {
      return;
    }

    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private readDelay(name: string): number {
    return parseDelay(getComputedStyle(this.host).getPropertyValue(name));
  }

  private showNow(): void {
    this.clearTimer();

    if (!this.hasLabel) {
      this.hideNow();
      return;
    }

    this.positionTooltip();
    this.visible = true;
    this.syncPopover();
    this.addEscapeListener();
  }

  private hideNow(): void {
    this.clearTimer();
    this.visible = false;
    this.syncPopover();
    this.removeEscapeListener();
  }

  // The bubble is a manual popover: shown, it is painted in the top layer, so
  // no ancestor that clips its overflow (a card, a scroll panel, a dialog body)
  // can cut it off and no stacking context can paint over it. `manual` keeps
  // the platform's light dismiss out of the way: `visible` stays the single
  // source of truth for hover, focus and Escape, and is mirrored here.
  private syncPopover(): void {
    const tooltip = this.tooltipEl;
    if (!tooltip?.isConnected || typeof tooltip.showPopover !== 'function') {
      return;
    }

    const shown = tooltip.matches(':popover-open');
    if (this.visible && !shown) {
      tooltip.showPopover();
    } else if (!this.visible && shown) {
      tooltip.hidePopover();
    }
  }

  private addEscapeListener(): void {
    if (this.listeningForEscape) {
      return;
    }

    document.addEventListener('keydown', this.handleDocumentKeyDown, { capture: true });
    this.listeningForEscape = true;
  }

  private removeEscapeListener(): void {
    if (!this.listeningForEscape) {
      return;
    }

    document.removeEventListener('keydown', this.handleDocumentKeyDown, { capture: true });
    this.listeningForEscape = false;
  }

  // While the tooltip has a label it owns the trigger's `aria-description`; on
  // teardown/blank-label it RESTORES the consumer's original value (captured on
  // assignment) rather than destroying it. aria-describedby is untouched and
  // wins accname computation, so that path stays safe.
  //
  // Cross-shadow limitation: when the trigger is itself a focus-delegating
  // custom element (its real focus target lives in a shadow root, e.g.
  // ki-button), `aria-description` set on the host is not merged into the
  // delegated inner control's description by assistive tech. Announcing there
  // requires the trigger to forward the description from its own shadow — the
  // tooltip cannot reach across that boundary, and must not try to.
  private clearTriggerDescription(): void {
    if (!this.trigger) {
      return;
    }

    if (this.authoredDescription !== null) {
      this.trigger.setAttribute('aria-description', this.authoredDescription);
    } else {
      this.trigger.removeAttribute('aria-description');
    }
  }

  private syncTriggerDescription(): void {
    if (!this.trigger) {
      return;
    }

    if (!this.hasLabel) {
      this.clearTriggerDescription();
      return;
    }

    this.trigger.setAttribute('aria-description', this.normalizedLabel);
  }

  private positionTooltip(): void {
    const tooltip = this.tooltipEl;
    if (!tooltip) {
      this.effectivePlacement = normalizePlacement(this.placement);
      this.crossAxisShift = 0;
      return;
    }

    const dir = this.host.matches(':dir(rtl)') ? 'rtl' : 'ltr';
    const position = resolveTooltipPosition({
      placement: this.placement,
      dir,
      triggerRect: this.host.getBoundingClientRect(),
      tooltipRect: this.measureTooltip(tooltip),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      offset: this.measureOffset(),
    });

    this.effectivePlacement = position.effectivePlacement;
    this.crossAxisShift = position.crossAxisShift;
  }

  // The closed bubble generates no box (it must not widen the page), so it is
  // laid out, still invisible, for this one synchronous read. A no-op while
  // the bubble is already shown.
  private measureTooltip(tooltip: HTMLElement): DOMRect {
    tooltip.classList.add('is-measuring');
    const rect = tooltip.getBoundingClientRect();
    tooltip.classList.remove('is-measuring');
    return rect;
  }

  // Resolve `--ki-tooltip-offset` to px by laying it out on a hidden probe in
  // the shadow root (which inherits the host custom properties). Layout returns
  // px for any authored unit — rem, em, px — so the flip decision is correct
  // regardless of the root font size, without hard-coding 16px/rem.
  private measureOffset(): number {
    const root = this.host.shadowRoot;
    if (!root) {
      return 0;
    }
    const probe = this.host.ownerDocument.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;inline-size:var(--_ki-tooltip-offset)';
    root.appendChild(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return Number.isFinite(px) ? px : 0;
  }

  render() {
    const tooltipStyle = {
      '--_ki-tooltip-cross-shift': `${String(this.crossAxisShift)}px`,
    };

    return (
      <Host>
        <slot onSlotchange={this.handleSlotChange} />
        {this.hasLabel ? (
          <div
            ref={(el) => {
              this.tooltipEl = el;
            }}
            part="tooltip"
            role="tooltip"
            popover="manual"
            class={{
              tooltip: true,
              'is-visible': this.visible,
              [`placement-${this.effectivePlacement}`]: true,
            }}
            style={tooltipStyle}
          >
            {this.normalizedLabel}
          </div>
        ) : null}
      </Host>
    );
  }
}
