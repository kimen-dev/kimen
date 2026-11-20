/** Trim author-supplied provenance without parsing or reformatting it. */
export function provenanceText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}
