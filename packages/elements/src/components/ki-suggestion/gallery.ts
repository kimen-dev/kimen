import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `<ki-suggestions label="Follow-up suggestions">
    <ki-suggestion>Show the source</ki-suggestion>
  </ki-suggestions>
  <ki-suggestions label="Start a conversation" variant="cards">
    <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
    <ki-suggestion>Plan the next release</ki-suggestion>
  </ki-suggestions>`,
} satisfies VisualGallery;
