export function headingLevel(depth: number, offset?: number): number {
  throw new Error(`Markdown heading mapping is missing for ${String(depth)} and ${String(offset)}`);
}

export function parseMarkdown(source: string, streaming: boolean): unknown {
  throw new Error(
    `Markdown parsing is missing for ${String(source.length)} characters (streaming: ${String(streaming)})`,
  );
}

export function markdownDestination(
  source: string,
  base: URL | string,
  documentOrigin: string,
  allowedOrigins?: readonly string[],
): unknown {
  throw new Error(
    `Markdown URL handling is missing for ${source} at ${base.toString()} (${documentOrigin}, ${String(allowedOrigins?.length ?? 0)} origins)`,
  );
}
