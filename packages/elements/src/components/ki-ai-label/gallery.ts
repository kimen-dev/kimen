import { row, settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  minHeight: 320,
  html: [
    row('<ki-ai-label></ki-ai-label><ki-ai-label size="md"></ki-ai-label>'),
    '<ki-input label="Subject" value="Incident summary"><ki-ai-label slot="end"></ki-ai-label></ki-input>',
    row(
      '<ki-ai-label explanation="Written from the incident reports of the last 30 days." model="Standard" generated-at="2026-11-19T10:32" revertible></ki-ai-label>',
    ),
  ].join(''),
  async prepare(wrapper) {
    const label = wrapper.querySelector('ki-ai-label[revertible]');
    const trigger = label?.shadowRoot?.querySelector('button');
    if (!trigger) {
      throw new Error('The AI provenance gallery is missing its disclosure button');
    }
    trigger.click();
    label?.shadowRoot?.querySelector<HTMLElement>('[part="popover"]')?.blur();
    await settleFrames(2);
  },
} satisfies VisualGallery;
