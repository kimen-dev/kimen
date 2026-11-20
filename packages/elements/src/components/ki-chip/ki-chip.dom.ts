const CHIP_TAG = ['ki', 'chip'].join('-');
const GROUP_TAG = ['ki', 'chip-group'].join('-');

export type KiChipType = 'filter' | 'input' | 'assist';

export function chipType(value: unknown): KiChipType {
  return value === 'input' || value === 'assist' ? value : 'filter';
}

export function parentChipGroup(chip: HTMLElement): HTMLElement | null {
  const parent = chip.parentElement;
  return parent?.localName === GROUP_TAG ? parent : null;
}

export function isChip(element: EventTarget | null): element is HTMLElement {
  return element instanceof HTMLElement && element.localName === CHIP_TAG;
}

export function chipControl(chip: HTMLElement): HTMLElement | null {
  if (chip.hidden || chip.hasAttribute('disabled')) {
    return null;
  }
  return (
    chip.shadowRoot?.querySelector<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? null
  );
}
