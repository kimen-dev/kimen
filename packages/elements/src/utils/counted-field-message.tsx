import { type FunctionalComponent, h } from '@stencil/core';
import { countText, normalizeLengthLimit } from './field-count';
import { FieldMessage, type FieldMessageState, fieldDescribedBy } from './field-message';

const countId = 'character-count';

export function countedFieldDescription(
  messages: FieldMessageState,
  countLimit: number | undefined,
): string | undefined {
  const description = fieldDescribedBy(messages);
  if (countLimit === undefined) return description;
  return description === undefined ? countId : `${description} ${countId}`;
}

/** Update a constraint immediately so a form submission in the same task sees it. */
export function applyFieldLengthLimit(
  control: HTMLInputElement | HTMLTextAreaElement,
  attribute: 'maxlength' | 'minlength',
  limit: number | undefined,
): void {
  const normalized = normalizeLengthLimit(limit);
  if (normalized === undefined) {
    control.removeAttribute(attribute);
  } else {
    control.setAttribute(attribute, String(normalized));
  }
}

interface CountedFieldMessageState extends FieldMessageState {
  readonly length: number;
  readonly limit: number | undefined;
  readonly announcement: string;
}

export const CountedFieldMessage: FunctionalComponent<CountedFieldMessageState> = ({
  help,
  error,
  length,
  limit,
  announcement,
}) => (
  <div class={{ 'field-feedback': true, 'has-count': limit !== undefined }}>
    <FieldMessage help={help} error={error} />
    {limit === undefined
      ? null
      : [
          <span id={countId} part="count" data-over={length > limit ? '' : undefined}>
            <bdi dir="ltr">{countText(length, limit)}</bdi>
          </span>,
          <span
            dir="ltr"
            class="count-announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </span>,
        ]}
  </div>
);
