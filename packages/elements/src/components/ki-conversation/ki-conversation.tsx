import { Component, h, Prop, State, Watch } from '@stencil/core';
import { isAtConversationEnd } from './ki-conversation.scroll';

/**
 * An accessible chat transcript with optional following as messages arrive.
 *
 * @whenToUse Display chronological user, assistant and event messages. Give
 * the host a block-size constraint to keep scrolling within the transcript.
 * @whenNotToUse Collect input, send messages or present a static sequence of
 * cards. Place the composer outside the transcript.
 *
 * @slot - The chronological transcript, normally ki-message elements.
 * @part log - The named polite live region and keyboard-focusable scrollport.
 * @part messages - The stack of slotted messages inside the scrollport.
 * @part jump - The Jump to latest button shown while following is paused.
 */
@Component({
  tag: 'ki-conversation',
  styleUrl: 'ki-conversation.css',
  shadow: true,
})
export class KiConversation {
  /** Accessible name of the transcript. Supply a distinct label when several logs share a page. */
  @Prop() label = 'Conversation';

  /** Follow new or growing messages until the reader scrolls away from the end. */
  @Prop({ reflect: true }) stickToBottom = false;

  /** Visible and accessible label for the control that resumes following. */
  @Prop() jumpLabel = 'Jump to latest';

  @State() private awayFromEnd = false;

  private viewport: HTMLDivElement | undefined;
  private messages: HTMLDivElement | undefined;
  private jump: HTMLElement | undefined;
  private resizeObserver?: ResizeObserver;
  private followedOffset: number | undefined;

  connectedCallback(): void {
    this.observeTranscript();
  }

  componentDidLoad(): void {
    this.observeTranscript();
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
  }

  @Watch('stickToBottom')
  protected followingChanged(): void {
    this.setAwayFromEnd(false);
    this.observeTranscript();
  }

  private observeTranscript(): void {
    this.resizeObserver?.disconnect();
    if (!this.stickToBottom || !this.viewport || !this.messages) return;

    // The stack grows when slotted text wraps, streams, or loads an asset.
    // The viewport also changes when its parent layout or controls resize.
    this.resizeObserver ??= new ResizeObserver(this.followTranscript);
    this.resizeObserver.observe(this.messages);
    this.resizeObserver.observe(this.viewport);
    this.followTranscript();
  }

  private atEnd(viewport: HTMLDivElement): boolean {
    return isAtConversationEnd(viewport.scrollTop, viewport.scrollHeight, viewport.clientHeight);
  }

  private setAwayFromEnd(away: boolean): void {
    if (away === this.awayFromEnd) return;
    if (!away && this.jump?.matches(':focus-within')) {
      this.viewport?.focus({ preventScroll: true });
    }
    this.awayFromEnd = away;
  }

  private followTranscript = (): void => {
    const viewport = this.viewport;
    if (!this.stickToBottom || !viewport) return;
    if (this.awayFromEnd && !this.atEnd(viewport)) return;

    this.goToEnd();
  };

  private onScroll = (): void => {
    if (!this.stickToBottom || !this.viewport) return;
    // A scroll caused by following can be delivered after more text has
    // already changed the scroll height. Only a changed offset can pause us.
    if (!this.awayFromEnd && this.viewport.scrollTop === this.followedOffset) return;
    this.setAwayFromEnd(!this.atEnd(this.viewport));
  };

  private goToEnd = (): void => {
    const viewport = this.viewport;
    if (!viewport) return;

    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
    this.followedOffset = viewport.scrollTop;
    this.setAwayFromEnd(false);
  };

  render() {
    // The named scrollport is a keyboard stop so its native scrolling keys work.
    const scrollFocus = { tabindex: '0' };
    // Explicit keys keep Stencil's automatic key sequence stable for other tags.
    return (
      <div key="transcript" class="transcript">
        <div
          key="log"
          part="log"
          role="log"
          aria-label={this.label}
          aria-live="polite"
          {...scrollFocus}
          onScroll={this.onScroll}
          ref={(element) => {
            this.viewport = element;
          }}
        >
          <div
            key="messages"
            part="messages"
            ref={(element) => {
              this.messages = element;
            }}
          >
            <slot key="transcript-slot" />
          </div>
        </div>
        {this.stickToBottom && this.awayFromEnd && (
          <div key="jump-container" class="jump-container">
            <ki-button
              key="jump"
              part="jump"
              type="button"
              variant="secondary"
              size="lg"
              onClick={this.goToEnd}
              ref={(element) => {
                this.jump = element;
              }}
            >
              {this.jumpLabel}
            </ki-button>
          </div>
        )}
      </div>
    );
  }
}
