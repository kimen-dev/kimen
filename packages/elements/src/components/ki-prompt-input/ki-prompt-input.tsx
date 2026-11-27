import '../../../icons/arrow-up.js';
import '../../../icons/paperclip.js';
import '../../../icons/square.js';
import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import {
  type FileBatch,
  type RejectionReason,
  selectAttachments,
  shouldSubmit,
  transferFiles,
} from './ki-prompt-input.files';

export type KiPromptInputStatus = 'idle' | 'submitted' | 'streaming';
export type KiPromptInputSubmitOn = 'enter' | 'mod-enter';
export interface KiPromptInputSubmitDetail {
  text: string;
  files: File[];
}

/**
 * A multiline assistant composer with local file attachments and send and stop requests.
 * @whenToUse Compose a message to an assistant, optionally attach local files, and let people interrupt the assistant's response.
 * @whenNotToUse Ordinary multiline form input without a send or stop interaction (`ki-textarea`), file uploads, or rich text editing.
 * @slot tools - Application-owned toolbar controls, such as a model-picker trigger. Use non-submitting controls.
 * @slot attachments - Supplemental list items, visible when accept is set. Composer-managed files appear in the same list and alone contribute to ki-submit.
 * @part field - The painted composer enclosure.
 * @part textarea - The native growing text control.
 * @part attachments - The labelled attachment list.
 * @part tools - The container for the tools slot.
 * @part actions - The toolbar with attachment, tool and message actions.
 * @part attach - The native file-picker button.
 * @part send - The native Send button.
 * @part stop - The native Stop button, visible while streaming.
 * @part status - The polite announcement for the streaming state.
 * @part feedback - The polite announcement for rejected attachments.
 */
@Component({
  tag: 'ki-prompt-input',
  styleUrl: 'ki-prompt-input.css',
  // The native field and internal controls share a focus boundary; application
  // tools remain in light DOM and work through their own public APIs.
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiPromptInput {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Required accessible name of the text field. Supply it even with a placeholder. */
  @Prop() label!: string;

  /** Hint displayed while the text field is empty. */
  @Prop() placeholder?: string;

  /** Current draft text; the value attribute provides the form reset default. */
  @Prop({ mutable: true }) value?: string = '';

  /** Excludes the composer from interaction and native form data. */
  @Prop({ reflect: true }) disabled = false;

  /** Optional key for the text in native form data. Files are carried by ki-submit. */
  @Prop({ reflect: true }) name?: string;

  /** Application-owned request state. Only idle can send; streaming exposes Stop. */
  @Prop() status?: KiPromptInputStatus = 'idle';

  /** Comma-separated extensions or MIME types. Empty hides the attachment surface. */
  @Prop() accept?: string = '';

  /** Maximum count of attached files. Omit for no count limit. */
  @Prop() maxFiles?: number;

  /** Maximum attachment size in bytes per file. Omit for no size limit. */
  @Prop() maxSize?: number;

  /** Send with Enter or with Control/Command+Enter. Shift+Enter always adds a line. */
  @Prop() submitOn: KiPromptInputSubmitOn = 'enter';

  /** Accessible name of the file picker button. */
  @Prop() attachLabel = 'Attach files';

  /** Accessible name of the attachment list. */
  @Prop() attachmentsLabel = 'Attachments';

  /** Prefix of an attachment's remove button name, followed by the file name. */
  @Prop() removeLabel = 'Remove';

  /** Accessible name of the Send button. */
  @Prop() sendLabel = 'Send';

  /** Accessible name of the Stop button. */
  @Prop() stopLabel = 'Stop generating';

  /** Visible polite status while the assistant streams. */
  @Prop() writingMessage = 'Writing…';

  /** Localized type rejection. The {name} marker is replaced with the file name. */
  @Prop() fileTypeMessage = '{name} has an unsupported file type.';

  /** Localized size rejection. The {name} marker is replaced with the file name. */
  @Prop() fileSizeMessage = '{name} exceeds the file size limit.';

  /** Localized count rejection. The {name} marker is replaced with the file name. */
  @Prop() fileCountMessage = '{name} exceeds the maximum number of attachments.';

  /** Requests a send with original text and a snapshot of accepted local files. */
  @Event({ eventName: 'ki-submit', cancelable: false })
  kiSubmit!: EventEmitter<KiPromptInputSubmitDetail>;

  /** Requests that the application stop its streaming response. */
  @Event({ eventName: 'ki-stop', cancelable: false }) kiStop!: EventEmitter<void>;

  @State() private formDisabled = false;
  @State() private attachments: File[] = [];
  @State() private feedback = '';
  @State() private hasAttachmentSlot = false;

  private textarea: HTMLTextAreaElement | undefined;
  private picker: HTMLInputElement | undefined;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get attachmentsEnabled(): boolean {
    return !!this.accept?.trim();
  }

  private get canSend(): boolean {
    return (
      !this.effectiveDisabled &&
      (this.status ?? 'idle') === 'idle' &&
      (!!this.value?.trim() || this.attachments.length > 0)
    );
  }

  componentWillLoad(): void {
    this.syncValue();
  }

  @Watch('value')
  @Watch('disabled')
  protected syncValue(): void {
    const text = this.value ?? '';
    const textarea = this.textarea;
    if (textarea && textarea.value !== text) textarea.value = text;
    this.internals.setFormValue(this.effectiveDisabled ? null : text);
  }

  @Watch('accept')
  protected onAcceptChange(): void {
    if (!this.attachmentsEnabled) this.clearAttachments();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncValue();
  }

  formResetCallback(): void {
    this.value = this.host.getAttribute('value') ?? '';
    this.clearAttachments();
  }

  private clearAttachments(): void {
    this.attachments = [];
    this.feedback = '';
  }

  private readonly onInput = (event: globalThis.Event): void => {
    this.value = (event.currentTarget as HTMLTextAreaElement).value;
  };

  private readonly send = (): void => {
    if (!this.canSend) return;
    const text = this.value ?? '';
    this.kiSubmit.emit({ text, files: [...this.attachments] });
    if (text && this.value === text) {
      this.value = '';
      this.host.dispatchEvent(new globalThis.Event('input', { bubbles: true, composed: true }));
    }
    this.clearAttachments();
    this.textarea?.focus();
  };

  private readonly stop = (): void => {
    if (this.effectiveDisabled || this.status !== 'streaming') return;
    this.kiStop.emit();
    this.textarea?.focus();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!shouldSubmit(event, this.submitOn)) return;
    event.preventDefault();
    this.send();
  };

  private handleFiles(files: FileBatch): boolean {
    const accept = this.accept?.trim();
    if (!accept || this.effectiveDisabled || files.length === 0) return false;
    const { accepted, rejected } = selectAttachments(
      files,
      accept,
      this.attachments.length,
      this.maxFiles,
      this.maxSize,
    );
    this.attachments = this.attachments.concat(accepted);
    const messages: Record<RejectionReason, string> = {
      type: this.fileTypeMessage,
      size: this.fileSizeMessage,
      count: this.fileCountMessage,
    };
    this.feedback = rejected
      .map(({ file, reason }) => messages[reason].replaceAll('{name}', () => file.name))
      .join(' ');
    return true;
  }

  private readonly openPicker = (): void => {
    this.picker?.click();
  };

  private readonly onPick = (event: globalThis.Event): void => {
    const picker = event.currentTarget as HTMLInputElement;
    const files = picker.files;
    if (files) this.handleFiles(files);
    picker.value = '';
  };

  private readonly onDragOver = (event: DragEvent): void => {
    const transfer = event.dataTransfer;
    if (!transfer?.types.includes('Files')) return;
    event.preventDefault();
    transfer.dropEffect = this.attachmentsEnabled && !this.effectiveDisabled ? 'copy' : 'none';
  };

  private readonly onFileTransfer = (event: ClipboardEvent | DragEvent): void => {
    const dropped = 'dataTransfer' in event;
    const transfer = dropped ? event.dataTransfer : event.clipboardData;
    if (!transfer) return;
    const files = transferFiles(transfer);
    const handled = this.handleFiles(files);
    if (dropped ? files.length : handled && !transfer.getData('text/plain')) {
      event.preventDefault();
    }
  };

  private readonly onAttachmentSlotChange = (event: globalThis.Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    this.hasAttachmentSlot = slot.assignedElements().length > 0;
  };

  private removeAttachment(index: number, event: globalThis.Event): void {
    // The parent owns the list and lets Stencil reconcile the keyed item.
    event.preventDefault();
    event.stopPropagation();
    if (this.effectiveDisabled) return;
    this.attachments = this.attachments.filter((_, position) => position !== index);
    this.feedback = '';
    this.textarea?.focus();
  }

  render() {
    const disabled = this.effectiveDisabled;
    const streaming = this.status === 'streaming';
    const attachmentsEnabled = this.attachmentsEnabled;
    const text = this.value ?? '';
    // Safari omits list semantics when its markers are visually suppressed.
    const listRole = 'list';
    return (
      <div key="field" part="field" onDragOver={this.onDragOver} onDrop={this.onFileTransfer}>
        {attachmentsEnabled && (
          <ul
            key="files"
            part="attachments"
            role={listRole}
            aria-label={this.attachmentsLabel}
            hidden={this.attachments.length === 0 && !this.hasAttachmentSlot}
          >
            {this.attachments.map((file, index) => (
              <li key={index}>
                <ki-chip
                  key="chip"
                  type="input"
                  removable
                  disabled={disabled}
                  removeLabel={this.removeLabel}
                  onKi-remove={(event) => {
                    this.removeAttachment(index, event);
                  }}
                >
                  {file.name}
                </ki-chip>
              </li>
            ))}
            <slot
              key="extra"
              name="attachments"
              {...{ inert: disabled }}
              onSlotchange={this.onAttachmentSlotChange}
            />
          </ul>
        )}
        <div key="editor" class="editor">
          {/* A hidden sizer shares the wrapping metrics across browser engines. */}
          <span key="sizer" class="sizer">{`${text}\u200b`}</span>
          <textarea
            key="textarea"
            part="textarea"
            aria-label={this.label}
            placeholder={this.placeholder ?? ''}
            disabled={disabled}
            value={text}
            rows={1}
            ref={(el) => {
              this.textarea = el;
            }}
            onInput={this.onInput}
            onKeyDown={this.onKeyDown}
            onPaste={this.onFileTransfer}
          />
        </div>
        <div key="actions" part="actions">
          {attachmentsEnabled && (
            <button
              type="button"
              tabindex={0}
              key="attach"
              part="attach"
              aria-label={this.attachLabel}
              disabled={disabled}
              onClick={this.openPicker}
            >
              <ki-icon key="paperclip" name="paperclip" />
            </button>
          )}
          <div key="tools" part="tools" inert={disabled}>
            <slot key="slot-tools" name="tools" />
          </div>
          <span key="status" part="status" role="status" aria-live="polite">
            {streaming && this.writingMessage}
          </span>
          <button
            type="button"
            tabindex={0}
            key="request"
            part={streaming ? 'stop' : 'send'}
            aria-label={streaming ? this.stopLabel : this.sendLabel}
            disabled={streaming ? disabled : !this.canSend}
            onClick={streaming ? this.stop : this.send}
          >
            <ki-icon key="glyph" name={streaming ? 'square' : 'arrow-up'} />
          </button>
        </div>
        <div key="feedback" part="feedback" aria-live="polite" aria-atomic="true">
          {this.feedback}
        </div>
        {attachmentsEnabled && (
          <input
            key="picker"
            hidden
            type="file"
            accept={this.accept ?? ''}
            multiple
            disabled={disabled}
            ref={(el) => {
              this.picker = el;
            }}
            onChange={this.onPick}
          />
        )}
      </div>
    );
  }
}
