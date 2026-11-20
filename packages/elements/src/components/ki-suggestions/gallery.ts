import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `<ki-suggestions label="Start a conversation" variant="cards">
    <ki-suggestion description="From the on-call reports">Summarise the incidents</ki-suggestion>
    <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
  </ki-suggestions>
  <ki-suggestions label="Follow-up suggestions">
    <ki-suggestion>Which ones recur?</ki-suggestion>
    <ki-suggestion>Group them by service</ki-suggestion>
    <ki-suggestion>Turn this into a table</ki-suggestion>
  </ki-suggestions>
  <ki-suggestions label="Follow-up suggestions in right-to-left order" dir="rtl">
    <ki-suggestion>Show me more</ki-suggestion>
    <ki-suggestion>Summarise the answer</ki-suggestion>
  </ki-suggestions>`,
} satisfies VisualGallery;
