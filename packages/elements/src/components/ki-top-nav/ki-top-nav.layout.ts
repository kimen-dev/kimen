// RED-phase scaffold. The corresponding layout behavior is defined by the tests.
export function appBarSize(size: string, behavior: string, scrolled: boolean): string {
  throw new Error(`Unimplemented app bar size: ${size}, ${behavior}, ${String(scrolled)}`);
}

export function hasCenteredTitle(
  size: string,
  align: string,
  compact: boolean,
  count: number,
): boolean {
  throw new Error(
    `Unimplemented title alignment: ${size}, ${align}, ${String(compact)}, ${String(count)}`,
  );
}

export function headingTag(level: number): string {
  throw new Error(`Unimplemented heading tag: ${String(level)}`);
}
