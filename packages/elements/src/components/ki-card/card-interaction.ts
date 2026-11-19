const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingTag = (typeof headingTags)[number];

export interface CardTitle { tag: HeadingTag; text: string }

export function getCardHref(href: string | undefined): string | undefined {
  const destination = href?.trim();
  return destination === '' ? undefined : destination;
}

export function getCardTitle(
  tag: string | undefined,
  text: string | null | undefined,
): CardTitle | undefined {
  const heading = headingTags.find((headingTag) => headingTag === tag);
  const title = text?.trim();
  return heading && title ? { tag: heading, text: title } : undefined;
}
