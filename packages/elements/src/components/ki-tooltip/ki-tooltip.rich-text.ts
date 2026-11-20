export function readRichTooltipText(
  nodes: Iterable<Pick<Node, 'nodeName' | 'textContent'>>,
): string {
  return Array.from(nodes, (node) => node.textContent)
    .join('')
    .trim();
}
