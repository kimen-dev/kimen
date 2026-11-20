import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press.js';
import { normalizeSuggestionTitle } from './ki-suggestion.title.js';

/**
 * A native prompt button displayed by a ki-suggestions group.
 * @whenToUse offer one short, actionable prompt in a suggestion group.
 * @whenNotToUse navigation, static content, or a submitted form value.
 * @slot - Plain text forming the visible and accessible prompt title.
 * @part button - The native suggestion button.
 * @part description - Optional supporting text shown in cards.
 */
@Component({
  tag: 'ki-suggestion',
  styleUrl: 'ki-suggestion.css',
  // The shadow root owns the native button and its accessible description.
  shadow: true,
})
export class KiSuggestion {
  @Element() private readonly host!: HTMLElement;

  /** Optional accessible description, visible below the title in cards. */
  @Prop() description?: string;

  @State() private promptTitle = '';

  private titleObserver?: MutationObserver;

  connectedCallback(): void {
    this.titleObserver = new MutationObserver(this.readTitle);
    this.titleObserver.observe(this.host, { childList: true, characterData: true, subtree: true });
    this.readTitle();
  }

  disconnectedCallback(): void {
    this.titleObserver?.disconnect();
  }

  private readonly readTitle = (): void => {
    const text = [...this.host.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('');
    this.promptTitle = normalizeSuggestionTitle(text);
  };

  render() {
    const description = this.description && normalizeSuggestionTitle(this.description);

    return (
      <Host data-ki-suggestion-empty={this.promptTitle ? undefined : ''}>
        <span hidden>
          <slot />
        </span>
        {this.promptTitle && (
          <div class="surface">
            <button
              type="button"
              part="button"
              tabIndex={0}
              aria-describedby={description ? 'description' : undefined}
              onKeyDown={startKeyboardPress}
              onKeyUp={releaseKeyboardPress}
              onBlur={endKeyboardPress}
            >
              <span>{this.promptTitle}</span>
            </button>
            {description && (
              <span id="description" part="description">
                {description}
              </span>
            )}
          </div>
        )}
      </Host>
    );
  }
}
