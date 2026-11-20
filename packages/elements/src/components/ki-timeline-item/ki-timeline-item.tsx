import { Component, Element, Prop, State, Watch, forceUpdate, h } from '@stencil/core';
import {
  formatTimelineDate,
  nextTimelineRefresh,
  parseTimelineDate,
} from '../ki-timeline/ki-timeline.time';

const DEFAULT_DETAILS_LABEL = 'Details';

export type TimelineTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

// A toned marker with no icon draws a solid dot in the tone's ink, so the
// marker carries its status at 3:1 or more (design-system review 2026-11-20).
const TONED: ReadonlySet<string> = new Set(['primary', 'success', 'warning', 'danger']);

/**
 * One event in a timeline, with an optional time and details disclosure.
 *
 * @whenToUse describe an activity, audit, or run event inside a ki-timeline.
 * @whenNotToUse convey the outcome only through marker colour, or use the marker
 * as a control. Put actions in the event content or details.
 * @slot - Event summary. Include important status information in the text.
 * @slot start - Decorative avatar or other noninteractive marker in place of the icon.
 * @slot details - Additional event information in a native details disclosure.
 * @part dot - Decorative event marker.
 * @part content - Event summary, time and disclosure container.
 * @part time - Native time element for a valid ISO date.
 * @part summary - Keyboard-accessible details control.
 * @part details - Native details disclosure.
 * @cssprop --ki-timeline-dot-bg - Neutral marker fill.
 * @cssprop --ki-timeline-dot-fg - Neutral marker ink.
 * @cssprop --ki-timeline-dot-bg-image - Optional marker background image.
 * @cssprop --ki-timeline-dot-backdrop-filter - Optional filter behind the marker.
 * @cssprop --ki-timeline-time-bg - Timestamp fill.
 * @cssprop --ki-timeline-time-fg - Timestamp ink.
 * @cssprop --ki-timeline-item-fg - Event summary and details ink.
 */
// Native disclosure and date semantics stay with the slotted item.
@Component({
  tag: 'ki-timeline-item',
  styleUrl: 'ki-timeline-item.css',
  shadow: true,
})
export class KiTimelineItem {
  @Element() private readonly host!: HTMLElement;

  /** ISO date or date-time. Invalid or missing dates have no time label. */
  @Prop({ reflect: true }) datetime?: string;

  /** Decorative Lucide icon name, registered by the caller's per-icon import. */
  @Prop() iconName?: string;

  /**
   * Marker tone. The event text carries the meaning. Without an icon, a
   * non-neutral tone draws a solid dot in its ink.
   * @default 'neutral'
   */
  @Prop() tone: TimelineTone = 'neutral';

  /**
   * Label of the details control when the details slot is populated.
   * @default 'Details'
   */
  @Prop() detailsLabel?: string = DEFAULT_DETAILS_LABEL;

  @State() private hasStart = false;
  @State() private hasDetails = false;

  private rendered = false;
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;

  connectedCallback(): void {
    this.observer = new MutationObserver(this.readSlots);
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: ['slot'],
    });
    this.readSlots();
    if (this.rendered) forceUpdate(this.host);
  }

  componentDidRender(): void {
    this.rendered = true;
    clearTimeout(this.timer);
    if (!this.datetime || !this.host.isConnected) return;
    const timestamp = parseTimelineDate(this.datetime);
    if (timestamp === undefined) return;
    const delay = nextTimelineRefresh(this.datetime, timestamp, Date.now());
    if (delay !== undefined) {
      this.timer = setTimeout(() => {
        forceUpdate(this.host);
      }, delay);
    }
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    clearTimeout(this.timer);
  }

  @Watch('lang')
  protected updateLanguage(): void {
    forceUpdate(this.host);
  }

  private readonly readSlots = (): void => {
    this.hasStart = this.host.querySelector(':scope > [slot="start"]') !== null;
    this.hasDetails = this.host.querySelector(':scope > [slot="details"]') !== null;
  };

  private locale(): string | undefined {
    const language = this.host.closest('[lang]')?.getAttribute('lang')?.trim();
    if (!language) return undefined;
    try {
      return Intl.getCanonicalLocales(language)[0];
    } catch {
      return undefined;
    }
  }

  render() {
    const detailsLabel = this.detailsLabel?.trim() ?? '';
    const value = this.datetime;
    const timestamp = parseTimelineDate(value);
    return [
      <span key="marker" part="dot" data-tone={this.tone} aria-hidden="true" inert>
        <slot name="start">
          {!this.hasStart && this.iconName && <ki-icon name={this.iconName} />}
          {!this.hasStart && !this.iconName && TONED.has(this.tone) && <span class="tone-mark" />}
        </slot>
      </span>,
      <div key="content" part="content">
        <div class="event-summary" key="event-summary">
          <slot />
        </div>
        {value && timestamp !== undefined && (
          <time key="time" part="time" dateTime={value}>
            {formatTimelineDate(value, timestamp, Date.now(), this.locale())}
          </time>
        )}
        {this.hasDetails && (
          <details key="details" part="details">
            <summary part="summary" tabIndex={0}>
              {detailsLabel || DEFAULT_DETAILS_LABEL}
            </summary>
            <div class="details-content">
              <slot name="details" />
            </div>
          </details>
        )}
      </div>,
    ];
  }
}
