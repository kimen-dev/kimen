import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiFileUpload } from './ki-file-upload';

type Args = Pick<
  KiFileUpload,
  'label' | 'helpText' | 'accept' | 'maxSize' | 'maxFiles' | 'multiple' | 'required' | 'disabled'
>;

const meta = {
  title: 'Elements/ki-file-upload',
  component: 'ki-file-upload',
  args: {
    label: 'Incident attachments',
    helpText: 'Choose up to three CSV or PDF files, up to 10 MB each.',
    accept: '.csv,.pdf',
    maxSize: '10MB',
    maxFiles: 3,
    multiple: true,
    required: false,
    disabled: false,
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => h('ki-file-upload', args),
};

export const UploadResults: Story = {
  render: (args) =>
    h('ki-file-upload', {
      ...args,
      files: [
        { name: 'incidents-q3.csv', size: 1_900_000, status: 'uploading', progress: 62 },
        { name: 'runbook.pdf', size: 420_000, status: 'done' },
        {
          name: 'screen-recording.mov',
          size: 3_800_000,
          status: 'error',
          error: 'Choose a CSV or PDF file.',
        },
      ] satisfies KiFileUpload['files'],
    }),
};

export const Disabled: Story = {
  args: { label: 'Archived attachments', helpText: '', disabled: true },
  render: (args) => h('ki-file-upload', args),
};
