import { type FunctionalComponent, h } from '@stencil/core';

// The label hint shared by every form control that takes one (spec 047): the
// application's own short text after the label, such as "(optional)",
// rendered INSIDE the label element so it joins the control's accessible name
// ("Email (optional)"). Nothing renders for an absent or blank hint, so the
// label and the name stay exactly as they were (FR-003, FR-008). The hint is
// text only: it never sets or implies `required` (D3).

export interface LabelHintProps {
  /** Trimmed hint text (see `fieldText`); '' for none. */
  readonly hint: string;
}

export const LabelHint: FunctionalComponent<LabelHintProps> = ({ hint }) =>
  hint === '' ? null : <span part="label-hint">{hint}</span>;
