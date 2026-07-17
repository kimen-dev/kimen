import { Component, h, Prop, State, Watch } from '@stencil/core';

export type KiScrollerOrientation = 'vertical' | 'horizontal';

/**
 * A bounded scroll container that clips its content along one declared axis
 * and replaces platform scrollbar chrome with a token-resolved indicator.
 *
 * @whenToUse a bounded region inside a view whose content can outgrow it:
 * chat or message panes, code and log blocks, tag rows, sidebar navigation,
 * tall menus inside cards. Give it bounds (its size comes entirely from your
 * layout) and a `label` (required: the accessible name of the scroll
 * region). Scrolling stays native — wheel, touch, keyboard and indicator
 * drag operate the viewport directly.
 * @whenNotToUse page-level scrolling (the browser's job), carousels or
 * paginated media (future indicator/carousel patterns), virtualized long
 * collections, multi-column tabular data, or nesting scrollers (v1
 * guarantees a single scroll axis per region). Cross-axis overflow is an
 * authoring mistake: the scroller scrolls its declared axis only and clips
 * the other — wrap or size content on the cross axis.
 *
 * @part viewport - The scroll viewport: surface, focus ring and, as native
 * scrollbar chrome styled from `--ki-scroller-*` tokens, the indicator.
 */
@Component({
  tag: 'ki-scroller',
  styleUrl: 'ki-scroller.css',
  shadow: true,
})
export class KiScroller {
  /**
   * Declared scroll axis, mapping the design source's `Type` axis:
   * `vertical` (default) scrolls the block axis, `horizontal` the inline
   * axis. One axis per instance; the cross axis clips. A structural axis,
   * never appearance — thickness, shape and colors of the indicator are
   * per-theme `--ki-scroller-*` tokens. An unrecognized value matches no
   * style selector and no `horizontal` code path, so the scroller keeps
   * the default vertical behavior (fallback by CSS construction plus a
   * single strict comparison — no validation code, FR-002/FR-009).
   * @default 'vertical'
   */
  @Prop({ reflect: true }) orientation: KiScrollerOrientation = 'vertical';

  /**
   * Accessible name of the scroll region ("Release notes", "Chat
   * messages"). Assistive technology receives a `region` with this name
   * whose slotted content keeps its own semantics (FR-006). Documented as
   * required: a scroller without a label renders but exposes no accessible
   * name and fails the accessibility audit (015-ki-progress precedent).
   * The label is never rendered visually.
   * @default undefined
   */
  @Prop() label?: string;

  /**
   * Overflow state (FR-003, FR-005): the indicator and the viewport's Tab
   * stop exist only while content actually overflows the declared axis.
   * Tracked at runtime via ResizeObserver (viewport and slotted elements)
   * plus slotchange, so S13/S14 transitions follow content and bounds
   * changes without any polling.
   */
  @State() private overflowing = false;

  private viewport: HTMLDivElement | undefined;
  private resizeObserver: ResizeObserver | undefined;

  private readonly setViewportRef = (viewport?: HTMLDivElement): void => {
    this.viewport = viewport;
  };

  componentDidLoad(): void {
    // Overflow observation only — scrolling itself stays native and the
    // component registers no wheel, touch or scroll listener (FR-004).
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncOverflow();
      });
    }
    this.observeContent();
    this.syncOverflow();
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
  }

  @Watch('orientation')
  protected orientationChanged(): void {
    this.syncOverflow();
  }

  private handleSlotChange = (): void => {
    this.observeContent();
    this.syncOverflow();
  };

  /** Re-arm the observer on the viewport and the currently slotted elements. */
  private observeContent(): void {
    const observer = this.resizeObserver;
    const viewport = this.viewport;
    if (!observer || !viewport) {
      return;
    }
    observer.disconnect();
    observer.observe(viewport);
    const slot = viewport.querySelector('slot');
    for (const element of slot?.assignedElements({ flatten: true }) ?? []) {
      observer.observe(element);
    }
  }

  private syncOverflow(): void {
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }
    // Anything but the recognized `horizontal` measures the block axis:
    // unknown orientation values behave as the default vertical (FR-002).
    const overflowing =
      this.orientation === 'horizontal'
        ? viewport.scrollWidth > viewport.clientWidth
        : viewport.scrollHeight > viewport.clientHeight;
    if (overflowing !== this.overflowing) {
      this.overflowing = overflowing;
    }
  }

  render() {
    // Region semantics stay stable regardless of overflow; only the Tab
    // stop toggles with it (FR-005/FR-006, axe scrollable-region-focusable
    // in both directions). No key handling: a focused scrollable viewport
    // scrolls natively with arrows, Page Up/Down, Home/End.
    const focusability = this.overflowing ? { tabindex: '0' } : {};
    return (
      <div
        part="viewport"
        role="region"
        aria-label={this.label}
        {...focusability}
        ref={this.setViewportRef}
      >
        <slot onSlotchange={this.handleSlotChange}></slot>
      </div>
    );
  }
}
