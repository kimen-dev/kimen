import { type FunctionalComponent, h } from '@stencil/core';

// Help and error lines shared by every form control (spec 042). One line under
// the control: the help text, replaced by the error message while the control
// is user-invalid (D5). The element that carries the control's role points
// `aria-describedby` at whichever line is shown, never at a hidden or empty
// one, because Chromium keeps reading a referenced node even when it is
// hidden (D2, evidence E4).

/** Shadow-root ids of the two lines; ids are scoped per shadow root. */
export const fieldHelpId = 'help';
export const fieldErrorId = 'error';

/** Author text as shown: trimmed, and '' when absent or whitespace only. */
export function fieldText(text: string | null | undefined): string {
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * The control's validation message (D4): the application's own error, else
 * the author's `error-text`, else the browser's message for the failing
 * constraint.
 */
export function fieldValidationMessage(
  customError: string,
  errorText: string | null | undefined,
  browserMessage: string,
): string {
  if (customError !== '') {
    return customError;
  }
  return fieldText(errorText) || browserMessage;
}

export interface FieldMessageState {
  /** Trimmed help text; '' for none. */
  readonly help: string;
  /** The message the error line shows; '' while no error shows. */
  readonly error: string;
}

/** The IDREF the role-carrying element describes itself with, if any. */
export function fieldDescribedBy({ help, error }: FieldMessageState): string | undefined {
  if (error !== '') {
    return fieldErrorId;
  }
  return help === '' ? undefined : fieldHelpId;
}

/** `aria-invalid` of the role-carrying element (D6): true exactly while the error shows. */
export function fieldInvalid({ error }: FieldMessageState): 'false' | 'true' {
  return error === '' ? 'false' : 'true';
}

/**
 * The help line, when there is help and no error, and the error line. The
 * error line is ALWAYS rendered, empty while there is no error: it is a polite
 * live region, and a region created together with its text is not announced
 * (D6, WCAG 4.1.3). Its decorative glyph keeps the error distinct from help
 * without relying on color (D8, WCAG 1.4.1).
 */
export const FieldMessage: FunctionalComponent<FieldMessageState> = ({ help, error }) => [
  error === '' && help !== '' ? (
    <div id={fieldHelpId} part="help">
      {help}
    </div>
  ) : null,
  <div id={fieldErrorId} part="error" aria-live="polite" aria-atomic="true">
    {error === ''
      ? null
      : [
          <svg class="field-error-glyph" viewBox="0 0 18 16" aria-hidden="true">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M6 2a6 6 0 1 1 0 12A6 6 0 0 1 6 2Zm-.75 2.5v4.75h1.5V4.5h-1.5Zm0 5.75v1.5h1.5v-1.5h-1.5Z"
            />
          </svg>,
          <span>{error}</span>,
        ]}
  </div>,
];
