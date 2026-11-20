import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { resolveOverlayAnchor } from '../../utils/anchored-overlay.js';
import { measureCssAnchor } from '../../utils/anchored-overlay-layout.js';
import { resolveOverlayPosition } from '../../utils/anchored-overlay-position.js';
import { shadowFocusTarget } from '../../utils/shadow-focus.js';
import { attachTooltipDescription, createTooltipDescription } from './ki-tooltip.description.js';
import { readRichTooltipText } from './ki-tooltip.rich-text.js';
import { parseDelay } from './ki-tooltip.delay.js';
import { TooltipOverlay, type TooltipOverlayOptions } from './ki-tooltip.overlay.js';
import {
  normalizePlacement,
  resolveAnchorCorrection,
  resolveTooltipPosition,
  type KiTooltipPlacement,
} from './ki-tooltip.position.js';

/**
 * A transient, text-only hint with an optional heading.
 *
 * @whenToUse add a brief clarifying hint for an icon-only, abbreviated, or
 * otherwise ambiguous control when the same information is discoverable
 * elsewhere in the interface.
 * @whenNotToUse essential or unique information in a tooltip; interactive
 * content in a tooltip; form validation messages, disabled controls, or
 * touch-primary flows. Use visible layout text or a rich `ki-popover` with
 * `kind="toggletip"` when the content includes actions.
 *
 * @slot - One trigger for a plain tooltip, or direct explanatory text when
 * `for` and `heading` are provided. Rich tooltips accept text only.
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
   * The entire plain tooltip content. The string is reflected to the slotted
   * trigger's accessible description without changing its name. Empty or
   * whitespace-only labels render no tooltip and expose no description.
   * When to use: a short hint that clarifies the slotted trigger.
   * When NOT to use: never use `label` for essential information, rich
   * content, interactive content, validation messages, or information attached
   * to disabled controls; put that content in visible UI or a popover.
   *
   * @default ''
   */
  @Prop() label = '';

  /** ID of the rich tooltip's external trigger in the same document or shadow tree. */
  @Prop() for?: string;

  /** Rich tooltip heading. Pair it with `for` and optional direct text in the default slot. */
  @Prop() heading?: string;

  /**
   * Preferred placement for the tooltip. The component may flip or clamp the
   * rendered placement to keep the bubble inside the viewport; unknown runtime
   * values fall back to `top`.
   * When NOT to use: do not depend on placement for meaning or reading order.
   *
   * @default 'top'
   */
  @Prop({ reflect: true }) placement: KiTooltipPlacement = 'top';

  @State() private richText = '';
  @State() private visible = false;
  @State() private effectivePlacement: KiTooltipPlacement = 'top';
  @State() private crossAxisShift = 0;
  /**
   * How far the bubble moves to sit against the trigger the person sees,
   * where anchor positioning placed it against another box (Firefox under a
   * transformed ancestor). Zero wherever the engine already gets it right.
   */
  @State() private anchorShiftX = 0;
  @State() private anchorShiftY = 0;

  private pointerWithin = false;
  private focusWithin = false;
  private trigger: Element | undefined;
  // The trigger's consumer-authored aria-description, captured when the trigger
  // is assigned so it can be restored on teardown/blank-label instead of being
  // destroyed. `null` = the author set none.
  private authoredDescription: string | null = null;
  private richTrigger: Element | undefined;
  private richDescription: HTMLSpanElement | undefined;
  private descriptionTarget: Element | undefined;
  private releaseDescription: (() => void) | undefined;
  private interaction?: AbortController;
  private readonly richObserver = new MutationObserver((records) => {
    this.bindRichTrigger();
    if (records.some(({ target }) => target === this.host || target.parentNode === this.host)) {
      this.syncRichContent();
    }
    const trigger = this.richTrigger;
    if (
      this.visible &&
      trigger &&
      records.some(({ removedNodes }) =>
        Array.from(removedNodes).some((node) => node.contains(trigger)),
      )
    ) {
      // Rebind scrolling ancestors when an open trigger is reparented.
      this.overlay.show(this.tooltipEl, trigger, { ...this.richOverlayOptions });
    }
  });
  private readonly richControlObserver = new MutationObserver(() => {
    this.syncRichDescription();
  });
  private tooltipEl: HTMLDivElement | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly overlay = new TooltipOverlay(() => {
    this.hideNow();
  });

  private readonly richOverlayOptions: TooltipOverlayOptions = {
    position: (panel, trigger, view, move) => {
      const events = new AbortController();
      const options = { capture: true, passive: true, signal: events.signal };
      // Scroll events stay within their shadow root, including when the
      // trigger is projected through a slot in another component.
      let ancestor: Node | null = trigger;
      while (ancestor) {
        if (ancestor instanceof ShadowRoot) {
          ancestor.addEventListener('scroll', move, options);
          ancestor = ancestor.host;
        } else {
          const node = ancestor as Node & { assignedSlot?: HTMLSlotElement | null };
          ancestor = node.assignedSlot ?? node.parentNode;
        }
      }
      view.addEventListener('scroll', move, options);
      view.addEventListener('resize', move, options);
      const sizes = new ResizeObserver(move);
      sizes.observe(trigger);
      sizes.observe(panel);
      return {
        cleanup: () => {
          sizes.disconnect();
          events.abort();
        },
        update: () => {
          const dir = getComputedStyle(trigger).direction === 'rtl' ? 'rtl' : 'ltr';
          const { x, y, effectivePlacement } = resolveOverlayPosition({
            placement: normalizePlacement(this.placement),
            offset: Number.parseFloat(getComputedStyle(panel).scrollMarginBlockStart) || 0,
            dir,
            triggerRect: trigger.getBoundingClientRect(),
            popupRect: panel.getBoundingClientRect(),
            viewport: { width: view.innerWidth, height: view.innerHeight },
          });
          panel.dir = dir;
          panel.style.left = `${String(x)}px`;
          panel.style.top = `${String(y)}px`;
          panel.dataset.side = effectivePlacement;
        },
      };
    },
  };

  private get normalizedLabel(): string {
    // Typed as a string, yet a framework passes `undefined` for a prop it has
    // no value for, and removing the attribute assigns `null`: both mean "no
    // label", exactly as an empty one does.
    return (this.label as string | null | undefined)?.trim() ?? '';
  }

  private get isRich(): boolean {
    return Boolean(this.for?.trim());
  }

  private get richHeading(): string {
    return this.heading?.trim() ?? '';
  }

  connectedCallback(): void {
    this.effectivePlacement = normalizePlacement(this.placement);
    this.connectInteraction();
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

  componentDidLoad(): void {
    if (this.isRich && this.focusWithin) this.showRichTooltip();
  }

  disconnectedCallback(): void {
    this.disconnectInteraction();
    this.clearTriggerDescription();
    // Leaving the document takes the pointer and the focus away without a
    // pointerleave or a focusout, and closes the popover: what was true of
    // them is not true any more, and the tooltip has to come back hidden.
    this.resetInteraction();
  }

  @Watch('for')
  private handleAnchorChange(): void {
    if (!this.host.isConnected) return;
    this.resetInteraction();
    this.clearTriggerDescription();
    this.trigger = undefined;
    this.disconnectInteraction();
    this.connectInteraction();
  }

  @Watch('heading')
  private syncRichContent(): void {
    if (!this.isRich || !this.host.isConnected) return;
    this.richText = readRichTooltipText(this.host.childNodes);
    this.syncRichDescription();
    if (!this.richHeading) this.hideNow();
  }

  @Watch('label')
  protected handleLabelChange(): void {
    if (this.isRich) return;
    this.syncTriggerDescription();
    if (!this.normalizedLabel) {
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
    if (this.isRich) {
      if (this.visible) this.overlay.reposition();
      return;
    }
    if (this.visible) {
      this.positionTooltip();
      return;
    }

    this.effectivePlacement = normalizePlacement(this.placement);
  }

  private connectInteraction(): void {
    if (this.isRich) {
      this.richObserver.observe(this.host.getRootNode(), {
        childList: true,
        subtree: true,
        attributeFilter: ['id'],
      });
      this.richObserver.observe(this.host, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      this.syncRichContent();
      this.bindRichTrigger();
    } else {
      this.listenToTrigger(this.host);
    }
  }

  private disconnectInteraction(): void {
    this.interaction?.abort();
    this.richObserver.disconnect();
    this.richControlObserver.disconnect();
    this.richTrigger = undefined;
    this.clearRichDescription();
  }

  private listenToTrigger(trigger: Element): void {
    this.interaction = new AbortController();
    const options = { signal: this.interaction.signal };
    trigger.addEventListener('pointerenter', this.handlePointerEnter, options);
    trigger.addEventListener('pointerleave', this.handlePointerLeave, options);
    // These events compose across a custom trigger's shadow boundary.
    trigger.addEventListener('focusin', this.handleFocusIn, options);
    trigger.addEventListener('focusout', this.handleFocusOut, options);
  }

  private bindRichTrigger(): void {
    const id = this.for?.trim();
    const anchor = id ? resolveOverlayAnchor(this.host, id) : null;
    const trigger = anchor && !this.host.contains(anchor) ? anchor : undefined;
    if (trigger === this.richTrigger) return;

    this.interaction?.abort();
    this.richControlObserver.disconnect();
    this.resetInteraction();
    this.richTrigger = trigger;
    if (!trigger) {
      this.clearRichDescription();
      return;
    }

    this.listenToTrigger(trigger);
    const observeControl = () => {
      if (this.richTrigger !== trigger) return;
      if (trigger.shadowRoot) {
        this.richControlObserver.observe(trigger.shadowRoot, {
          childList: true,
          subtree: true,
          attributeFilter: ['tabindex'],
        });
      }
      this.syncRichDescription();
    };
    observeControl();
    if (trigger.localName.includes('-') && !customElements.get(trigger.localName)) {
      void customElements.whenDefined(trigger.localName).then(observeControl);
    }
    if (trigger.matches(':focus-within')) this.handleFocusIn();
  }

  private syncRichDescription(): void {
    const trigger = this.richTrigger;
    if (!trigger || !this.richHeading) {
      this.clearRichDescription();
      return;
    }

    const description = (this.richDescription ??= createTooltipDescription(this.host));
    if (description.parentNode !== this.host) this.host.append(description);
    const text = [this.richHeading, this.richText].filter(Boolean).join(' ');
    if (description.textContent !== text) description.textContent = text;

    const target = shadowFocusTarget(trigger) ?? trigger;
    if (target !== this.descriptionTarget) {
      this.releaseDescription?.();
      this.descriptionTarget = target;
      this.releaseDescription = attachTooltipDescription(target, description);
    }
  }

  private clearRichDescription(): void {
    this.releaseDescription?.();
    this.releaseDescription = undefined;
    this.descriptionTarget = undefined;
    this.richDescription?.remove();
    this.richDescription = undefined;
  }

  private readonly handleSlotChange = (event: Event): void => {
    if (this.isRich) return;
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

  private readonly handlePointerEnter = (event: Event): void => {
    // v1 is a hover/focus affordance and excludes touch: a touch contact also
    // dispatches pointerenter, and left unfiltered it would arm the timer and
    // reveal the tooltip on a tap or long-press (codex review).
    if (event instanceof PointerEvent && event.pointerType === 'touch') {
      return;
    }
    this.pointerWithin = true;
    this.clearTimer();

    if (this.isRich && this.visible) return;

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

  private readonly handlePointerLeave = (event: Event): void => {
    // Related targets retarget to the host across the panel's shadow boundary.
    if (
      this.isRich &&
      event instanceof PointerEvent &&
      event.relatedTarget instanceof Node &&
      (this.host.contains(event.relatedTarget) || this.richTrigger?.contains(event.relatedTarget))
    ) {
      return;
    }
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

    if (this.isRich) {
      this.showRichTooltip();
      return;
    }

    if (!this.normalizedLabel) {
      this.hideNow();
      return;
    }

    this.positionTooltip();
    this.visible = true;
    this.overlay.show(this.tooltipEl, this.host);
  }

  private showRichTooltip(): void {
    if (this.richTrigger && this.richHeading) {
      this.visible = this.overlay.show(this.tooltipEl, this.richTrigger, this.richOverlayOptions);
    }
  }

  private resetInteraction(): void {
    this.pointerWithin = false;
    this.focusWithin = false;
    this.hideNow();
  }

  private hideNow(): void {
    this.clearTimer();
    this.visible = false;
    this.overlay.hide();
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

    if (!this.normalizedLabel) {
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
    const triggerRect = this.host.getBoundingClientRect();
    const position = resolveTooltipPosition({
      placement: this.placement,
      dir,
      triggerRect,
      tooltipRect: this.measureTooltip(tooltip),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      offset: this.measureOffset(),
    });

    this.effectivePlacement = position.effectivePlacement;
    this.crossAxisShift = position.crossAxisShift;
    const resolvedAnchor = measureCssAnchor(tooltip, '--ki-tooltip-anchor');
    const correction = resolvedAnchor
      ? resolveAnchorCorrection(position.effectivePlacement, dir, resolvedAnchor, triggerRect)
      : { x: 0, y: 0 };
    this.anchorShiftX = correction.x;
    this.anchorShiftY = correction.y;
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
    const tooltipStyle: Record<string, string> = {
      '--_ki-tooltip-cross-shift': `${String(this.crossAxisShift)}px`,
    };
    // Only where the engine misplaced the anchor: a transform on the bubble
    // is otherwise absent, and every engine that gets it right paints exactly
    // what it painted before. `transform` composes with the `translate` the
    // placement and the motion use, so neither has to know about it.
    if (this.anchorShiftX !== 0 || this.anchorShiftY !== 0) {
      tooltipStyle.transform = `translate(${String(this.anchorShiftX)}px, ${String(this.anchorShiftY)}px)`;
    }

    const rich = this.isRich;
    const panelProps = rich
      ? { onPointerEnter: this.handlePointerEnter, onPointerLeave: this.handlePointerLeave }
      : { style: tooltipStyle };

    return (
      <Host key="root">
        {rich ? null : <slot onSlotchange={this.handleSlotChange} />}
        {(rich ? this.richHeading : this.normalizedLabel) ? (
          <div
            key={rich ? 'rich' : 'plain'}
            ref={(el) => {
              this.tooltipEl = el;
            }}
            part="tooltip"
            role="tooltip"
            popover="manual"
            class={{
              tooltip: true,
              rich,
              'is-visible': !rich && this.visible,
              [`placement-${this.effectivePlacement}`]: !rich,
            }}
            {...panelProps}
          >
            {rich
              ? [
                  <strong class="rich-heading">{this.richHeading}</strong>,
                  this.richText ? <p class="rich-body">{this.richText}</p> : null,
                ]
              : [<span class="arrow" aria-hidden="true" />, this.normalizedLabel]}
          </div>
        ) : null}
      </Host>
    );
  }
}
