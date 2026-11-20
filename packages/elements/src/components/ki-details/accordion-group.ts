interface DisclosureMember {
  name: () => string | undefined;
  isOpen: () => boolean;
  close: (initializing: boolean) => void;
}

const accordions = new WeakMap<Element, boolean>();
const members = new WeakMap<Element, DisclosureMember>();

function* peers(host: HTMLElement): Iterable<DisclosureMember> {
  const parent = host.parentElement;
  if (parent && accordions.get(parent)) {
    for (const child of parent.children) {
      const peer = members.get(child);
      if (child !== host && peer) yield peer;
    }
  }

  const name = members.get(host)?.name();
  const root = host.getRootNode();
  const shadowRoot = root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && 'host' in root;
  if (!name || (root.nodeType !== Node.DOCUMENT_NODE && !shadowRoot)) return;
  for (const element of (root as Document | ShadowRoot).querySelectorAll(host.localName)) {
    const peer = members.get(element);
    if (element !== host && peer?.name() === name) yield peer;
  }
}

export function reconcileDisclosure(host: HTMLElement, initializing = false): void {
  const member = members.get(host);
  if (!member?.isOpen()) return;
  for (const peer of peers(host)) {
    if (peer.isOpen()) {
      member.close(initializing);
      return;
    }
  }
}

export function connectDisclosure(
  host: HTMLElement,
  member: DisclosureMember,
  initializing: boolean,
): void {
  members.set(host, member);
  const parent = host.parentElement;
  host.toggleAttribute('data-ki-accordion-member', parent !== null && accordions.has(parent));
  reconcileDisclosure(host, initializing);
}

export function closeDisclosurePeers(host: HTMLElement): void {
  for (const peer of peers(host)) {
    if (peer.isOpen()) peer.close(false);
  }
}

export function syncAccordion(host: HTMLElement, exclusive: boolean, initializing = false): void {
  accordions.set(host, exclusive);
  let keptOpen = false;
  for (const child of host.children) {
    const member = members.get(child);
    if (!member) continue;

    child.setAttribute('data-ki-accordion-member', '');
    if (!exclusive || !member.isOpen()) continue;
    if (keptOpen) member.close(initializing);
    keptOpen = true;
  }
}
