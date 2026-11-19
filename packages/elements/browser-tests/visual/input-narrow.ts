import { defineCustomElement as defineKiInput } from '../../dist/components/ki-input.js';
import { defineCustomElement as defineKiOption } from '../../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../../dist/components/ki-select.js';
import { defineCustomElement as defineKiTextarea } from '../../dist/components/ki-textarea.js';

export const narrowInputGallery = {
  name: 'ki-input-narrow',
  define: [defineKiInput, defineKiOption, defineKiSelect, defineKiTextarea],
  gallery: {
    width: 320,
    inlinePadding: 0,
    html: `
      <form style="display:grid;grid-template-columns:repeat(2,1fr);align-items:start;gap:8px">
        <ki-input name="time" label="Start time" value="09:30">
          <span slot="end" aria-hidden="true">AM</span>
        </ki-input>
        <ki-input name="date" label="Date" value="12 Nov 2026"></ki-input>
        <ki-select name="room" label="Room" value="studio">
          <ki-option value="studio">Studio</ki-option>
          <ki-option value="library">Library</ki-option>
        </ki-select>
        <ki-textarea name="notes" label="Notes" rows="2" value="Bring a pen"></ki-textarea>
      </form>
    `,
  },
};
