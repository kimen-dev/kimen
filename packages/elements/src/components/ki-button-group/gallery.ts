import '../../../icons/bold.js';
import '../../../icons/chevron-down.js';
import '../../../icons/italic.js';
import '../../../icons/list.js';
import '../../../icons/underline.js';

import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const historyButtons =
  '<ki-button type="button">Undo</ki-button><ki-button type="button">Redo</ki-button>';

const splitActions =
  '<ki-button type="button" variant="primary">Save</ki-button>' +
  '<ki-tooltip label="More save options"><ki-icon-button label="More save options" aria-haspopup="menu">' +
  '<ki-icon name="chevron-down"></ki-icon></ki-icon-button></ki-tooltip>';

const toolbarButton = (label: string, icon: string, attributes = ''): string =>
  `<ki-tooltip label="${label}"><ki-icon-button label="${label}" variant="ghost"${attributes}>` +
  `<ki-icon name="${icon}"></ki-icon></ki-icon-button></ki-tooltip>`;

export default {
  focusFirst: true,
  html: [
    row(
      `<ki-button-group label="History">${historyButtons}</ki-button-group>` +
        `<ki-button-group label="Attached history" attached>${historyButtons}</ki-button-group>` +
        `<ki-button-group label="Save actions" attached>${splitActions}</ki-button-group>`,
    ),
    row(
      '<ki-button-group label="Formatting" toolbar size="sm">' +
        toolbarButton('Bold', 'bold', ' pressed="true"') +
        toolbarButton('Italic', 'italic', ' pressed="false"') +
        toolbarButton('Underline', 'underline', ' disabled') +
        '<span role="separator" aria-orientation="vertical"></span>' +
        toolbarButton('Bulleted list', 'list') +
        '</ki-button-group>',
    ),
    row(
      `<ki-button-group label="RTL history" attached dir="rtl">${historyButtons}</ki-button-group>` +
        '<div data-ki-density="touch">' +
        `<ki-button-group label="Touch save actions" attached size="xs">${splitActions}</ki-button-group>` +
        '</div>',
    ),
  ].join(''),
} satisfies VisualGallery;
