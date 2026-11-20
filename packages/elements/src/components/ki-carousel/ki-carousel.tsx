import { Component, Element, Event, Host, Method, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import '../../../icons/chevron-right.js';
import { leadingLimit, movementTarget, normalizeIndex, wholeStep } from './ki-carousel.position';

export type CarouselLayout = 'single' | 'multi-browse' | 'uncontained' | 'hero' | 'full-screen';

export interface CarouselSlideChangeDetail {
  index: number;
}

type SlideSize = 'regular' | 'medium' | 'small' | 'end';

const ITEM_TAG = ['ki', 'carousel', 'item'].join('-');
const INDICATOR_LIMIT = 20;
const MAX_INTERVAL = 2_147_483_647;
const SCROLL_SETTLE_MS = 150;

/**
 * An ordered, swipeable sequence with previous and next controls and position feedback.
 *
 * @whenToUse show a short set of related highlights, onboarding steps or media panels.
 * Give the carousel a meaningful label and supply one ki-carousel-item per slide.
 * @whenNotToUse hide essential content behind rotation, replace ordinary page navigation,
 * or present slides that readers need to compare side by side at the same time.
 * @slot - Direct ki-carousel-item children in reading order.
 * @part viewport - Scroll-snap viewport and its keyboard focus outline.
 * @part controls - Row containing slide position and navigation.
 * @part previous - Previous slide button.
 * @part next - Next slide button.
 * @part rotation - Play or Pause button when automatic rotation is configured.
 * @part position - Position indicator and optional numeric position.
 * @part announcement - Visually hidden live region for manual changes.
 */
@Component({
  tag: 'ki-carousel',
  styleUrl: 'ki-carousel.css',
  shadow: true,
})
export class KiCarousel {
  @Element() private host!: HTMLElement;

  /** Required accessible name of the carousel region. */
  @Prop() label!: string;

  /**
   * Number of slides visible together in the single layout. Material 3 layouts
   * determine their own item widths.
   * @minimum 1
   */
  @Prop() slidesPerView = 1;

  /**
   * Number of positions advanced by Previous, Next and automatic rotation.
   * @minimum 1
   */
  @Prop() slidesPerMove = 1;

  /** Whether navigating past one endpoint wraps to the other. */
  @Prop() loop = false;

  /**
   * Rotation interval in milliseconds. Omitting it leaves rotation off.
   * @minimum 1
   * @maximum 2147483647
   */
  @Prop() autoplay?: number;

  /** Whether to show the Previous and Next buttons. The viewport stays keyboard-operable. */
  @Prop() navigation = true;

  /** Whether to show the noninteractive slide position indicator. */
  @Prop() pagination = true;

  /**
   * One-based leading slide. Setting it moves the carousel and clamps the index to
   * the available leading positions.
   * @minimum 1
   */
  @Prop({ mutable: true, reflect: true }) current = 1;

  /** Item arrangement. Full-screen uses a vertical, full-viewport slide. */
  @Prop() layout: CarouselLayout = 'single';

  /** Accessible label of the Previous button. */
  @Prop() previousLabel = 'Previous slide';

  /** Accessible label of the Next button. */
  @Prop() nextLabel = 'Next slide';

  /** Visible and accessible label of the Pause button. */
  @Prop() pauseLabel = 'Pause';

  /** Visible and accessible label of the Play button. */
  @Prop() playLabel = 'Play';

  /** Accessible label of the position indicator. */
  @Prop() positionLabel = 'Slide position';

  /** Spoken slide name and announcement. Use {index} and {count} as placeholders. */
  @Prop() slideLabel = '{index} of {count}';

  /** Accessible role description of the region. */
  @Prop() carouselRoleDescription = 'carousel';

  /** Accessible role description of each slide group. */
  @Prop() slideRoleDescription = 'slide';

  /** Reports the one-based index when the leading slide changes. */
  @Event({ eventName: 'ki-slide-change', bubbles: true, composed: true, cancelable: false })
  slideChange!: EventEmitter<CarouselSlideChangeDetail>;

  @State() private count = 0;
  @State() private position = 1;
  @State() private announcement = 0;
  @State() private hovered = false;
  @State() private rotationStopped = false;
  @State() private reducedMotion = false;

  private items: HTMLElement[] = [];
  private viewport: HTMLElement | undefined;
  private resizeObserver?: ResizeObserver;
  private motionQuery?: MediaQueryList;
  private rotationTimer?: number;
  private scrollTimer?: number;
  private rotationPointerIntent: boolean | undefined;
  private alignAfterRender = false;

  connectedCallback(): void {
    this.observe();
  }

  componentDidLoad(): void {
    this.viewport =
      this.host.shadowRoot?.querySelector<HTMLElement>('[part=viewport]') ?? undefined;
    this.observe();
  }

  componentDidRender(): void {
    if (!this.alignAfterRender) return;
    this.alignAfterRender = false;
    this.align('instant');
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.viewport?.removeEventListener('scrollend', this.onScrollEnd);
    this.viewport?.removeEventListener('keydown', this.onViewportKey);
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    window.clearTimeout(this.rotationTimer);
    window.clearTimeout(this.scrollTimer);
    this.hovered = false;
    this.rotationPointerIntent = undefined;
  }

  @Watch('current')
  protected currentChanged(value: number): void {
    if (this.count && value !== this.position) this.select(value);
  }

  @Watch('layout')
  @Watch('slidesPerView')
  protected layoutChanged(): void {
    if (!this.viewport) return;
    this.alignAfterRender = true;
    this.select(this.current, 'layout');
  }

  @Watch('slideLabel')
  @Watch('slideRoleDescription')
  protected slideNamingChanged(): void {
    this.syncSlides();
  }

  @Watch('autoplay')
  @Watch('loop')
  protected rotationChanged(): void {
    if (this.canRotate && this.host.matches(':focus-within')) this.rotationStopped = true;
    this.restartTimer();
  }

  /** Advances by slidesPerMove. */
  @Method()
  next(): Promise<void> {
    this.move(1);
    return Promise.resolve();
  }

  /** Moves back by slidesPerMove. */
  @Method()
  previous(): Promise<void> {
    this.move(-1);
    return Promise.resolve();
  }

  /** Moves to the requested one-based leading position within the available range. */
  @Method()
  goTo(index: number): Promise<void> {
    if (this.count) this.select(index);
    return Promise.resolve();
  }

  private get arrangement(): CarouselLayout {
    switch (this.layout) {
      case 'multi-browse':
      case 'uncontained':
      case 'hero':
      case 'full-screen':
        return this.layout;
      default:
        return 'single';
    }
  }

  private get view(): number {
    return this.arrangement === 'single'
      ? Math.min(wholeStep(this.slidesPerView), Math.max(1, this.count))
      : 1;
  }

  private get limit(): number {
    return leadingLimit(this.count, this.view);
  }

  private get interval(): number {
    return typeof this.autoplay === 'number' && Number.isFinite(this.autoplay) && this.autoplay >= 1
      ? Math.min(this.autoplay, MAX_INTERVAL)
      : 0;
  }

  private get canRotate(): boolean {
    return this.interval > 0 && this.limit > 1;
  }

  private get wantsRotation(): boolean {
    return this.canRotate && !this.rotationStopped && (this.loop || this.position < this.limit);
  }

  private get rotating(): boolean {
    return this.wantsRotation && !this.hovered && !this.reducedMotion;
  }

  private observe(): void {
    const viewport = this.viewport;
    if (!viewport) return;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionQuery.addEventListener('change', this.onMotionChange);
    this.onMotionChange();
    viewport.addEventListener('scrollend', this.onScrollEnd);
    viewport.addEventListener('keydown', this.onViewportKey);
    this.refreshSlides();
    this.resizeObserver ??= new ResizeObserver(this.onResize);
    this.resizeObserver.observe(viewport);
  }

  private readonly refreshSlides = (): void => {
    const slot = this.viewport?.querySelector('slot');
    if (!slot) return;
    const items = slot
      .assignedElements()
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element.localName === ITEM_TAG,
      );
    for (const item of this.items) {
      if (items.includes(item) || item.parentElement?.localName === this.host.localName) continue;
      item.role = null;
      item.ariaRoleDescription = null;
      item.ariaLabel = null;
      item.removeAttribute('data-ki-carousel-size');
      item.inert = false;
      item.ariaHidden = null;
    }
    const previousCount = this.count;
    this.items = items;
    this.count = items.length;
    if (previousCount === 0 && this.canRotate && this.host.matches(':focus-within')) {
      this.rotationStopped = true;
    }
    this.alignAfterRender = previousCount !== this.count;
    this.select(this.current, previousCount === 0 ? 'initial' : 'layout');
    if (!this.alignAfterRender) this.align('instant');
  };

  private positionText(index: number): string {
    return this.slideLabel
      .replaceAll('{index}', String(index))
      .replaceAll('{count}', String(this.count));
  }

  private sizeAt(index: number): SlideSize {
    const offset = index - this.position;
    switch (this.arrangement) {
      case 'multi-browse':
        if (offset === 1) return 'medium';
        if (offset === 2) return 'small';
        break;
      case 'hero':
        if (offset === 1) return 'small';
        break;
      case 'uncontained':
        if (offset === 1) return 'medium';
        break;
      default:
        return 'regular';
    }
    return offset === 0 && index === this.count ? 'end' : 'regular';
  }

  private syncSlides(): void {
    const upper = this.position + this.view;
    for (const [offset, item] of this.items.entries()) {
      const index = offset + 1;
      const visible = index >= this.position && index < upper;
      if (!visible && item.matches(':focus-within')) this.viewport?.focus({ preventScroll: true });
      item.inert = !visible;
      // DOM-based accessibility queries do not all account for inert.
      item.ariaHidden = visible ? null : 'true';
      item.role = 'group';
      item.ariaRoleDescription = this.slideRoleDescription;
      item.ariaLabel = this.positionText(index);
      item.dataset.kiCarouselSize = this.sizeAt(index);
    }
    if (this.viewport) this.viewport.dataset.endSize = this.sizeAt(this.count);
  }

  private select(
    value: number,
    source: 'control' | 'scroll' | 'automatic' | 'layout' | 'initial' = 'control',
  ): void {
    const index = normalizeIndex(value, this.limit);
    const changed = index !== this.position;
    this.position = index;
    if (this.count) this.current = index;
    this.syncSlides();

    if (source !== 'initial' && source !== 'layout') {
      const layout = this.arrangement;
      const stableWidths = layout === 'single' || layout === 'full-screen';
      const instant = this.reducedMotion || !stableWidths || source === 'scroll';
      this.align(instant ? 'instant' : 'smooth');
    }

    if (changed && source !== 'initial' && this.count) {
      this.announcement = source === 'automatic' ? 0 : index;
      this.slideChange.emit({ index });
    }
    if (!this.count) this.announcement = 0;
    this.restartTimer();
  }

  private move(direction: number, automatic = false): void {
    if (!this.count) return;
    const step = direction * wholeStep(this.slidesPerMove);
    const target = movementTarget(this.position, step, this.limit, this.loop);
    if (target !== this.position) this.select(target, automatic ? 'automatic' : 'control');
  }

  private leadingEdge(): 'top' | 'right' | 'left' {
    if (this.arrangement === 'full-screen') return 'top';
    return this.viewport && getComputedStyle(this.viewport).direction === 'rtl' ? 'right' : 'left';
  }

  private align(behavior: ScrollBehavior): void {
    const viewport = this.viewport;
    const item = this.items[this.position - 1];
    if (!viewport || !item) return;
    const edge = this.leadingEdge();
    const distance = item.getBoundingClientRect()[edge] - viewport.getBoundingClientRect()[edge];
    if (Math.abs(distance) < 0.5) return;
    // An absolute target: Firefox resolves a relative scroll against where a
    // glide still under way will end, not against the offset the distance was
    // measured from, and overshoots by the part of the glide not yet run.
    viewport.scrollTo(
      edge === 'top'
        ? { top: viewport.scrollTop + distance, behavior }
        : { left: viewport.scrollLeft + distance, behavior },
    );
  }

  private readonly onScroll = (): void => {
    window.clearTimeout(this.rotationTimer);
    if (!this.viewport || 'onscrollend' in this.viewport) return;
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = window.setTimeout(this.onScrollEnd, SCROLL_SETTLE_MS);
  };

  /** The position whose slide the viewport currently shows, or undefined while it has no size. */
  private shownPosition(): number | undefined {
    const viewport = this.viewport;
    if (!viewport?.clientWidth) return undefined;
    const edge = this.leadingEdge();
    const origin = viewport.getBoundingClientRect()[edge];
    let closest = this.position;
    let distance = Number.POSITIVE_INFINITY;
    // The starts are monotonic in either direction. Stop once they get farther away.
    for (let offset = 0; offset < this.limit; offset += 1) {
      const item = this.items[offset];
      if (!item) break;
      const bounds = item.getBoundingClientRect();
      const nextDistance =
        edge === 'top' && bounds.height > viewport.clientHeight
          ? Math.max(bounds.top - origin, origin - (bounds.bottom - viewport.clientHeight), 0)
          : Math.abs(bounds[edge] - origin);
      if (nextDistance > distance) break;
      closest = offset + 1;
      distance = nextDistance;
    }
    return closest;
  }

  private readonly onScrollEnd = (): void => {
    if (this.alignAfterRender) return;
    const shown = this.shownPosition();
    if (shown === undefined) return;
    if (shown !== this.position) this.select(shown, 'scroll');
    else {
      this.syncSlides();
      this.restartTimer();
    }
  };

  // A new size never chooses a slide: only a finished scroll does. The offset
  // can lag the selection, because a move glides into place over several
  // frames, and the first observation lands on the first frame after
  // connection, whatever moved before it. Reading the selection back from that
  // offset would undo the move, so keep the selection and put its slide back
  // in place.
  private readonly onResize = (): void => {
    if (this.alignAfterRender) return;
    const shown = this.shownPosition();
    if (shown !== undefined && shown !== this.position) this.align('instant');
  };

  private readonly onViewportKey = (event: KeyboardEvent): void => {
    if (
      event.target !== this.viewport ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const edge = this.leadingEdge();
    const nextKey = edge === 'top' ? 'ArrowDown' : edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
    const previousKey = edge === 'top' ? 'ArrowUp' : edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
    switch (event.key) {
      case nextKey:
        this.move(1);
        break;
      case previousKey:
        this.move(-1);
        break;
      case 'Home':
        this.select(1);
        break;
      case 'End':
        this.select(this.limit);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  private restartTimer(): void {
    window.clearTimeout(this.rotationTimer);
    if (this.rotating && this.host.isConnected) {
      this.rotationTimer = window.setTimeout(() => {
        this.move(1, true);
      }, this.interval);
    }
  }

  private readonly onMotionChange = (): void => {
    this.reducedMotion = this.motionQuery?.matches ?? false;
    if (this.reducedMotion) this.align('instant');
    this.restartTimer();
  };

  private readonly onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.hovered = true;
    this.restartTimer();
  };

  private readonly onPointerLeave = (): void => {
    this.hovered = false;
    this.restartTimer();
  };

  private readonly onFocusIn = (): void => {
    if (!this.canRotate) return;
    this.rotationStopped = true;
    this.restartTimer();
  };

  private readonly rememberRotationIntent = (): void => {
    // Pointer focus can stop rotation before the click is delivered. Honor the
    // action the reader saw when they pressed the button.
    this.rotationPointerIntent = this.wantsRotation;
  };

  private readonly toggleRotation = (event: MouseEvent): void => {
    const pause = (event.detail > 0 ? this.rotationPointerIntent : undefined) ?? this.wantsRotation;
    this.rotationPointerIntent = undefined;
    if (this.reducedMotion) return;
    this.rotationStopped = pause;
    if (!pause && !this.loop && this.position === this.limit) this.select(1);
    this.restartTimer();
  };

  private readonly onPrevious = (): void => {
    this.move(-1);
  };

  private readonly onNext = (): void => {
    this.move(1);
  };

  render() {
    const pagination = this.pagination && this.count > 1;
    const largeSequence = this.count > INDICATOR_LIMIT;
    const windowStart = Math.floor((this.position - 1) / INDICATOR_LIMIT) * INDICATOR_LIMIT;
    return (
      <Host
        key="carousel"
        role={this.label ? 'region' : undefined}
        aria-label={this.label || undefined}
        aria-roledescription={this.label ? this.carouselRoleDescription : undefined}
        onFocusin={this.onFocusIn}
        onPointerEnter={this.onPointerEnter}
        onPointerLeave={this.onPointerLeave}
      >
        {this.canRotate && (
          <button
            key="rotation"
            type="button"
            part="rotation"
            tabIndex={0}
            aria-disabled={String(this.reducedMotion)}
            onPointerDown={this.rememberRotationIntent}
            onClick={this.toggleRotation}
          >
            {this.wantsRotation && !this.reducedMotion ? this.pauseLabel : this.playLabel}
          </button>
        )}
        <div
          key="viewport"
          part="viewport"
          data-layout={this.arrangement}
          style={{ '--_ki-carousel-view': String(this.view) }}
          tabIndex={this.limit > 1 ? 0 : -1}
          onScroll={this.onScroll}
        >
          <slot key="slides" onSlotchange={this.refreshSlides} />
        </div>
        {(pagination || (this.navigation && this.count > 1)) && (
          <div key="controls" part="controls">
            {pagination && (
              <div key="position" part="position">
                <div key="dots" aria-hidden={largeSequence ? 'true' : undefined}>
                  <ki-indicator
                    key="indicator"
                    count={Math.min(INDICATOR_LIMIT, this.count - windowStart)}
                    current={this.position - windowStart}
                    label={this.positionLabel}
                  ></ki-indicator>
                </div>
                {largeSequence && (
                  <span key="position-text">{this.positionText(this.position)}</span>
                )}
              </div>
            )}
            {this.navigation && this.count > 1 && (
              <div key="navigation" class="navigation">
                <button
                  key="previous"
                  type="button"
                  part="previous"
                  tabIndex={0}
                  aria-label={this.previousLabel}
                  aria-disabled={String(this.limit === 1 || (!this.loop && this.position === 1))}
                  onClick={this.onPrevious}
                >
                  <ki-icon key="previous-icon" name="chevron-right"></ki-icon>
                </button>
                <button
                  key="next"
                  type="button"
                  part="next"
                  tabIndex={0}
                  aria-label={this.nextLabel}
                  aria-disabled={String(
                    this.limit === 1 || (!this.loop && this.position === this.limit),
                  )}
                  onClick={this.onNext}
                >
                  <ki-icon key="next-icon" name="chevron-right"></ki-icon>
                </button>
              </div>
            )}
          </div>
        )}
        <span
          key="announcement"
          part="announcement"
          aria-live={this.rotating ? 'off' : 'polite'}
          aria-atomic="true"
        >
          {this.announcement ? this.positionText(this.announcement) : ''}
        </span>
      </Host>
    );
  }
}
