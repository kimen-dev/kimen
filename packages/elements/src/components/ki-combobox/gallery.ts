import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<div style="display:grid;gap:var(--ki-layout-spacing-xl)">',
    '<ki-combobox label="Labels" multiple allow-custom value=\'["bug","search"]\' ',
    'placeholder="Add a label" help-text="Type to add a new label."></ki-combobox>',
    '<ki-combobox label="Country" placeholder="Search countries" disabled></ki-combobox>',
    '<ki-combobox label="Assignee" placeholder="Search people" value="ana" data-show-results>',
    '<ki-option value="ana" description="ana@example.com">',
    '<ki-avatar slot="start" size="xs" initials="AR" label=""></ki-avatar>Ana Ruiz</ki-option>',
    '<ki-option value="anabel" description="anabel@example.com">',
    '<ki-avatar slot="start" size="xs" initials="AS" label=""></ki-avatar>Anabel Soto</ki-option>',
    '<ki-option value="juan" description="juan@example.com">',
    '<ki-avatar slot="start" size="xs" initials="JA" label=""></ki-avatar>Juan Anton</ki-option>',
    '</ki-combobox>',
    '</div>',
  ].join(''),
  width: 400,
  minHeight: 420,
  async prepare(wrapper) {
    const input = wrapper
      .querySelector('[data-show-results]')
      ?.shadowRoot?.querySelector<HTMLInputElement>('[part="input"]');
    if (!input) throw new Error('Combobox input did not render');
    input.value = 'An';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settleFrames(2);
  },
} satisfies VisualGallery;
