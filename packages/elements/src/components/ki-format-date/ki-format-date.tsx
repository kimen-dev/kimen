import { Component, Element, Prop, h } from '@stencil/core';
import { parseFormatDate } from '../../utils/format-date';
import { formatLocale } from '../../utils/format-locale';

type DateTimeStyle = 'full' | 'long' | 'medium' | 'short';

/**
 * Displays an ISO date or timestamp in the reader's language.
 *
 * @whenToUse For raw date and timestamp values in tables, records and prose.
 * @whenNotToUse For an editable date or an elapsed time that should change as the clock advances.
 * @cssprop --ki-format-date-font-family - Font family for the formatted text. Defaults to the body family.
 */
@Component({ tag: 'ki-format-date', styleUrl: 'ki-format-date.css', shadow: true })
export class KiFormatDate {
  @Element() private host!: HTMLElement;

  /** ISO calendar date (YYYY-MM-DD) or ISO date-time. A timestamp without an offset uses local time. */
  @Prop() date?: string;

  /** Date detail. Defaults to medium when neither date style nor time style is supplied. */
  @Prop() dateStyle?: DateTimeStyle;

  /** Time detail. Omit to show the date alone. */
  @Prop() timeStyle?: DateTimeStyle;

  /** IANA time zone for a timestamp. A calendar date keeps its day in every zone. */
  @Prop() timeZone?: string;

  /** Language tag for the formatted date. Inherits the nearest HTML lang declaration when omitted. */
  @Prop({ attribute: 'lang', reflect: true }) locale?: string;

  render() {
    const { date, dateStyle, timeStyle, timeZone, locale } = this;
    const parsed = parseFormatDate(date);
    if (!parsed) return null;

    try {
      const text = new Intl.DateTimeFormat(formatLocale(this.host, locale), {
        dateStyle: dateStyle ?? (timeStyle ? undefined : 'medium'),
        timeStyle,
        timeZone: parsed.calendarDate ? 'UTC' : timeZone,
      }).format(parsed.date);
      return <time dateTime={parsed.iso}>{text}</time>;
    } catch {
      return null;
    }
  }
}
