export function ratingMax(max: number): number {
  return max;
}

export function ratingStep(precision: number): number {
  return precision;
}

export function ratingValue(...parameters: [value: number, max: number, step: number]): number {
  return parameters[0];
}
