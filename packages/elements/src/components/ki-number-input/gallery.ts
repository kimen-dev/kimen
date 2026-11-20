import { row, settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(
      '<ki-number-input label="Seats" name="seats" value="3" min="1" max="50" steppers></ki-number-input>',
    ),
    row(
      '<ki-number-input label="Timeout" value="30" unit="seconds" help-text="Time before stopping"></ki-number-input>',
    ),
    row(
      `<ki-number-input lang="en-US" label="Discount" value="0.125" format='{"style":"percent","maximumFractionDigits":1}'></ki-number-input>`,
    ),
    row(
      '<ki-number-input label="Minimum seats" value="1" min="1" max="50" steppers></ki-number-input>',
    ),
    row(
      '<ki-number-input label="Maximum seats" value="50" min="1" max="50" steppers></ki-number-input>',
    ),
    row('<ki-number-input label="Unavailable" value="10" steppers disabled></ki-number-input>'),
    row(
      '<form><ki-number-input label="Tickets" required error-text="Enter the number of tickets."></ki-number-input></form>',
    ),
    row(
      '<ki-number-input dir="rtl" label="Capacity" value="3" unit="seats" steppers></ki-number-input>',
    ),
  ].join(''),
  async prepare(wrapper) {
    wrapper.querySelector('form')?.checkValidity();
    await settleFrames(2);
  },
} satisfies VisualGallery;
