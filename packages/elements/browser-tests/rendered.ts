// Waiting for Kimen elements through the platform alone. A spec that waited
// on a framework's own readiness hook (Stencil's componentOnReady, Lit's
// updateComplete) would test the framework, not the contract, and break on
// the day the components change compiler. Both the per-component modules and
// Kimen's loader register the same standard custom elements.

const SETTLE_DEADLINE_MS = 2000;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** Every `ki-*` element under `root`, `root` included, descending into open shadow roots. */
function kimenElements(root: Element): Element[] {
  const found: Element[] = [];
  const walk = (node: Element): void => {
    if (node.localName.startsWith('ki-')) found.push(node);
    for (const child of node.shadowRoot?.children ?? []) walk(child);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return found;
}

/** What every Kimen element in the tree has rendered so far. */
function renderedState(root: Element): string {
  return kimenElements(root)
    .map((element) => `${element.localName}:${element.shadowRoot?.innerHTML ?? ''}`)
    .join('\n');
}

/**
 * Resolve once every Kimen element under `root` is defined and has rendered.
 *
 * Definition alone is not enough: an element can be defined while its shadow
 * root is still empty. Some components legitimately render nothing (an icon
 * with no name), so an empty shadow root cannot mean "not yet". The render
 * counts as settled once the shadow trees stay the same across two frames,
 * or once the deadline passes.
 */
export async function whenRendered(root: Element): Promise<void> {
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  let tags = new Set<string>();
  let previous: string | undefined;
  for (;;) {
    const current = new Set(kimenElements(root).map((element) => element.localName));
    if ([...current].some((tag) => !tags.has(tag))) {
      tags = current;
      await Promise.all([...tags].map((tag) => customElements.whenDefined(tag)));
    }
    await nextFrame();
    const state = renderedState(root);
    if (state === previous || Date.now() >= deadline) return;
    previous = state;
  }
}
