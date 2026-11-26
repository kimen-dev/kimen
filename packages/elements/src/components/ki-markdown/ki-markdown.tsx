import { Component, Element, h, Prop, State, type VNode } from '@stencil/core';
import { MARKDOWN_ORIGINS_ATTRIBUTE } from '../../utils/url-scheme';
import {
  decodeMarkdownText,
  headingLevel,
  inlinePlainText,
  type MarkdownBlock,
  markdownDestination,
  parseMarkdown,
  parseOriginScope,
} from './ki-markdown.behavior';
import type { MarkdownInline } from './ki-markdown.inline';

type Content = VNode | string;
type Destination = ReturnType<typeof markdownDestination>;

// Markdown composes Kimen elements by tag. The loader defines these
// children when rendered. Direct-import hosts register them explicitly.
function childTag(name: 'link' | 'note' | 'code-block'): string {
  return ['ki', name].join('-');
}

/**
 * Displays Markdown as Kimen components and native HTML semantics.
 *
 * @whenToUse Show a formatted reply, readme excerpt or progressively received text from a person or model.
 * @whenNotToUse Present an editable document or apply trusted authored HTML. Use native markup for structured page content.
 * @slot - Literal Markdown source. Set a text node or escape markup when writing HTML.
 * @part content - Box containing the formatted blocks.
 */
@Component({ tag: 'ki-markdown', styleUrl: 'ki-markdown.css', shadow: true })
export class KiMarkdown {
  @Element() private readonly host!: HTMLElement;

  /** Markdown source. A supplied value, including an empty string, takes precedence over the default text slot. */
  @Prop() srcText?: string;

  /** Keep established blocks mounted while an answer grows. Turn it off when the source is complete. */
  @Prop() streaming = false;

  /**
   * Add zero through five levels to source headings. The output stops at level six. Invalid values use two.
   * @minimum 0
   * @maximum 5
   */
  @Prop() headingOffset = 2;

  /** Render Markdown images that pass the URL policy. Otherwise show their alternative text. */
  @Prop() allowImages = false;

  @State() private lightText = '';
  private sourceObserver?: MutationObserver;

  connectedCallback(): void {
    this.readLightText();
    this.sourceObserver ??= new MutationObserver(this.readLightText);
    this.sourceObserver.observe(this.host, { characterData: true, childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.sourceObserver?.disconnect();
  }

  private readonly readLightText = (): void => {
    this.lightText = Array.from(this.host.childNodes, (node) =>
      node.nodeType === Node.TEXT_NODE ? node.textContent : null,
    ).join('');
  };

  private inline(
    tokens: readonly MarkdownInline[],
    destination: (url: string) => Destination,
  ): Content[] {
    return tokens.map((token) => {
      switch (token.type) {
        case 'br':
          return <br />;
        case 'codespan':
          return <code>{token.text}</code>;
        case 'del':
        case 'em':
        case 'strong':
          return h(token.type, null, ...this.inline(token.tokens, destination));
        case 'literal':
          return token.text;
        case 'image':
        case 'link': {
          const image = token.type === 'image';
          const link = !image || this.allowImages ? destination(token.href) : null;
          const title = token.title ? decodeMarkdownText(token.title) : undefined;
          if (image) {
            const alt = inlinePlainText(token.tokens);
            return link?.url
              ? h('img', { referrerPolicy: 'no-referrer', alt, title, src: link.url })
              : alt;
          }
          const label = this.inline(token.tokens, destination);
          return link ? (
            h(childTag('link'), { href: link.url, external: link.external, title }, ...label)
          ) : (
            <span>{label}</span>
          );
        }
        default:
          return decodeMarkdownText(token.text);
      }
    });
  }

  private blocks(
    tokens: readonly MarkdownBlock[],
    destination: (url: string) => Destination,
  ): Content[] {
    return tokens.map((token) => this.block(token, destination));
  }

  private block(token: MarkdownBlock, destination: (url: string) => Destination): Content {
    switch (token.type) {
      case 'code':
        return h(childTag('code-block'), { language: decodeMarkdownText(token.lang) }, token.text);
      case 'heading':
        return h(
          `h${String(headingLevel(token.depth, this.headingOffset))}`,
          null,
          ...this.inline(token.tokens, destination),
        );
      case 'paragraph':
        return <p>{this.inline(token.tokens, destination)}</p>;
      case 'blockquote':
      case 'note': {
        const note = token.type === 'note';
        return h(
          note ? childTag('note') : token.type,
          note ? { tone: 'info' } : null,
          ...this.blocks(token.tokens, destination),
        );
      }
      case 'list':
        return this.list(token, destination);
      case 'table':
        return this.table(token, destination);
      default:
        return <div class="literal">{token.raw}</div>;
    }
  }

  private list(
    token: Extract<MarkdownBlock, { type: 'list' }>,
    destination: (url: string) => Destination,
  ): VNode {
    const items = token.items.map((item) => {
      const first = item.tokens[0];
      const task = item.checked !== undefined;
      const label =
        first?.type === 'paragraph' || first?.type === 'heading'
          ? inlinePlainText(first.tokens)
          : '';
      return (
        <li class={{ 'task-item': task }}>
          {task && (
            <input type="checkbox" aria-label={label} checked={item.checked === true} disabled />
          )}
          {item.tokens.map((block) =>
            block.type === 'paragraph' && !token.loose
              ? this.inline(block.tokens, destination)
              : this.block(block, destination),
          )}
        </li>
      );
    });
    return token.start === undefined ? <ul>{items}</ul> : <ol start={token.start}>{items}</ol>;
  }

  private table(
    token: Extract<MarkdownBlock, { type: 'table' }>,
    destination: (url: string) => Destination,
  ): VNode {
    // Keyboard readers can horizontally scroll wider tables in each engine.
    const focusability = { tabindex: '0' };
    const row = (cells: typeof token.header, tag: 'th' | 'td') => (
      <tr>
        {cells.map((cell, column) =>
          h(
            tag,
            {
              scope: tag === 'th' ? 'col' : undefined,
              'data-align': token.align[column],
            },
            ...this.inline(cell, destination),
          ),
        )}
      </tr>
    );
    return (
      <div class="table-scroll" {...focusability}>
        <table>
          <thead>{row(token.header, 'th')}</thead>
          {token.rows.length > 0 && <tbody>{token.rows.map((cells) => row(cells, 'td'))}</tbody>}
        </table>
      </div>
    );
  }

  render(): VNode {
    const doc = this.host.ownerDocument;
    const origins = parseOriginScope(this.host.getAttribute(MARKDOWN_ORIGINS_ATTRIBUTE));
    const documentOrigin = doc.defaultView?.location.origin ?? 'null';
    const destination = (url: string) =>
      markdownDestination(url, doc.baseURI, documentOrigin, origins);
    const source = this.srcText ?? this.lightText;

    return (
      <div part="content">{this.blocks(parseMarkdown(source, this.streaming), destination)}</div>
    );
  }
}
