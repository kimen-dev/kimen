/** Read direct text without rendering or including authored elements in the description. */
export function readRichTooltipText(
  nodes: Iterable<Pick<Node, 'nodeName' | 'textContent'>>,
): string {
  return Array.from(nodes)
    .filter((node) => node.nodeName === '#text')
    .map((node) => node.textContent)
    .join('')
    .replace(/[\t\n\f\r ]+/gu, ' ')
    .trim();
}
