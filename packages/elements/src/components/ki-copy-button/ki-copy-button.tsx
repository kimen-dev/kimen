import '../../../icons/check.js';
import '../../../icons/circle-alert.js';
import '../../../icons/copy.js';
import { Component, Element, type EventEmitter, Event, Host, h, Prop, State } from '@stencil/core';

import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press';
import type { KiButtonSize, KiButtonVariant } from '../ki-button/ki-button';
import { copySourceText, feedbackTimeout } from './ki-copy-button.behavior';

export type KiCopyButtonVariant = Exclude<KiButtonVariant, 'tertiary'>;

type CopyResult = 'success' | 'error';
const glyphs = { idle: 'copy', success: 'check', error: 'circle-alert' } as const;
const DEFAULT_LABEL = 'Copy';

/**
 * Copies text to the clipboard and confirms the result in the same button.
 *
 * @whenToUse let a person copy a link, identifier, token or code sample. Supply
 * a direct value or point to a source in the same document or shadow root.
 * @whenNotToUse submit a form, navigate, or trigger an action with no clipboard
 * write. Use a button or link for those actions.
 * @slot - Optional visible text, which supplies the accessible name and
 * places the icon at the inline start. Use plain text or non-interactive markup.
 * @part button - Native copy control with keyboard and pointer activation.
 * @part icon - Fixed-size decorative feedback glyph box inside the button.
 * @part label - Wrapper around the visible slotted label.
 */
@Component({
  tag: 'ki-copy-button',
  styleUrls: [
    '../ki-button/ki-button.surface.css',
    '../ki-button/ki-button.css',
    'ki-copy-button.css',
  ],
  shadow: { delegatesFocus: true },
})
export class KiCopyButton {
  @Element() private readonly host!: HTMLElement;

  /** Exact clipboard text, including whitespace. Supply it when the text is known directly. */
  @Prop() value?: string;

  /**
   * ID of a source in this button's document or shadow root. A nonempty ID
   * takes precedence over `value`. The source's current string value or
   * its text content is read on activation.
   */
  @Prop() from?: string;

  /** Accessible name for the icon-only control. Visible slot text supplies the name when present. */
  @Prop() label = 'Copy';

  /** Button emphasis. Use ghost for compact actions and secondary for a visible supporting action. */
  @Prop({ reflect: true }) variant: KiCopyButtonVariant = 'ghost';

  /** Token-backed button size. Match the size of adjacent controls. */
  @Prop({ reflect: true }) size: KiButtonSize = 'md';

  /**
   * Milliseconds to show feedback after a write settles. Zero keeps the
   * outcome visible until the next result. Invalid values use 1500 ms.
   * @minimum 0
   */
  @Prop() feedbackDuration = 1500;

  /** Polite announcement after a successful write. Override for localized interfaces. */
  @Prop() copiedLabel = 'Copied';

  /** Polite announcement after a failed write or missing source. Override for localized interfaces. */
  @Prop() copyErrorLabel = "Couldn't copy";

  /** Fired after a successful clipboard write. The detail carries the exact text copied. */
  @Event({ bubbles: true, cancelable: false, composed: true, eventName: 'ki-copy' })
  kiCopy!: EventEmitter<{ value: string }>;

  /** Fired when the source cannot be read or clipboard writing is unavailable or fails. */
  @Event({ bubbles: true, cancelable: false, composed: true, eventName: 'ki-copy-error' })
  kiCopyError!: EventEmitter<void>;

  @State() private hasLabel = false;
  @State() private feedback: { result: CopyResult; attempt: number } | undefined;

  private labelObserver: MutationObserver | undefined;
  private attempt = 0;
  private pending = false;
  private feedbackTimer: number | undefined;

  connectedCallback(): void {
    // Reset feedback where a render can run against a connected host.
    this.feedback = undefined;
    this.updateLabel();
    this.labelObserver ??= new MutationObserver(this.updateLabel);
    this.labelObserver.observe(this.host, {
      attributes: true,
      attributeFilter: ['slot'],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback(): void {
    this.labelObserver?.disconnect();
    this.labelObserver = undefined;
    this.attempt += 1;
    this.pending = false;
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = undefined;
  }

  private readonly updateLabel = (): void => {
    this.hasLabel = [...this.host.childNodes].some(
      (node) =>
        (node.nodeType === Node.TEXT_NODE ||
          (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).slot)) &&
        !!node.textContent?.trim(),
    );
  };

  private getSourceText(): string | undefined {
    if (!this.from) return this.value;
    // A connected element's root is its document or the enclosing shadow root.
    const root = this.host.getRootNode() as Document | ShadowRoot;
    return copySourceText(root.getElementById(this.from));
  }

  private showFeedback(result: CopyResult, attempt: number): void {
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = undefined;
    this.feedback = { result, attempt };
    const duration = feedbackTimeout(this.feedbackDuration);
    if (duration > 0) {
      this.feedbackTimer = window.setTimeout(() => {
        this.feedbackTimer = undefined;
        this.feedback = undefined;
      }, duration);
    }
  }

  private readonly copy = async (): Promise<void> => {
    if (this.pending || !this.host.isConnected) return;
    this.pending = true;
    const attempt = ++this.attempt;
    let copied: string | undefined;
    try {
      const text = this.getSourceText();
      const clipboard = this.host.ownerDocument.defaultView?.navigator.clipboard;
      if (text !== undefined && clipboard) {
        await clipboard.writeText(text);
        copied = text;
      }
    } catch {
      // Browser permissions and source access failures share the error feedback.
    }

    if (attempt !== this.attempt) return;
    this.pending = false;
    this.showFeedback(copied === undefined ? 'error' : 'success', attempt);
    if (copied === undefined) {
      this.kiCopyError.emit();
    } else {
      this.kiCopy.emit({ value: copied });
    }
  };

  render() {
    const feedback = this.feedback;
    const iconLabel = (this.label || '').trim() || DEFAULT_LABEL;
    // Keep the fixed control and status region identities stable as feedback changes.
    return (
      <Host key="copy-button" tone="neutral">
        <button
          key="button"
          aria-label={this.hasLabel ? undefined : iconLabel}
          data-icon-only={this.hasLabel ? undefined : ''}
          onBlur={endKeyboardPress}
          onClick={() => {
            void this.copy();
          }}
          onKeyDown={startKeyboardPress}
          onKeyUp={releaseKeyboardPress}
          part="button"
          tabIndex={0}
          type="button"
        >
          <span key="glyph" aria-hidden="true" data-feedback={feedback?.result} part="icon">
            <ki-icon key="icon" name={glyphs[feedback?.result ?? 'idle']} />
          </span>
          <span key="label" hidden={!this.hasLabel} part="label">
            <slot key="label-text" />
          </span>
        </button>
        <span key="status" aria-atomic="true" aria-live="polite" class="status" role="status">
          {feedback && (
            <span key={feedback.attempt}>
              {feedback.result === 'success' ? this.copiedLabel : this.copyErrorLabel}
            </span>
          )}
        </span>
      </Host>
    );
  }
}
