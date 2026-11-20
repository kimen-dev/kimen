export type RejectionReason = 'type' | 'size' | 'count';

interface AttachmentSelection {
  accepted: File[];
  rejected: { file: File; reason: RejectionReason }[];
}

export type FileBatch = Iterable<File> & { readonly length: number };

interface FileTransferData {
  files: FileBatch;
  items: Iterable<Pick<DataTransferItem, 'getAsFile'>>;
}

type SubmitKeys = Pick<
  KeyboardEvent,
  'key' | 'isComposing' | 'repeat' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
> & { readonly keyCode: number };

export function acceptsFile(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  const type = file.type;
  return accept
    .toLowerCase()
    .split(',')
    .some((specifier) => {
      const rule = specifier.trim();
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
      return rule !== '' && type === rule;
    });
}

export function transferFiles({ files, items }: FileTransferData): FileBatch {
  return files.length
    ? files
    : Array.from(items, (item) => item.getAsFile()).filter((file) => !!file);
}

function limit(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : Number.POSITIVE_INFINITY;
}

export function selectAttachments(
  files: Iterable<File>,
  accept: string,
  existingCount: number,
  maxFiles?: number,
  maxSize?: number,
): AttachmentSelection {
  const countLimit = limit(maxFiles);
  const sizeLimit = limit(maxSize);
  const accepted: File[] = [];
  const rejected: AttachmentSelection['rejected'] = [];

  for (const file of files) {
    let reason: RejectionReason | undefined;
    if (!acceptsFile(file, accept)) reason = 'type';
    else if (file.size > sizeLimit) reason = 'size';
    else if (existingCount + accepted.length >= countLimit) reason = 'count';
    if (reason) rejected.push({ file, reason });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

export function shouldSubmit(event: SubmitKeys, mode: 'enter' | 'mod-enter'): boolean {
  // Safari can report the Enter that commits IME text as non-composing.
  if (
    event.key !== 'Enter' ||
    event.shiftKey ||
    event.altKey ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229
  ) {
    return false;
  }
  const modified = event.ctrlKey || event.metaKey;
  return mode === 'mod-enter' ? modified : !modified;
}
