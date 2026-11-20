const ITEM_TAG = 'ki-tree-item';

export const CHILDREN_SLOT = 'children';

export function itemChildren(parent: HTMLElement): HTMLKiTreeItemElement[] {
  return [...parent.children].filter(
    (child): child is HTMLKiTreeItemElement => child.localName === ITEM_TAG,
  );
}

export function itemFlag(
  item: HTMLElement &
    Partial<Pick<HTMLKiTreeItemElement, 'disabled' | 'expanded' | 'lazy' | 'selected'>>,
  name: 'disabled' | 'expanded' | 'lazy' | 'selected',
): boolean {
  // The property reflects only when the item renders. An item a framework
  // just inserted can also still be an unupgraded custom element.
  return item[name] ?? item.hasAttribute(name);
}

export function itemLabel(item: HTMLKiTreeItemElement): string {
  return [...item.childNodes]
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE ||
        (node instanceof Element && node.localName !== ITEM_TAG && !node.hasAttribute('slot')),
    )
    .map((node) => node.textContent ?? '')
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
}
