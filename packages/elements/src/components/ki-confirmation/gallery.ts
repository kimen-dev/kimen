import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `<style>
    .confirmation-gallery {
      display: grid;
      align-items: start;
      gap: var(--ki-space-md);
    }
    @media (min-width: 600px) {
      .confirmation-gallery {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
  <section class="confirmation-gallery">
    <ki-confirmation heading="Send this email?" action="send_email"
      approve-label="Send email" deny-label="Keep draft"
      consequence="Recipients will get the message immediately." remember>
      <dl><dt>To</dt><dd>Ana Rivera</dd><dt>Subject</dt><dd>Weekly report</dd></dl>
    </ki-confirmation>
    <ki-confirmation dir="rtl" heading="Delete this draft?" action="delete_draft"
      approve-label="Delete draft" deny-label="Keep draft" tone="danger"
      consequence="This permanently removes the draft and its attachments."></ki-confirmation>
    <ki-confirmation heading="Send this email?" action="send_email" approve-label="Send email"
      deny-label="Keep draft" state="approved" resolved-by="You" resolved-at="10:32"></ki-confirmation>
    <ki-confirmation heading="Delete this draft?" action="delete_draft" approve-label="Delete draft"
      deny-label="Keep draft" state="denied" resolved-by="You" resolved-at="10:36"></ki-confirmation>
    <ki-confirmation heading="Publish this draft?" action="publish_draft" approve-label="Publish draft"
      deny-label="Keep draft" state="expired" resolved-by="Session" resolved-at="10:45"></ki-confirmation>
  </section>`,
  // The audit mounts the capture-width wrapper in a narrower viewport.
  prepare(wrapper) {
    wrapper.style.maxInlineSize = '100%';
    return Promise.resolve();
  },
} satisfies VisualGallery;
