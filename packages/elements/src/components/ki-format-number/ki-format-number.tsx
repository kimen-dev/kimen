import { Component, Element, Prop, h } from '@stencil/core';
import { formatLocale } from '../../utils/format-locale';

/**
 * Displays a raw number using local number conventions and tabular figures.
 *
 * @whenToUse For numeric data, currency amounts, ratios and measurements in content.
 * @whenNotToUse For numeric input or values that already include localized formatting.
 * @cssprop --ki-format-number-font-family - Font family for the formatted text. Defaults to the body family.
 */
@Component({ tag: 'ki-format-number', styleUrl: 'ki-format-number.css', shadow: true })
export class KiFormatNumber {
  @Element() private host!: HTMLElement;

  /** Raw finite number. A percent uses a ratio, so 0.49 displays as 49%. */
  @Prop() value?: number;

  /** Decimal, percent or unit output. Without this option, currency selects currency output and other values use decimal. */
  @Prop() formatStyle?: 'decimal' | 'percent' | 'unit';

  /** ISO 4217 currency code, such as EUR. Selects currency output when format-style is omitted. */
  @Prop() currency?: string;

  /** Intl unit identifier, such as celsius or kilometer. Use with format-style="unit". */
  @Prop() unit?: string;

  /** Use compact notation for abbreviated large numbers. Omit for standard notation. */
  @Prop() notation?: 'compact';

  /**
   * Minimum number of fraction digits.
   * @minimum 0
   */
  @Prop() minimumFractionDigits?: number;

  /**
   * Maximum number of fraction digits.
   * @minimum 0
   */
  @Prop() maximumFractionDigits?: number;

  render() {
    const {
      value,
      formatStyle,
      currency,
      unit,
      notation,
      minimumFractionDigits,
      maximumFractionDigits,
    } = this;
    if (value === undefined || !Number.isFinite(value)) return null;

    try {
      const text = new Intl.NumberFormat(formatLocale(this.host), {
        style: formatStyle ?? (currency === undefined ? 'decimal' : 'currency'),
        currency,
        unit,
        notation,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(value);
      return <span>{text}</span>;
    } catch {
      return null;
    }
  }
}
