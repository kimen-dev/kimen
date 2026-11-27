import '../../../icons/x.js';

import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { fieldText } from '../../utils/field-message';
import { clampValue } from '../ki-progress/ki-progress.math';
import { type FileRejection, validateFileBatch } from './file-upload.validation';

export interface KiFile {
  name: string;
  /** Size in bytes. */
  size: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  /** Percentage for an upload with known progress. */
  progress?: number;
  /** Visible error reason for a row in the error state. */
  error?: string;
  /** Original accepted local file, retained for submission. */
  file?: File;
}

export interface KiFilesAddDetail {
  files: KiFile[];
}

export interface KiFileActionDetail {
  file: KiFile;
}

const sizes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' });
const percentages = new Intl.NumberFormat(undefined, { style: 'percent' });

function withFilename(template: string, file: KiFile): string {
  return template.replaceAll('{file}', () => file.name);
}

/**
 * A form-associated picker and drop zone with local selection validation and a
 * list of file upload outcomes.
 *
 * @whenToUse collect local attachments, media or imports, and optionally show
 * application-managed upload progress and results.
 * @whenNotToUse transfer files without an application handler, collect a URL,
 * or use client-side type and size checks as upload authorization.
 * @slot help - Plain-language guidance for the picker, in place of help-text.
 * @part label - Field label and optional required annotation.
 * @part drop-zone - Surface that receives files dragged from the operating system.
 * @part browse - Native button that opens the file picker.
 * @part input - Hidden native file picker.
 * @part help - Guidance associated with the field.
 * @part error - Field-level form validation error.
 * @part list - List of selected files and rejections.
 * @part row - A file row, with data-status matching its lifecycle state.
 * @part file-name - Name displayed for the file.
 * @part file-meta - Size, outcome or error text for the file.
 * @part action - Native button for removal or cancellation.
 * @part progress - Progress indicator for an uploading file.
 */
@Component({
  tag: 'ki-file-upload',
  styleUrl: 'ki-file-upload.css',
  shadow: true,
  formAssociated: true,
})
export class KiFileUpload {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Visible label and accessible name of the upload group. */
  @Prop() label = 'Upload files';

  /** Guidance for file formats, limits or the purpose of this field. */
  @Prop() helpText?: string;

  /** Application validation error. Clear it to allow form submission again. */
  @Prop() errorText?: string;

  /** Form-data key repeated for each accepted original file. */
  @Prop({ reflect: true }) name?: string;

  /** Requires at least one original accepted file to submit the form. */
  @Prop({ reflect: true, mutable: true }) required = false;

  /** Disables the picker and file actions and excludes the field from submission. */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  /** Allows a selection of more than one file. */
  @Prop({ reflect: true, mutable: true }) multiple = false;

  /** Comma-separated extensions, MIME types and MIME wildcards allowed in new selections. */
  @Prop() accept?: string;

  /** Maximum size per selected file in bytes or decimal B, KB, MB or GB, such as "10MB". */
  @Prop() maxSize?: string;

  /** Maximum accepted local files as a nonnegative integer. Single-file mode also caps this at one. */
  @Prop() maxFiles?: number;

  /**
   * Displayed file records, including rejections. Assign a new array to update
   * progress or outcomes. Keep each original File on its record for form
   * submission. Set this as a JavaScript property when supplying file records.
   * @default []
   */
  @Prop({ attribute: null, mutable: true }) files: KiFile[] = [];

  /** Visible text of the native file picker button. */
  @Prop() browseLabel = 'Browse files';

  /** Drop instruction shown just before the Browse button. */
  @Prop() dropLabel = 'Drop files here or';

  /** Accessible name of the list of files. */
  @Prop() listLabel = 'Files';

  /** Accessible name template for removal. Use {file} for the displayed filename. */
  @Prop() removeLabel = 'Remove {file}';

  /** Accessible name template for cancellation. Use {file} for the displayed filename. */
  @Prop() cancelLabel = 'Cancel upload of {file}';

  /** Progress indicator name template. Use {file} for the displayed filename. */
  @Prop() uploadingLabel = 'Uploading {file}';

  /** Status text for an accepted file waiting to upload. */
  @Prop() queuedLabel = 'Queued';

  /** Status text for a completed upload. */
  @Prop() doneLabel = 'Uploaded';

  /** Fallback status text for a failed upload without a supplied error. */
  @Prop() failedLabel = 'Upload failed.';

  /** Rejection text for a file that does not match accept. */
  @Prop() typeError = 'This file type is not allowed.';

  /** Rejection text for a file larger than max-size. */
  @Prop() sizeError = 'This file is too large.';

  /** Rejection text for a file beyond selection capacity. */
  @Prop() countError = 'Too many files.';

  /** Visible annotation for a required file field. */
  @Prop() requiredLabel = 'Required';

  /** Validation message when the form requires a file and none is selected. */
  @Prop() requiredMessage = 'Select a file.';

  /** Reports the accepted rows in one picker or drop batch, each with its original File. */
  @Event({ eventName: 'ki-files-add', bubbles: true, composed: true, cancelable: false })
  kiFilesAdd!: EventEmitter<KiFilesAddDetail>;

  /** Reports a row removed by the user, after updating the file list. */
  @Event({ eventName: 'ki-file-remove', bubbles: true, composed: true, cancelable: false })
  kiFileRemove!: EventEmitter<KiFileActionDetail>;

  /** Requests that the application cancel the identified upload. */
  @Event({ eventName: 'ki-file-cancel', bubbles: true, composed: true, cancelable: false })
  kiFileCancel!: EventEmitter<KiFileActionDetail>;

  @State() private formDisabled = false;
  @State() private dragActive = false;
  @State() private showRequiredError = false;

  private browse: HTMLButtonElement | undefined;
  private input: HTMLInputElement | undefined;
  private dragDepth = 0;
  private loaded = false;
  private rows = new Map<string, KiFile>();
  private announcement = '';
  private announcementVersion = 0;

  private get disabledForUser(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get fileRows(): KiFile[] {
    return Array.isArray(this.files) ? this.files : [];
  }

  private get originalFiles(): File[] {
    return this.fileRows.flatMap(({ file }) => (file instanceof File ? [file] : []));
  }

  private get fieldError(): string {
    if (this.disabledForUser) return '';
    return fieldText(this.errorText) || (this.showRequiredError ? this.requiredMessage : '');
  }

  disconnectedCallback(): void {
    this.clearDrag();
  }

  componentWillLoad(): void {
    this.syncForm();
  }

  componentDidLoad(): void {
    this.loaded = true;
    this.syncForm();
  }

  componentWillRender(): void {
    const nextRows = this.indexRows();
    if (this.loaded) {
      const messages: string[] = [];
      for (const [key, row] of nextRows) {
        const previous = this.rows.get(key);
        if (row.status === 'done' && previous?.status !== 'done') {
          messages.push(`${row.name}. ${this.doneLabel}.`);
        }
        if (
          row.status === 'error' &&
          (previous?.status !== 'error' || row.error !== previous.error)
        ) {
          messages.push(`${row.name}. ${fieldText(row.error) || this.failedLabel}`);
        }
      }
      if (messages.length) {
        this.announcement = messages.join(' ');
        this.announcementVersion += 1;
      }
    }
    this.rows = nextRows;
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncForm();
  }

  formResetCallback(): void {
    this.showRequiredError = false;
    this.announcement = '';
    this.clearDrag();
    if (this.input) this.input.value = '';
    this.files = [];
  }

  @Watch('files')
  @Watch('name')
  @Watch('disabled')
  @Watch('required')
  @Watch('errorText')
  @Watch('requiredMessage')
  protected syncForm(): void {
    const originals = this.originalFiles;
    const missing = this.required && originals.length === 0;
    const error = fieldText(this.errorText);
    if (this.disabledForUser) this.clearDrag();
    if (this.disabledForUser || !missing) this.showRequiredError = false;

    const name = this.name;
    if (!this.disabledForUser && name && originals.length > 0) {
      const data = new FormData();
      for (const file of originals) data.append(name, file);
      this.internals.setFormValue(data);
    } else {
      this.internals.setFormValue(null);
    }

    if (this.disabledForUser || (!missing && !error)) {
      this.internals.setValidity({});
      return;
    }
    // An invalid form-associated element always needs a non-empty message.
    this.internals.setValidity(
      { valueMissing: missing, customError: Boolean(error) },
      error || this.requiredMessage || ' ',
      this.browse,
    );
  }

  @Listen('invalid')
  protected showValidation(): void {
    this.showRequiredError = this.internals.validity.valueMissing;
  }

  private indexRows(): Map<string, KiFile> {
    const rows = new Map<string, KiFile>();
    const occurrences = new Map<string, number>();
    for (const row of this.fileRows) {
      const identity = JSON.stringify([row.name, row.size, row.file?.lastModified, row.file?.type]);
      const occurrence = (occurrences.get(identity) ?? 0) + 1;
      occurrences.set(identity, occurrence);
      rows.set(`${String(occurrence)}:${identity}`, row);
    }
    return rows;
  }

  private rejectionText(rejection: FileRejection): string {
    return { type: this.typeError, size: this.sizeError, count: this.countError }[rejection];
  }

  private addFiles(files: readonly File[]): void {
    if (this.disabledForUser || files.length === 0) return;
    const results = validateFileBatch(files, {
      accept: this.accept,
      maxSize: this.maxSize,
      maxFiles: this.maxFiles,
      multiple: this.multiple,
      selectedCount: this.originalFiles.length,
    });
    const accepted: KiFile[] = [];
    const rows = results.map(({ file, rejection }): KiFile => {
      const { name, size } = file;
      if (rejection) return { name, size, status: 'error', error: this.rejectionText(rejection) };
      const row: KiFile = { name, size, status: 'queued', file };
      accepted.push(row);
      return row;
    });
    this.files = [...this.fileRows, ...rows];
    if (accepted.length) this.kiFilesAdd.emit({ files: accepted });
  }

  private readonly openPicker = (): void => {
    if (!this.disabledForUser) this.input?.click();
  };

  private readonly onSelection = (): void => {
    const input = this.input;
    if (!input?.files) return;
    const files = Array.from(input.files);
    input.value = '';
    this.addFiles(files);
  };

  private readonly onDragEnter = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    if (this.disabledForUser) return;
    this.dragDepth += 1;
    this.dragActive = true;
  };

  private readonly onDragLeave = (): void => {
    if (this.dragDepth > 0) this.dragDepth -= 1;
    this.dragActive = this.dragDepth > 0;
  };

  private readonly onDragOver = (event: DragEvent): void => {
    const transfer = event.dataTransfer;
    if (!transfer?.types.includes('Files')) return;
    event.preventDefault();
    transfer.dropEffect = this.disabledForUser ? 'none' : 'copy';
  };

  private readonly onDrop = (event: DragEvent): void => {
    this.clearDrag();
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    event.preventDefault();
    this.addFiles(Array.from(files));
  };

  private clearDrag(): void {
    this.dragDepth = 0;
    this.dragActive = false;
  }

  private activateRow(file: KiFile, index: number, button: HTMLButtonElement): void {
    if (this.disabledForUser || this.fileRows[index] !== file) return;
    if (file.status === 'uploading') {
      this.kiFileCancel.emit({ file });
      return;
    }
    if (this.host.shadowRoot?.activeElement === button) this.browse?.focus();
    this.files = this.fileRows.filter((_, rowIndex) => rowIndex !== index);
    this.kiFileRemove.emit({ file });
  }

  private renderRow(file: KiFile, index: number, key: string) {
    const uploading = file.status === 'uploading';
    const error = file.status === 'error';
    const progress = file.progress === undefined ? undefined : clampValue(file.progress, 100);
    const status = error
      ? fieldText(file.error) || this.failedLabel
      : uploading
        ? progress === undefined
          ? ''
          : percentages.format(progress / 100)
        : file.status === 'done'
          ? this.doneLabel
          : this.queuedLabel;

    return (
      <li key={key} part="row" data-status={file.status}>
        <bdi part="file-name">{file.name}</bdi>
        <button
          type="button"
          part="action"
          disabled={this.disabledForUser}
          aria-label={withFilename(uploading ? this.cancelLabel : this.removeLabel, file)}
          onClick={(event) => {
            this.activateRow(file, index, event.currentTarget as HTMLButtonElement);
          }}
        >
          <ki-icon name="x" />
        </button>
        {uploading && (
          <ki-progress
            part="progress"
            label={withFilename(this.uploadingLabel, file)}
            value={progress ?? 0}
            indeterminate={progress === undefined}
          />
        )}{' '}
        <p part="file-meta">
          {error ? status : [sizes.format(file.size), status].filter(Boolean).join(' · ')}
        </p>
      </li>
    );
  }

  render() {
    const error = this.fieldError;
    // Explicit keys keep Stencil's build-wide counter stable for existing components.
    return (
      <div
        key="field"
        class="field"
        role="group"
        aria-labelledby="label"
        aria-describedby={error ? 'error' : 'help'}
        aria-disabled={this.disabledForUser ? 'true' : undefined}
      >
        <div key="label" part="label">
          <span key="label-text" id="label">
            {this.label}
          </span>
          {this.required && <span class="required"> {this.requiredLabel}</span>}
        </div>
        <div
          key="drop-zone"
          part="drop-zone"
          data-drag-active={this.dragActive ? '' : undefined}
          onDragEnter={this.onDragEnter}
          onDragLeave={this.onDragLeave}
          onDragOver={this.onDragOver}
          onDrop={this.onDrop}
        >
          <div key="instruction">
            {this.dropLabel}{' '}
            <button
              type="button"
              key="browse"
              part="browse"
              disabled={this.disabledForUser}
              ref={(button) => {
                this.browse = button;
              }}
              onClick={this.openPicker}
            >
              {this.browseLabel}
            </button>
          </div>
          <input
            type="file"
            key="input"
            part="input"
            hidden
            disabled={this.disabledForUser}
            accept={this.accept ?? ''}
            multiple={this.multiple}
            ref={(input) => {
              this.input = input;
            }}
            onChange={this.onSelection}
          />
          <div key="help" id="help" part="help" hidden={Boolean(error)}>
            <slot key="help-slot" name="help">
              {this.helpText}
            </slot>
          </div>
          <div key="error" id="error" part="error" aria-live="polite" aria-atomic="true">
            {error}
          </div>
        </div>
        {this.rows.size > 0 && (
          <ul part="list" aria-label={this.listLabel}>
            {Array.from(this.rows, ([key, file], index) => this.renderRow(file, index, key))}
          </ul>
        )}
        <div
          key="announcement"
          class="announcement"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span key={this.announcementVersion}>{this.announcement}</span>
        </div>
      </div>
    );
  }
}
