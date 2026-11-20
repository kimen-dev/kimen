import { Component, Element, type EventEmitter, Event, h, Prop, State } from '@stencil/core';

import { resolveHighlights, tokenizeCode } from './ki-code-block.behavior';

const DEFAULT_LABEL = 'Code';

/**
 * Presents source code with a named header, syntax colors, line controls and
 * clipboard feedback.
 *
 * @whenToUse display a multiline example, generated code or a tool result that
 * readers should be able to inspect and copy.
 * @whenNotToUse when the reader should edit the source or when the code belongs
 * inline in a sentence. Use an editor or a native inline code element.
 * @slot - Literal source text. Escape markup in HTML or supply a text node.
 * @part figure - Framed surface around the snippet.
 * @part header - Caption containing the language, filename and copy control.
 * @part scroll - Focusable native code scroll area.
 * @part code - The monospaced source and its optional gutter.
 */
@Component({
  tag: 'ki-code-block',
  styleUrl: 'ki-code-block.css',
  shadow: true,
})
export class KiCodeBlock {
  @Element() private readonly host!: HTMLElement;

  /** Visible language label and syntax grammar. Supports JavaScript, TypeScript and JSON. */
  @Prop() language?: string;

  /** File name shown in the header beside the language. */
  @Prop() filename?: string;

  /** Show decorative one-based line numbers. */
  @Prop() lineNumbers = false;

  /** Comma-separated lines or inclusive ranges, for example `"3,5-7"`. */
  @Prop() highlight?: string;

  /** Soft-wrap long lines within the available width. */
  @Prop() wrap = false;

  /** Show the copy control. Set `copyable="false"` in HTML to hide it. */
  @Prop() copyable = true;

  /** Figure and scroll area label when there is no language or filename. */
  @Prop() label?: string = DEFAULT_LABEL;

  /** Localizable prefix for the accessible description of highlighted lines. */
  @Prop() highlightLabel = 'Highlighted lines';

  /** Accessible name of the copy button. */
  @Prop() copyLabel = 'Copy code';

  /** Polite announcement after a successful clipboard write. */
  @Prop() copiedLabel = 'Copied';

  /** Polite announcement after a failed clipboard write. */
  @Prop() copyErrorLabel = "Couldn't copy";

  /** CopyButton reports a successful write with the original source text. */
  @Event({ bubbles: true, cancelable: false, composed: true, eventName: 'ki-copy' })
  kiCopy!: EventEmitter<{ value: string }>;

  /** CopyButton reports an unsuccessful clipboard write. */
  @Event({ bubbles: true, cancelable: false, composed: true, eventName: 'ki-copy-error' })
  kiCopyError!: EventEmitter<void>;

  @State() private source = '';
  private sourceObserver: MutationObserver | undefined;

  connectedCallback(): void {
    this.readSource();
    this.sourceObserver ??= new MutationObserver(this.readSource);
    this.sourceObserver.observe(this.host, { characterData: true, childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.sourceObserver?.disconnect();
    this.sourceObserver = undefined;
  }

  private readonly readSource = (): void => {
    this.source = this.host.textContent || '';
  };

  render() {
    const metadata = [this.language?.trim(), this.filename?.trim()].filter(Boolean);
    const fallback = this.label?.trim() ?? '';
    const caption = metadata.join(' · ') || fallback || DEFAULT_LABEL;
    const lines = tokenizeCode(this.source, this.language);
    const gutterWidth = `${String(String(lines.length).length)}ch`;
    const highlights = resolveHighlights(this.highlight, lines.length);
    const description = highlights.map(({ start, end }) =>
      start === end ? String(start) : [start, end].join('–'),
    );
    // The native scrollable region must be reachable by Tab.
    const focusability = { tabindex: '0' };
    let rangeIndex = 0;
    let range = highlights[rangeIndex];

    // Direct names avoid Gecko's cached ariaLabelledByElements reflection.
    return (
      <figure key="figure" part="figure" aria-label={caption}>
        <figcaption key="header" part="header">
          <bdi key="caption">{caption}</bdi>
          {this.copyable && (
            // CopyButton's composed events cross the shadow root once.
            <ki-copy-button
              key="copy"
              size="xs"
              variant="ghost"
              value={this.source}
              label={this.copyLabel}
              copiedLabel={this.copiedLabel}
              copyErrorLabel={this.copyErrorLabel}
            />
          )}
        </figcaption>
        <pre
          key="scroll"
          part="scroll"
          role="region"
          aria-label={caption}
          aria-describedby={description.length ? 'highlights' : undefined}
          {...focusability}
          dir="ltr"
        >
          <code
            key="code"
            part="code"
            style={{ '--_line-number-width': gutterWidth }}
            data-wrap={this.wrap ? '' : undefined}
          >
            {lines.map((line, index) => {
              const number = index + 1;
              if (range && number > range.end) {
                rangeIndex += 1;
                range = highlights[rangeIndex];
              }

              return (
                <span
                  key={number}
                  class="line"
                  data-highlighted={range && number >= range.start ? '' : undefined}
                >
                  {this.lineNumbers && (
                    <span class="line-number" aria-hidden="true">
                      {number}
                    </span>
                  )}
                  <span class="line-text">
                    {line.map(({ text, kind }) =>
                      kind ? <span class={`syntax-${kind}`}>{text}</span> : text,
                    )}
                  </span>
                  {number < lines.length ? '\n' : null}
                </span>
              );
            })}
          </code>
        </pre>
        {description.length > 0 && (
          <span key="highlights" id="highlights" hidden>
            {this.highlightLabel}: {description.join(', ')}
          </span>
        )}
      </figure>
    );
  }
}
