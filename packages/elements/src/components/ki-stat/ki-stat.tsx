import { Component, Element, Prop, h } from '@stencil/core';
import '../../../icons/trending-down.js';
import '../../../icons/trending-up.js';

import { deltaPresentation, formatStatNumber } from './ki-stat.presentation';

export type KiStatDirection = 'higher-is-better' | 'lower-is-better' | 'neutral';

function metricLocale(host: HTMLElement): string | undefined {
  let element: Element | null = host;
  while (element) {
    const lang = element.getAttribute('lang')?.trim();
    if (lang) {
      return lang;
    }
    const root = element.getRootNode();
    element = element.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return undefined;
}

/**
 * A key metric with an optional comparison against a reference period.
 *
 * @whenToUse Summarize one numeric metric in a dashboard or report. Set
 * direction to lower-is-better for metrics such as latency and neutral for
 * changes that carry no favorable or unfavorable meaning.
 * @whenNotToUse Present a sequence of readings or inspect multiple data
 * points. Use a chart or table with a text equivalent for that data.
 * @slot chart - An optional sparkline after the summary. Give informative
 * charts a textual equivalent, and hide charts that repeat the summary.
 * @part card - The surface containing the metric and chart.
 * @part label - The visible metric label.
 * @part value - The formatted current reading and its unit.
 * @part comparison - The optional row with delta and reference period.
 * @part delta - The trend glyph and formatted comparison magnitude.
 * @part trend - The decorative rising or falling trend glyph.
 * @part reference - The visible comparison period.
 */
@Component({
  tag: 'ki-stat',
  styleUrl: 'ki-stat.css',
  shadow: true,
})
export class KiStat {
  @Element() private host!: HTMLElement;

  /** Localized name of the metric, such as "Median render time". */
  @Prop() label!: string;

  /** Current finite reading. */
  @Prop() value!: number;

  /** Literal suffix for decimal readings, such as "ms". */
  @Prop() unit?: string;

  /** Number-format options for the reading. Set this JavaScript property to an Intl options object. */
  @Prop({ attribute: null }) format?: Intl.NumberFormatOptions;

  /** Optional finite change. Its sign determines the trend and its magnitude is displayed. */
  @Prop() delta?: number;

  /** Number-format options for the change. Defaults to format. Set this property to an Intl options object. */
  @Prop({ attribute: null }) deltaFormat?: Intl.NumberFormatOptions;

  /**
   * Which direction is favorable for this metric. Use neutral to avoid a judgment.
   * @default 'higher-is-better'
   */
  @Prop() direction: KiStatDirection = 'higher-is-better';

  /** Localized comparison period, such as "vs last week". */
  @Prop() deltaLabel?: string;

  /**
   * Localized spoken direction for a positive delta.
   * @default 'up'
   */
  @Prop() upLabel = 'up';

  /**
   * Localized spoken direction for a negative delta.
   * @default 'down'
   */
  @Prop() downLabel = 'down';

  private renderComparison(locale: string | undefined) {
    const delta = this.delta;
    const amount = formatStatNumber(
      delta,
      locale,
      this.unit,
      this.deltaFormat ?? this.format,
      true,
    );
    if (delta === undefined || amount === undefined) {
      return undefined;
    }

    const { icon, tone } = deltaPresentation(delta, this.direction);
    const reference = this.deltaLabel?.trim();
    const trend = delta > 0 ? this.upLabel : delta < 0 ? this.downLabel : undefined;
    return {
      phrase: [trend, amount, reference].filter(Boolean).join(' '),
      visual: (
        <div key="comparison" part="comparison">
          <span key="delta" part="delta" data-tone={tone}>
            {icon && <ki-icon key="trend" part="trend" name={icon} />}
            <bdi key="amount">{amount}</bdi>
          </span>
          {reference && (
            <span key="reference" part="reference">
              {reference}
            </span>
          )}
        </div>
      ),
    };
  }

  render() {
    const locale = metricLocale(this.host);
    const label = typeof this.label === 'string' ? this.label.trim() : undefined;
    const value = formatStatNumber(this.value, locale, this.unit, this.format);
    const comparison = value === undefined ? undefined : this.renderComparison(locale);
    const phrase = [label, value, comparison?.phrase].filter(Boolean).join(', ');

    return (
      <div key="card" part="card">
        {phrase && (
          <p key="summary" class="summary">
            {phrase}
          </p>
        )}
        <div key="visual" aria-hidden="true">
          {label && (
            <p key="label" part="label">
              {label}
            </p>
          )}
          {value && (
            <p key="value" part="value">
              <bdi key="reading">{value}</bdi>
            </p>
          )}
          {comparison?.visual}
        </div>
        <slot key="chart" name="chart" />
      </div>
    );
  }
}
