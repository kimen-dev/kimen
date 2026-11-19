type AssignGroup = (name: string | undefined, initializing: boolean) => void;

const names = new WeakMap<object, string>();
const groups = new WeakMap<HTMLElement, string>();
const members = new WeakMap<Element, AssignGroup>();
let nextGroup = 0;

export function accordionName(accordion: object): string {
  let name = names.get(accordion);
  if (name === undefined) {
    name = `ki-accordion-${String(++nextGroup)}`;
    names.set(accordion, name);
  }
  return name;
}

export function connectDisclosure(
  host: HTMLElement,
  assignGroup: AssignGroup,
  initializing: boolean,
): void {
  members.set(host, assignGroup);
  const parent = host.parentElement;
  assignGroup(parent ? groups.get(parent) : undefined, initializing);
}

export function syncAccordion(host: HTMLElement, exclusive: boolean, initializing = false): void {
  // Empty marks a member of a visual group without enabling native exclusion.
  const name = exclusive ? accordionName(host) : '';
  groups.set(host, name);
  for (const child of host.children) members.get(child)?.(name, initializing);
}
