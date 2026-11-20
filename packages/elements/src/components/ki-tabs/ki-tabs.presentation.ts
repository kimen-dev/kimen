export type KiTabsVariant = 'primary' | 'secondary';
export type KiTabsIconLayout = 'stacked' | 'inline';

export function resolveIconLayout(
  variant: KiTabsVariant,
  layout: string | undefined,
): KiTabsIconLayout {
  if (layout === 'stacked' || layout === 'inline') {
    return layout;
  }
  return variant === 'secondary' ? 'inline' : 'stacked';
}
