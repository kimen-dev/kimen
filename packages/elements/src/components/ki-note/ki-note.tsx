import { AttrDeserialize, Component, Element, Prop, h } from '@stencil/core';
import { type KiNoteTone, type NoteIcon, noteIcon } from './ki-note.icons';

export type KiNoteSize = 'sm' | 'md';

const glyphs: Record<NoteIcon, string> = {
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-8v.1',
  sparkles:
    'm10 3 1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8L10 3Zm8 10 1 2.9 3 1.1-3 1-1 3-1-3-3-1 3-1.1 1-2.9Z',
  'circle-check': 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12l2.6 2.6L16 9.5',
  'triangle-alert':
    'M10.5 4.8a1.7 1.7 0 0 1 3 0l8 13.4a1.7 1.7 0 0 1-1.5 2.5H4a1.7 1.7 0 0 1-1.5-2.5l8-13.4ZM12 9.5v4m0 3.5v.1',
  'circle-alert': 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7.5V13m0 3.5v.1',
};

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

  render() {
    return (
      <div part="note">
        {this.icon && (
          <span part="icon" aria-hidden="true" inert>
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
                <path d={glyphs[noteIcon(this.tone)]} />
              </svg>
            </slot>
          </span>
        )}
        <span part="message">
          <slot />
        </span>
      </div>
    );
  }
}
