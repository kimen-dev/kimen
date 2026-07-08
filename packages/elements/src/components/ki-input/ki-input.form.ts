export type KiInputType = 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';

const KI_INPUT_TYPES = new Set<string>(['text', 'email', 'password', 'url', 'tel', 'search']);

export function normalizeKiInputType(type: string | undefined): KiInputType {
  return KI_INPUT_TYPES.has(type ?? '') ? (type as KiInputType) : 'text';
}
