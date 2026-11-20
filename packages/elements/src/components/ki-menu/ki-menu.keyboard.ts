import type { NavigationIntent } from '../../utils/keyboard-intent';
import type { KiMenuItem } from '../ki-menu-item/ki-menu-item';

export type MenuItem = HTMLElement & Pick<KiMenuItem, 'value' | 'type' | 'checked' | 'disabled'>;

const itemTag = ['ki', 'menu', 'item'].join('-');
const groupTag = ['ki', 'menu', 'group'].join('-');
const dividerTag = ['ki', 'divider'].join('-');

export function menuNavigationIndex(
  intent: NavigationIntent,
  current: number,
  count: number,
): number {
  if (!count) return -1;
  if (intent === 'first') return 0;
  if (intent === 'last' || (intent === 'previous' && current < 0)) return count - 1;
  return (current + (intent === 'next' ? 1 : -1) + count) % count;
}

export function menuItemMatches(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

export function menuItemLabel(item: HTMLElement): string {
  return [...item.childNodes]
    .filter((node) => !(node instanceof Element && node.getAttribute('slot')))
    .map((node) => node.textContent)
    .join('')
    .trim();
}

export function collectMenuItems(
  host: HTMLElement,
  query: string,
): {
  items: MenuItem[];
  hidden: Set<HTMLElement>;
  separators: Set<HTMLElement>;
} {
  const items: MenuItem[] = [];
  const hidden = new Set<HTMLElement>();
  const separators = new Set<HTMLElement>();
  const filtering = Boolean(query.trim());

  function collect(container: HTMLElement): void {
    let hasAction = false;
    let pendingDivider: HTMLElement | undefined;

    for (const child of container.children) {
      if (!(child instanceof HTMLElement) || child.hidden || child.slot) continue;
      if (child.localName === dividerTag) {
        separators.add(child);
        if (filtering) {
          hidden.add(child);
          if (hasAction) pendingDivider = child;
        }
        continue;
      }

      const before = items.length;
      if (child.localName === itemTag && menuItemMatches(menuItemLabel(child), query)) {
        items.push(child as MenuItem);
      } else if (child.localName === groupTag && container === host) {
        collect(child);
      } else if (child.localName !== itemTag) {
        continue;
      }

      if (filtering && before === items.length) {
        hidden.add(child);
      } else {
        hasAction = items.length > before || hasAction;
        if (pendingDivider) hidden.delete(pendingDivider);
        pendingDivider = undefined;
      }
    }
  }

  collect(host);
  return { items, hidden, separators };
}
