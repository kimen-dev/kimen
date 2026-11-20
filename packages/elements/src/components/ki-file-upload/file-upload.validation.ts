type FileMetadata = Pick<File, 'name' | 'type' | 'size'>;
export type FileRejection = 'type' | 'size' | 'count';

interface FileBatchOptions {
  accept?: string | undefined;
  maxSize?: string | undefined;
  maxFiles?: number | undefined;
  multiple?: boolean;
  selectedCount: number;
}

const byteUnits = { b: 1, kb: 1_000, mb: 1_000_000, gb: 1_000_000_000 } as const;

export function parseMaxSize(maxSize?: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/.exec(maxSize?.trim().toLowerCase() ?? '');
  if (!match) return undefined;
  const unit = (match[2] ?? 'b') as keyof typeof byteUnits;
  const bytes = Number(match[1]) * byteUnits[unit];
  return Number.isFinite(bytes) ? bytes : undefined;
}

export function acceptsFile(file: Pick<FileMetadata, 'name' | 'type'>, accept?: string): boolean {
  const choices = accept
    ?.toLowerCase()
    .split(',')
    .map((choice) => choice.trim())
    .filter(Boolean);
  if (!choices?.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return choices.some((choice) => {
    if (choice.startsWith('.')) return name.endsWith(choice);
    if (choice.endsWith('/*')) return type.startsWith(choice.slice(0, -1));
    return type === choice;
  });
}

export function validateFileBatch<T extends FileMetadata>(
  files: readonly T[],
  { accept, maxSize, maxFiles, multiple, selectedCount }: FileBatchOptions,
): { file: T; rejection?: FileRejection }[] {
  const sizeLimit = parseMaxSize(maxSize);
  const configuredCount =
    maxFiles !== undefined && Number.isSafeInteger(maxFiles) && maxFiles >= 0 ? maxFiles : Infinity;
  let remaining = Math.min(configuredCount, multiple ? Infinity : 1) - selectedCount;
  return files.map((file) => {
    if (!acceptsFile(file, accept)) return { file, rejection: 'type' };
    if (sizeLimit !== undefined && file.size > sizeLimit) return { file, rejection: 'size' };
    if (remaining <= 0) return { file, rejection: 'count' };
    remaining -= 1;
    return { file };
  });
}
