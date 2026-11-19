interface NumberCodec {
  display(value: number): string;
  edit(value: number): string;
  parse(text: string): number | undefined;
}

export function createNumberCodec(
  _locale?: string,
  _options?: Intl.NumberFormatOptions,
): NumberCodec {
  throw new Error('Number codec is pending implementation', { cause: { _locale, _options } });
}

export function readNumberFormat(_source: string | null): Intl.NumberFormatOptions | undefined {
  throw new Error('Number format parsing is pending implementation', { cause: _source });
}

export function stepNumber(
  _value: number | undefined,
  _step: number,
  _count: number,
  _min?: number,
  _max?: number,
): number {
  throw new Error('Number stepping is pending implementation', {
    cause: { _value, _step, _count, _min, _max },
  });
}
