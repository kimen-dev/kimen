type FileMetadata = Pick<File, 'name' | 'type' | 'size'>;
export type FileRejection = 'type' | 'size' | 'count';

interface FileBatchOptions {
  accept?: string | undefined;
  maxSize?: string | undefined;
  maxFiles?: number | undefined;
  multiple?: boolean;
  selectedCount: number;
}

export const parseMaxSize: (maxSize?: string) => number | undefined = () => undefined;

export const acceptsFile: (file: Pick<FileMetadata, 'name' | 'type'>, accept?: string) => boolean =
  () => true;

export const validateFileBatch: <T extends FileMetadata>(
  files: readonly T[],
  options: FileBatchOptions,
) => { file: T; rejection?: FileRejection }[] = (files) => files.map((file) => ({ file }));
