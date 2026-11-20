/** Read direct text without rendering or including authored elements in the description. */
export function readRichTooltipText(
  nodes: Iterable<Pick<Node, 'nodeName' | 'textContent'>>,
): string {
  let text = '';
  for (const node of nodes) {
    if (node.nodeName === '#text') text += node.textContent ?? '';
  }
  return text.replace(/[\t\n\f\r ]+/gu, ' ').trim();
}
