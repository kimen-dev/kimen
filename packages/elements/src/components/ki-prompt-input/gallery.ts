import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 392,
  html: [
    '<ki-prompt-input label="Message Kimen Assistant" placeholder="Ask anything, or drop a file" accept=".csv"></ki-prompt-input>',
    '<ki-prompt-input data-gallery-draft label="Draft with attachments" accept=".csv" value="Summarise the incidents and flag recurring ones."><ki-button slot="tools" variant="ghost" size="sm">Model: Standard</ki-button></ki-prompt-input>',
    '<ki-prompt-input label="Next message" accept=".csv" status="streaming" placeholder="Prepare your next message"></ki-prompt-input>',
    '<ki-prompt-input label="Right-to-left draft" value="Review the report" accept=".csv" dir="rtl"></ki-prompt-input>',
    '<ki-prompt-input label="Unavailable composer" placeholder="Message assistant" disabled></ki-prompt-input>',
  ].join(''),
  prepare: async (wrapper) => {
    const draft = wrapper.querySelector('[data-gallery-draft]');
    const field = draft?.shadowRoot?.querySelector('[part=field]');
    if (!field) throw new Error('PromptInput gallery is missing the draft field');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(['id,status\n1,open'], 'incidents-q3.csv', { type: 'text/csv' }),
    );
    dataTransfer.items.add(new File(['image'], 'photo.png', { type: 'image/png' }));
    field.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    await settleFrames(3);
  },
} satisfies VisualGallery;
