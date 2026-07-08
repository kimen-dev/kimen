import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import { normalizeKiTextareaRows } from './ki-textarea.form';

/**
 * A token-styled multiline text field with native form semantics.
 *
 * When to use: free-form text longer than one line, such as comments,
 * descriptions, messages, delivery notes, or addresses when paired with a
 * matching `autocomplete` purpose.
 * When NOT to use: single-line values (`ki-input`), constrained choices,
 * rich or formatted text editing, or search boxes.
 *
 * Agent note: initial text is declared through the `value` attribute; element
 * text content is ignored. Enter inserts a line break and never submits the
 * enclosing form, the inverse of `ki-input`.
 *
 * @part field - The enclosure wrapper.
 * @part textarea - Internal native multiline control.
 * @part label - Rendered visible label and accessible-name source.
 */
@Component({
  tag: 'ki-textarea',
  styleUrl: 'ki-textarea.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiTextarea {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Visible label rendered by the component and used as the accessible name.
   * When to use: always provide a concise label for the requested long-form
   * text. When NOT to use: do not substitute placeholder text for the label.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Hint shown while the textarea is empty.
   * When to use: add an example or short formatting hint. When NOT to use: do
   * not use placeholder as the accessible name or required instruction.
   */
  @Prop({ reflect: true }) placeholder?: string;

  /**
   * Live current text. The `value` attribute declares the reset default;
   * element text content is ignored. Programmatic assignments replace the
   * display and emit no events.
   * When to use: preload or read free-form text, line breaks included. When
   * NOT to use: do not put initial text between the element tags.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Form-data key used when the textarea submits with a form.
   * When to use: provide for fields whose text must be included in FormData.
   * When NOT to use: omit for display-only or client-only fields.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Visible line count. Invalid, non-numeric, zero, or negative values fall
   * back to 2; no auto-grow or user resize handle exists in v1.
   * When to use: set the stable multiline height needed by the layout. When
   * NOT to use: do not use rows as a responsive size axis.
   *
   * @default 2
   */
  @Prop({ reflect: true }) rows = 2;

  /**
   * Requires a non-empty value before form submission.
   * When to use: mark mandatory long-form text. When NOT to use: do not pair
   * with `readonly` expecting it to block; readonly fields are validation
   * exempt like native textareas.
   *
   * @default false
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Makes the textarea focusable and selectable while rejecting edits.
   * When to use: show submitted or policy text that should still be included
   * in form data. When NOT to use: do not use readonly to remove a field from
   * submission; use disabled.
   *
   * @default false
   */
  @Prop({ reflect: true }) readonly = false;

  /**
   * Disables editing, focus, validation and form-data contribution.
   * When to use: make a field temporarily unavailable. When NOT to use: do not
   * use disabled for readonly review text that should submit.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Autofill detail token forwarded to the native textarea.
   * When to use: expose entry purpose such as `street-address` when available.
   * When NOT to use: omit when no valid autofill purpose applies.
   */
  @Prop({ reflect: true }) autocomplete?: string;

  @State() private formDisabled = false;

  private controlId = `ki-textarea-${Math.random().toString(36).slice(2)}`;
  private textarea: HTMLTextAreaElement | undefined;

  private get normalizedRows(): number {
    return normalizeKiTextareaRows(this.rows);
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('required')
  @Watch('readonly')
  @Watch('disabled')
  protected validityChanged(): void {
    this.syncDisabledFocus();
    this.syncValidity();
  }

  componentDidLoad(): void {
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  componentDidRender(): void {
    this.syncTextareaValue();
    this.syncValidity();
  }

  formResetCallback(): void {
    this.value = this.host.getAttribute('value') ?? '';
    this.deleteUserInvalidState();
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncDisabledFocus();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.updateUserInvalidState();
  }

  private readonly handleInput = (): void => {
    if (!this.textarea?.validity) {
      return;
    }

    this.value = this.textarea.value;
    this.syncFormValue();
    this.syncValidity();
  };

  private readonly handleChange = (): void => {
    if (!this.textarea?.validity) {
      return;
    }

    this.value = this.textarea.value;
    this.syncFormValue();
    this.syncValidity();
    this.updateUserInvalidState();
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private syncTextareaValue(): void {
    if (this.textarea && this.textarea.value !== this.value) {
      this.textarea.value = this.value;
    }
  }

  private syncFormValue(): void {
    (this.internals as Partial<ElementInternals>).setFormValue?.(this.value);
  }

  private syncValidity(): void {
    if (!this.textarea?.validity) {
      return;
    }

    (this.internals as Partial<ElementInternals>).setValidity?.(
      this.textarea.validity,
      this.textarea.validationMessage,
      this.textarea,
    );

    if (this.textarea.validity.valid) {
      this.deleteUserInvalidState();
    }
  }

  private updateUserInvalidState(): void {
    if (!this.textarea?.validity) {
      return;
    }

    if (this.textarea.validity.valid) {
      this.deleteUserInvalidState();
    } else {
      this.addUserInvalidState();
    }
  }

  private addUserInvalidState(): void {
    (this.internals as { states?: CustomStateSet }).states?.add('user-invalid');
  }

  private deleteUserInvalidState(): void {
    (this.internals as { states?: CustomStateSet }).states?.delete('user-invalid');
  }

  private syncDisabledFocus(): void {
    if (this.effectiveDisabled && this.host.shadowRoot?.activeElement === this.textarea) {
      this.textarea?.blur();
    }
  }

  render() {
    const optionalTextareaAttributes = {
      ...(this.placeholder === undefined ? {} : { placeholder: this.placeholder }),
      ...(this.autocomplete === undefined ? {} : { autocomplete: this.autocomplete }),
    };

    return (
      <div class="root">
        <label part="label" htmlFor={this.controlId}>
          {this.label}
        </label>
        <div part="field">
          <textarea
            ref={(el) => {
              this.textarea = el;
            }}
            part="textarea"
            id={this.controlId}
            value={this.value}
            rows={this.normalizedRows}
            required={this.required}
            readOnly={this.readonly}
            disabled={this.effectiveDisabled}
            onInput={this.handleInput}
            onChange={this.handleChange}
            {...optionalTextareaAttributes}
          />
        </div>
      </div>
    );
  }
}
