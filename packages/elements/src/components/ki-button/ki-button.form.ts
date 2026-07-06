type NormalizedKiButtonType = 'submit' | 'reset' | 'button';

export function normalizeKiButtonType(type: string | undefined): NormalizedKiButtonType {
  if (type === 'button' || type === 'reset') {
    return type;
  }

  return 'submit';
}
