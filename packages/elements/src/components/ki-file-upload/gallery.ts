import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';
import type { KiFileUpload } from './ki-file-upload';

export default {
  width: 384,
  html: `
    <ki-file-upload label="Incident attachments" help-text="CSV or PDF, up to 10 MB each."
      accept=".csv,.pdf" max-size="10MB" multiple required></ki-file-upload>
    <ki-file-upload label="Archived attachments" dir="rtl" disabled></ki-file-upload>
  `,
  async prepare(wrapper) {
    const upload = wrapper.querySelector<HTMLElement & Pick<KiFileUpload, 'files'>>(
      'ki-file-upload',
    );
    if (!upload) throw new Error('Missing file upload in the visual gallery');

    upload.files = [
      { name: 'incidents-q3.csv', size: 1_900_000, status: 'uploading', progress: 62 },
      { name: 'runbook.pdf', size: 420_000, status: 'done' },
      { name: 'notes.csv', size: 12_000, status: 'queued' },
      {
        name: 'screen-recording.mov',
        size: 3_800_000,
        status: 'error',
        error: 'Choose a CSV or PDF file.',
      },
    ];
    await settleFrames(2);
  },
} satisfies VisualGallery;
