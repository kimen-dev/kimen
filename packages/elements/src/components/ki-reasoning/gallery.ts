import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  focusFirst: true,
  html: [
    '<ki-reasoning><ol><li>Check the inputs.</li></ol></ki-reasoning>',
    '<ki-reasoning open><ol><li>Check the inputs.</li><li>Read the field rules.</li></ol></ki-reasoning>',
    '<ki-reasoning status="done" duration="12000"><ol><li>Compare the outcomes.</li></ol></ki-reasoning>',
    '<ki-reasoning status="done" duration="1000" open><ol><li>Compare the outcomes.</li></ol></ki-reasoning>',
    '<div dir="rtl" data-ki-density="touch">',
    '<ki-reasoning status="done" open><ol><li>Check the result.</li></ol></ki-reasoning>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
