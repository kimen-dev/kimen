import { Component, Element, h, Prop, State, type VNode } from '@stencil/core';
import type { Tokens } from 'marked';

import { MARKDOWN_ORIGINS_ATTRIBUTE } from '../../utils/url-scheme';
import {
  decodeMarkdownText,
  headingLevel,
  imageAlternative,
  inlinePlainText,
  type MarkdownBlock,
  type MarkdownInline,
  markdownDestination,
  notePrefix,
  parseMarkdown,
  parseOriginScope,
} from './ki-markdown.behavior';

type InlineContent = VNode | string;
type Content = InlineContent | null;
type Destination = ReturnType<typeof markdownDestination>;

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
  ): InlineContent[] {
    return tokens.map((token) => {
      switch (token.type) {
        case 'br':
          return <br />;
        case 'codespan':
          return <code>{decodeMarkdownText(token.text)}</code>;
        case 'del':
        case 'em':
        case 'strong':
          return h(token.type, null, ...this.inline(token.tokens as MarkdownInline[], destination));
        case 'html':
          return token.raw;
        case 'image': {
          const alt = imageAlternative(token.text);
          const source = this.allowImages ? destination(token.href) : null;
          return source && source.url !== '' ? (
            <img
              referrerPolicy="no-referrer"
              alt={alt}
              {...(token.title ? { title: decodeMarkdownText(token.title) } : {})}
              src={source.url}
            />
          ) : (
            alt
          );
        }
        case 'link': {
          const label = this.inline(token.tokens as MarkdownInline[], destination);
          const link = destination(token.href);
          return link ? (
            <ki-link
              href={link.url}
              external={link.external}
              {...(token.title ? { title: decodeMarkdownText(token.title) } : {})}
            >
              {label}
            </ki-link>
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
      case 'space':
        return null;
      case 'code': {
        const language =
          decodeMarkdownText(token.lang ?? '')
            .trim()
            .split(/\s+/u, 1)[0] ?? '';
        return <ki-code-block language={language}>{token.text}</ki-code-block>;
      }
      case 'heading':
        return h(
          `h${String(headingLevel(token.depth, this.headingOffset))}`,
          null,
          ...this.inline(token.tokens as MarkdownInline[], destination),
        );
      case 'paragraph':
        return <p>{this.inline(token.tokens as MarkdownInline[], destination)}</p>;
      case 'text':
        return token.tokens ? (
          <p>{this.inline(token.tokens as MarkdownInline[], destination)}</p>
        ) : (
          decodeMarkdownText(token.text)
        );
      case 'hr':
        return <hr />;
      case 'blockquote':
        return this.quote(token, destination);
      case 'list':
        return this.list(token, destination);
      case 'table':
        return this.table(token, destination);
      default:
        return <div class="literal">{token.raw}</div>;
    }
  }

  private quote(token: Tokens.Blockquote, destination: (url: string) => Destination): VNode {
    const blocks = token.tokens as MarkdownBlock[];
    let remaining = notePrefix(token);
    if (remaining === 0) return <blockquote>{this.blocks(blocks, destination)}</blockquote>;

    const [opening, ...following] = blocks;
    const firstLine = opening?.type === 'paragraph' ? (opening.tokens as MarkdownInline[]) : [];
    const noteChildren: Content[] = [];
    for (const item of firstLine) {
      if (remaining === 0) {
        noteChildren.push(...this.inline([item], destination));
      } else if (remaining < item.raw.length) {
        noteChildren.push(decodeMarkdownText(item.raw.slice(remaining)));
        remaining = 0;
      } else {
        remaining -= item.raw.length;
      }
    }
    return (
      <ki-note tone="info">
        {noteChildren.length > 0 && <p>{noteChildren}</p>}
        {this.blocks(opening?.type === 'paragraph' ? following : blocks, destination)}
      </ki-note>
    );
  }

  private list(token: Tokens.List, destination: (url: string) => Destination): VNode {
    const items = token.items.map((item) => {
      const blocks = item.tokens as MarkdownBlock[];
      const first = blocks[0];
      const label =
        first?.type === 'text' || first?.type === 'paragraph'
          ? inlinePlainText((first.tokens ?? []) as MarkdownInline[])
          : item.text;
      return (
        <li class={{ 'task-item': item.task }}>
          {item.task && (
            <input type="checkbox" aria-label={label} checked={item.checked === true} disabled />
          )}
          {blocks.map((block) =>
            block.type === 'text' && block.tokens && !token.loose
              ? this.inline(block.tokens as MarkdownInline[], destination)
              : this.block(block, destination),
          )}
        </li>
      );
    });
    return token.ordered ? (
      <ol start={token.start === '' ? 1 : token.start}>{items}</ol>
    ) : (
      <ul>{items}</ul>
    );
  }

  private table(token: Tokens.Table, destination: (url: string) => Destination): VNode {
    // Keyboard readers can horizontally scroll wider tables in each engine.
    const focusability = { tabindex: '0' };
    return (
      <div class="table-scroll" {...focusability}>
        <table>
          <thead>
            <tr>
              {token.header.map((cell, column) => (
                <th scope="col" data-align={token.align[column] ?? undefined}>
                  {this.inline(cell.tokens as MarkdownInline[], destination)}
                </th>
              ))}
            </tr>
          </thead>
          {token.rows.length > 0 && (
            <tbody>
              {token.rows.map((row) => (
                <tr>
                  {row.map((cell, column) => (
                    <td data-align={token.align[column] ?? undefined}>
                      {this.inline(cell.tokens as MarkdownInline[], destination)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
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
