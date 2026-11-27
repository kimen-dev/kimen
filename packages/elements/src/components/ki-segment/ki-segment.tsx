import { Component, Element, Prop, State, Watch, forceUpdate, h, type VNode } from '@stencil/core';

// The loader discovers the tooltip in the segment’s shadow root.
// With direct imports, register ki-tooltip explicitly.
const TOOLTIP_TAG = ['ki', 'tooltip'].join('-');

/**
 * A single choice in a ki-segmented-control.
 *
 * @whenToUse offer one mutually exclusive choice with text or a named icon.
 * @whenNotToUse standalone, for navigation, or for form submission.
 *
 * @slot - Noninteractive visible option label. A label wider than its share of
 * the row wraps onto a second line and every option of the row keeps one
 * height; text that would need a third line ends with an ellipsis, and the
 * full text stays the option's accessible name. Keep it to a few words.
 * @slot start - Decorative leading icon. Supply aria-label for an icon-only option.
 * @part button - The native option surface with radio semantics.
 */
@Component({
  tag: 'ki-segment',
  styleUrl: 'ki-segment.css',
  // Keeps the actual button and its tooltip trigger in the same shadow root.
  shadow: true,
})
export class KiSegment {
  @Element() private readonly host!: HTMLElement;

  /** Required nonempty option identifier. Each value must be unique in its group. */
  @Prop({ reflect: true }) value!: string;

  /**
   * Excludes the option from selection and keyboard navigation.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  /**
   * Accessible name of an icon-only option. An enabled icon-only option also
   * shows this name on focus and hover when ki-tooltip is registered. The
   * loader defines the tooltip when the segment draws it. For a text option,
   * use the visible label.
   */
  @Prop({ attribute: 'aria-label' }) accessibleLabel?: string;

  @State() private hasText = false;

  private contentObserver?: MutationObserver;

  connectedCallback(): void {
    this.contentObserver = new MutationObserver(this.readLabel);
    this.contentObserver.observe(this.host, {
      childList: true,
      characterData: true,
      subtree: true,
      attributeFilter: ['slot'],
    });
    this.readLabel();
  }

  disconnectedCallback(): void {
    this.contentObserver?.disconnect();
  }

  @Watch('data-ki-segment-state')
  protected updateFromGroup(): void {
    // Selection belongs to the group. A private host attribute coordinates the
    // two elements without exposing a writable selected prop on the segment.
    forceUpdate(this.host);
  }

  private readonly readLabel = (): void => {
    this.hasText = [...this.host.childNodes].some(
      (node) =>
        (node.nodeType === Node.TEXT_NODE || (node instanceof HTMLElement && node.slot === '')) &&
        Boolean(node.textContent?.trim()),
    );
  };

  render() {
    const state = this.host.dataset.kiSegmentState;
    const disabled = this.disabled || state === 'unavailable' || state === undefined;
    const selected = state === 'selected' && !disabled;
    const label = this.accessibleLabel?.trim() ?? '';

    // Retain the same native focus target even when the label switches between
    // text and icon-only. A blank tooltip label mounts no bubble.
    const button: VNode = (
      <button
        type="button"
        part="button"
        role="radio"
        aria-label={label || undefined}
        aria-checked={selected ? 'true' : 'false'}
        disabled={disabled}
        tabIndex={selected ? 0 : -1}
      >
        <span class="icon" aria-hidden="true">
          <slot name="start" />
        </span>
        <span class="label" hidden={!this.hasText}>
          <slot />
        </span>
      </button>
    );
    return h(
      TOOLTIP_TAG,
      { class: { tooltip: true }, label: !disabled && !this.hasText ? label : '' },
      button,
    );
  }
}
