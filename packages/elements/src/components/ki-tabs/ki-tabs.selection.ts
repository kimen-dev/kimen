export interface TabRecord {
  value: string;
  disabled: boolean;
  duplicate: boolean;
}

export interface PanelRecord {
  value: string;
}

export interface PairingRecord {
  value: string;
  tabIndex: number | null;
  panelIndex: number | null;
}

export function isBooleanAttributePresent(value: string | boolean | null | undefined): boolean {
  return value !== null && value !== undefined && value !== false;
}

export function buildPairing(tabs: TabRecord[], panels: PanelRecord[]): PairingRecord[] {
  const records = new Map<string, PairingRecord>();

  tabs.forEach((tab, tabIndex) => {
    if (tab.duplicate || records.get(tab.value)?.tabIndex !== undefined) {
      return;
    }

    records.set(tab.value, {
      value: tab.value,
      tabIndex,
      panelIndex: null,
    });
  });

  panels.forEach((panel, panelIndex) => {
    const existing = records.get(panel.value);

    if (existing) {
      existing.panelIndex ??= panelIndex;
      return;
    }

    records.set(panel.value, {
      value: panel.value,
      tabIndex: null,
      panelIndex,
    });
  });

  return [...records.values()];
}

export function resolveSelection(tabs: TabRecord[], requestedValue?: string): number | null {
  const requested = requestedValue ?? '';
  const requestedIndex = tabs.findIndex(
    (tab) => tab.value === requested && !tab.disabled && !tab.duplicate,
  );

  if (requestedIndex >= 0) {
    return requestedIndex;
  }

  const fallbackIndex = tabs.findIndex((tab) => !tab.disabled && !tab.duplicate);
  return fallbackIndex >= 0 ? fallbackIndex : null;
}
