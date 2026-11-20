import '../../../icons/bot.js';
import '../../../icons/search.js';

import { Component, Element, h, Prop, Watch } from '@stencil/core';

export type KiMessageRole = 'user' | 'assistant' | 'event';

const authorLabels: Readonly<Record<KiMessageRole, string>> = {
  user: 'You said',
  assistant: 'Assistant said',
  event: 'System event',
};

/**
 * A named chat article styled as a person’s message, assistant reply or event.
 *
 * @whenToUse Display a transcript entry inside ki-conversation. Pass
 * formatted content through the default slot and set streaming during a reply.
 * @whenNotToUse Collect a prompt, announce a page alert, or execute a tool.
 *
 * @slot - Message content, including text or formatted elements.
 * @slot avatar - Optional avatar replacing the assistant’s decorative default.
 * @slot actions - Follow-up controls supplied by the consumer after the content.
 * @part message - The named article and role-specific layout.
 * @part avatar - The leading assistant avatar container.
 * @part content - The body of the article, including any event icon.
 * @part actions - The group containing slotted follow-up controls.
 * @part caret - The decorative marker displayed while a message is streaming.
 */
@Component({
  tag: 'ki-message',
  styleUrl: 'ki-message.css',
  shadow: true,
})
export class KiMessage {
  @Element() private readonly host!: HTMLElement;

  /**
   * The speaker or event kind. The user has a trailing bubble, the assistant has
   * a leading avatar, and an event is a centered note.
   * @default 'assistant'
   */
  @Prop({ mutable: true, reflect: true }) messageRole?: KiMessageRole;

  /** Show the caret and mark the article busy until this message is complete. */
  @Prop({ reflect: true }) streaming = false;

  /**
   * Full accessible name for this article, such as "Ava said". Override it to
   * identify the speaker or localize the default role-specific name.
   */
  @Prop() author?: string;

  /**
   * Decorative event glyph from the ki-icon registry. Search is available
   * directly. Import other per-icon modules before setting their names.
   */
  @Prop() iconName?: string;

  componentWillLoad(): void {
    // The message kind in the proposal used HTML's ARIA role attribute.
    this.consumeRoleAlias(this.host.getAttribute('role'), this.messageRole === undefined);
  }

  @Watch('role')
  protected roleAttributeChanged(value: string | null): void {
    this.consumeRoleAlias(value, true);
  }

  private consumeRoleAlias(value: string | null, apply: boolean): void {
    if (value !== 'user' && value !== 'assistant' && value !== 'event') return;

    this.host.removeAttribute('role');
    if (apply) this.messageRole = value;
  }

  render() {
    const role =
      this.messageRole === 'user' || this.messageRole === 'event' ? this.messageRole : 'assistant';
    const author = this.author?.trim() ?? '';

    return (
      <article
        key="message"
        part="message"
        class={role}
        aria-label={author.length > 0 ? author : authorLabels[role]}
        aria-busy={this.streaming ? 'true' : undefined}
        aria-atomic="true"
      >
        {role === 'assistant' && (
          <div key="avatar" part="avatar">
            <slot key="avatar-slot" name="avatar">
              <span key="default-avatar" class="default-avatar" aria-hidden="true">
                <ki-icon key="default-avatar-icon" name="bot" />
              </span>
            </slot>
          </div>
        )}
        <div key="body" class="body">
          <div key="content" part="content">
            {role === 'event' && this.iconName && <ki-icon key="event-icon" name={this.iconName} />}
            <div key="text" class="text">
              <slot key="content-slot" />
              {this.streaming && <span key="caret" part="caret" aria-hidden="true" />}
            </div>
          </div>
          <div key="actions" part="actions">
            <slot key="actions-slot" name="actions" />
          </div>
        </div>
      </article>
    );
  }
}
