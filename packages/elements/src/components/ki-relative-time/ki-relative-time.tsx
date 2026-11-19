import { Component, Element, Prop, forceUpdate, h } from '@stencil/core';
import { parseFormatDate } from '../../utils/format-date';
import { formatLocale } from '../../utils/format-locale';
import { describeRelativeTime } from './ki-relative-time.timing';

// Browser timers have a signed 32-bit millisecond limit.
const MAX_TIMEOUT = 2_147_483_647;

/**
 * Displays the elapsed or remaining time for a timestamp in the reader's language.
 *
 * @whenToUse For timestamps whose distance from the present matters, such as timeline entries or recent changes.
 * @whenNotToUse For an interactive countdown or a date that should always show an absolute value.
 * @cssprop --ki-relative-time-font-family - Font family for the formatted text. Defaults to the body family.
 */
@Component({ tag: 'ki-relative-time', styleUrl: 'ki-relative-time.css', shadow: true })
export class KiRelativeTime {
  @Element() private host!: HTMLElement;

  /** ISO calendar date or date-time. A timestamp without an offset uses local time. */
  @Prop() date?: string;

  /** Auto can show words such as yesterday. Always uses a number. */
  @Prop() numeric: 'auto' | 'always' = 'auto';

  /** Refresh the visible wording as the clock crosses a formatting boundary. */
  @Prop() sync = false;

  /**
   * Display an absolute timestamp when the distance reaches this many seconds.
   * Omit to keep relative wording at any distance.
   * @minimum 0
   */
  @Prop() threshold?: number;

  private timer?: number;
  private updateAt: number | undefined;

  connectedCallback() {
    if (this.sync) forceUpdate(this.host);
  }

  disconnectedCallback() {
    window.clearTimeout(this.timer);
  }

  componentDidRender() {
    window.clearTimeout(this.timer);
    if (!this.sync || this.updateAt === undefined || !this.host.isConnected) return;

    const delay = Math.min(MAX_TIMEOUT, Math.max(0, this.updateAt - Date.now()));
    this.timer = window.setTimeout(() => {
      forceUpdate(this.host);
    }, delay);
  }

  render() {
    this.updateAt = undefined;
    const parsed = parseFormatDate(this.date);
    if (!parsed) return null;

    const locale = formatLocale(this.host);
    const absolute = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: parsed.calendarDate ? 'UTC' : undefined,
    }).format(parsed.date);

    const now = Date.now();
    const { value, unit, nextDelay } = describeRelativeTime(
      parsed.date.getTime() - now,
      this.threshold,
    );
    if (nextDelay !== undefined) this.updateAt = now + nextDelay;

    if (value === undefined || unit === undefined) {
      return (
        <time dateTime={parsed.iso} title={absolute}>
          {absolute}
        </time>
      );
    }

    const relative = new Intl.RelativeTimeFormat(locale, {
      numeric: this.numeric === 'always' ? 'always' : 'auto',
    }).format(value, unit);
    return (
      <time dateTime={parsed.iso} title={absolute}>
        <span aria-hidden="true">{relative}</span>
        <span class="absolute-time">{absolute}</span>
      </time>
    );
  }
}
