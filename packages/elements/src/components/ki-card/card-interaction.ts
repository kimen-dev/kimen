type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export interface CardTitle { tag: HeadingTag; text: string }

export const getCardHref: (href: string | undefined) => string | undefined = () => undefined;

export const getCardTitle: (
  tag: string | undefined,
  text: string | null | undefined,
) => CardTitle | undefined = () => undefined;
