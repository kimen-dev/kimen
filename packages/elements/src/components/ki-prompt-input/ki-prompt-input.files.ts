type RejectionReason = 'type' | 'size' | 'count';

interface AttachmentSelection {
  accepted: File[];
  rejected: { file: File; reason: RejectionReason }[];
}

type SubmitKeys = Pick<
  KeyboardEvent,
  'key' | 'keyCode' | 'isComposing' | 'repeat' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
>;

export const acceptsFile: (file: File, accept: string) => boolean = () => {
  throw new Error('Attachment validation is pending');
};

export const selectAttachments: (
  files: readonly File[],
  accept: string,
  existingCount: number,
  maxFiles?: number,
  maxSize?: number,
) => AttachmentSelection = () => {
  throw new Error('Batch attachment validation is pending');
};

export const shouldSubmit: (event: SubmitKeys, mode: 'enter' | 'mod-enter') => boolean = () => {
  throw new Error('Submit shortcuts are pending');
};
