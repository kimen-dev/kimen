import { AttrDeserialize, Component, Element, Prop, h } from '@stencil/core';
import { type KiNoteTone, noteGlyph } from './ki-note.icons';

export type KiNoteSize = 'sm' | 'md';

/**
 * A compact, static explanation beside a control or inside a card.
 *
 * @whenToUse Add a short constraint, tip or consequence next to the content
 * it explains. Put the consequence first when warning the reader.
 * @whenNotToUse For updates that must be announced, use ki-alert. Use Toast
 * for transient confirmations and the field's help-text for field guidance.
 *
 * @slot - Short explanatory text that carries the full meaning.
 * @slot icon - A decorative glyph that replaces the tone's built-in icon.
 * @part note - The surface, including the tint, typography and spacing.
 * @part icon - The decorative icon frame.
 * @part message - The explanatory text.
 */
@Component({ tag: 'ki-note', styleUrl: 'ki-note.css', shadow: true })
export class KiNote {
  @Element() private host!: HTMLElement;

  /** Selects the background tint and decorative icon. Unknown values use neutral. */
  @Prop({ reflect: true }) tone: KiNoteTone = 'neutral';

  /** Uses caption text at sm and body text at md. Unknown values use md. */
  @Prop({ reflect: true }) size: KiNoteSize = 'md';

  /** Shows the decorative icon. Set icon="false" in HTML to hide it. */
  @Prop({ mutable: true }) icon = true;

  @AttrDeserialize('icon')
  protected deserializeIcon(value: string | null): boolean {
    return value !== 'false';
  }

  componentWillLoad(): void {
    // The external custom-elements runtime skips AttrDeserialize and parses
    // removal as false. Observe the host once for its lifetime so clearing
    // the attribute also restores the default while the loaded note is detached.
    const host = this.host;
    new MutationObserver(() => {
      if (!host.hasAttribute('icon') && !this.icon) {
        this.icon = true;
      }
    }).observe(host, { attributeFilter: ['icon'] });
  }

  private renderIcon() {
    return (
      <span key="icon" part="icon" aria-hidden="true" inert>
        <slot name="icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            focusable="false"
          >
            <path d={noteGlyph(this.tone)} />
          </svg>
        </slot>
      </span>
    );
  }

  render() {
    return (
      <div key="note" part="note">
        {this.icon && this.renderIcon()}
        <span key="message" part="message">
          <slot key="text" />
        </span>
      </div>
    );
  }
}
