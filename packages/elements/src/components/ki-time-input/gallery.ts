import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  minHeight: 580,
  html: [
    // The popup can flip in the block direction without covering another field.
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ki-layout-spacing-xl);align-items:start">',
    '<div style="display:grid;gap:var(--ki-layout-spacing-xl);justify-items:start">',
    '<ki-time-input label="Start time" required lang="en-GB"></ki-time-input>',
    '<ki-time-input label="Office opens" value="09:17" lang="en-US" help-text="Office time" time-zone="America/New_York"></ki-time-input>',
    '<ki-time-input label="Locked time" disabled value="18:00" lang="en-GB"></ki-time-input>',
    '<ki-time-input data-invalid-example label="Closing time" lang="en-GB" max="18:00" error-text="Choose a time at or before 18:00."></ki-time-input>',
    '<ki-time-input dir="rtl" label="Reminder" lang="en-GB" value="14:00" style="inline-size:8rem"></ki-time-input>',
    '</div>',
    '<ki-time-input data-open-example label="Departure" value="09:30" min="09:00" max="10:00" lang="en-GB"></ki-time-input>',
    '</div>',
  ].join(''),
  prepare: async (wrapper) => {
    const invalidInput = wrapper
      .querySelector('[data-invalid-example]')
      ?.shadowRoot?.querySelector<HTMLInputElement>('[part="input"]');
    if (invalidInput) {
      invalidInput.focus();
      invalidInput.value = '19:00';
      invalidInput.dispatchEvent(new Event('input', { bubbles: true }));
      invalidInput.blur();
    }

    const shadow = wrapper.querySelector('[data-open-example]')?.shadowRoot;
    const openInput = shadow?.querySelector<HTMLInputElement>('[part="input"]');
    if (openInput) openInput.style.caretColor = 'transparent';
    shadow?.querySelector<HTMLButtonElement>('[part="trigger"]')?.click();
    await settleFrames(2);
  },
} satisfies VisualGallery;
