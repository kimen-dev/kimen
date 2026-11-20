import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export const validationExample = [
  '# Field validation',
  '',
  'Give **clear errors** and keep `required` nearby. [Read the field guide](/guides/forms).',
  '',
  '- [x] Add a label',
  '- [ ] ~~Hide~~ Explain the error',
  '',
  '```ts',
  'const invalid = !field.value;',
  '```',
  '',
  '| Field | Required |',
  '| --- | --- |',
  '| Email | Yes |',
  '| Alias | No |',
  '',
  '> [!NOTE]',
  '> Use the same wording in the label and the error.',
].join('\n');

export default {
  width: 400,
  html: [
    `<ki-markdown>${validationExample}</ki-markdown>`,
    '<ki-markdown dir="rtl">> Place the error beside the field.</ki-markdown>',
  ].join(''),
} satisfies VisualGallery;
