import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { formatSourceLabel } from './sources-model';
import { connectSources, type NumberedSource, sameSource } from './sources-scope';

const DEFAULT_ONE = '{count} source';
const DEFAULT_MANY = '{count} sources';

/**
 * A disclosure with the ordered sources behind an answer.
 *
 * @whenToUse To show the evidence behind an answer. Add direct `ki-source`
 * children and place `ki-citation` markers next to the claims they support.
 * @whenNotToUse For ordinary navigation, unrelated links, or form controls.
 * @slot - Direct `ki-source` definitions for this answer.
 * @part disclosure - Native expandable section.
 * @part summary - Disclosure control with the localized source count.
 * @part list - Ordered list of sources.
 * @part source - Source card link.
 * @part number - Source order marker inside the card.
 * @part title - Visible title of the link.
 * @part domain - Hostname derived from the link destination.
 * @part snippet - Optional excerpt.
 */
@Component({ tag: 'ki-sources', styleUrl: 'ki-sources.css', shadow: true })
export class KiSources {
  @Element() private readonly host!: HTMLElement;

  /**
   * Whether the disclosure is expanded. Set to show the list initially.
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) open = false;

  /**
   * Localized summary when there is one source. Use `{count}` for its number.
   * @default '{count} source'
   */
  @Prop() sourceCountLabel = DEFAULT_ONE;

  /**
   * Localized summary for multiple sources. Use `{count}` for their number.
   * @default '{count} sources'
   */
  @Prop() sourcesCountLabel = DEFAULT_MANY;

  @State() private sources: NumberedSource[] = [];

  private disconnect: (() => void) | undefined;

  connectedCallback(): void {
    this.disconnect = connectSources(this.host, { update: this.update, reveal: this.reveal });
  }

  disconnectedCallback(): void {
    this.disconnect?.();
  }

  private update = (sources: NumberedSource[]): void => {
    if (
      sources.length !== this.sources.length ||
      sources.some((source, index) => !sameSource(source, this.sources[index]))
    ) {
      this.sources = sources;
    }
  };

  private reveal = (id: string): boolean => {
    const disclosure = this.host.shadowRoot?.querySelector('details');
    const target = disclosure?.querySelector<HTMLAnchorElement>(
      `[data-source-id="${CSS.escape(id)}"]`,
    );
    if (!disclosure || !target || this.host.hidden) {
      return false;
    }
    this.open = true;
    target.focus();
    return true;
  };

  // A queued native toggle must see the latest property write even if the
  // next render has not run. User toggles still flow from details to the host.
  @Watch('open')
  protected syncDisclosure(open: boolean): void {
    const disclosure = this.host.shadowRoot?.querySelector('details');
    if (disclosure && disclosure.open !== open) disclosure.open = open;
  }

  private onToggle = (event: Event): void => {
    if (event.currentTarget instanceof HTMLDetailsElement) {
      this.open = event.currentTarget.open;
    }
  };

  render() {
    const count = this.sources.length;
    const template =
      count === 1 ? this.sourceCountLabel || DEFAULT_ONE : this.sourcesCountLabel || DEFAULT_MANY;
    const summary = formatSourceLabel(template, { count: String(count) });
    return [
      <slot key="definitions" />,
      <details
        key="disclosure"
        part="disclosure"
        hidden={count === 0}
        open={this.open}
        onToggle={this.onToggle}
      >
        <summary part="summary" tabIndex={0}>
          {summary}
        </summary>
        <ol part="list">
          {this.sources.map((source) => (
            <li key={source.id}>
              <a
                part="source"
                data-source-id={source.id}
                href={source.href}
                aria-describedby={`details-${String(source.number)}`}
                tabIndex={0}
              >
                <span part="number" aria-hidden="true">
                  {source.number}
                </span>
                <span class="description">
                  <span part="title">{source.title}</span>
                  {/* Keep metadata in the directly referenced description. */}
                  <span class="details" id={`details-${String(source.number)}`} aria-hidden="true">
                    <span part="domain">{source.domain}</span>
                    {source.snippet && <span part="snippet">{source.snippet}</span>}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </details>,
    ];
  }
}
