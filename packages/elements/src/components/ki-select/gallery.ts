import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const selectOptions = [
  '<ki-option value="es">Spain</ki-option>',
  '<ki-option value="fr">France</ki-option>',
  '<ki-option value="pt">Portugal</ki-option>',
].join('');

export default {
  focusFirst: true,
  html: [
    row(`<ki-select label="Country" placeholder="Choose a country">${selectOptions}</ki-select>`),
    row(`<ki-select label="Country" value="fr">${selectOptions}</ki-select>`),
    row(
      `<ki-select label="Required" required placeholder="Choose one">${selectOptions}</ki-select>`,
    ),
    row(`<ki-select label="Disabled" disabled value="es">${selectOptions}</ki-select>`),
  ].join(''),
} satisfies VisualGallery;
