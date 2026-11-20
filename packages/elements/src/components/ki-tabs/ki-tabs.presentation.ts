export type KiTabsVariant = 'primary' | 'secondary';
export type KiTabsIconLayout = 'stacked' | 'inline';

export function resolveIconLayout(
  variant: KiTabsVariant,
  layout: string | undefined,
): KiTabsIconLayout {
  throw new Error(`Tab icon layout is not implemented: ${variant} ${layout ?? 'default'}`);
}
