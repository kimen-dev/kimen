import { resolveOverlayAnchor } from '../../utils/anchored-overlay';
import { trackOverlayPosition } from '../../utils/anchored-overlay-layout';

/** Follow an ID-linked trigger while keeping the indicator in its own stacking context. */
export function observeCounterAnchor(host: HTMLElement, id: string): (() => void) | undefined {
  const document = host.ownerDocument;
  const viewport = document.defaultView;
  if (!viewport) return undefined;

  let anchor: Element | null = null;
  let intersects = false;
  let stopTracking: (() => void) | undefined;
  const scope = host.getRootNode();

  const move = (): void => {
    if (!intersects || !anchor?.checkVisibility({ visibilityProperty: true })) {
      host.removeAttribute('data-anchor-positioned');
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const direction = viewport.getComputedStyle(anchor).direction;
    const rtl = direction === 'rtl';
    // Fixed insets use the layout viewport, which excludes classic scrollbars.
    const viewportWidth = document.documentElement.clientWidth;
    host.style.setProperty('--_counter-anchor-block', `${String(rect.top)}px`);
    host.style.setProperty(
      '--_counter-anchor-inline',
      `${String(rtl ? rect.left : viewportWidth - rect.right)}px`,
    );
    host.toggleAttribute('data-anchor-rtl', rtl);
    host.setAttribute('data-anchor-positioned', '');
  };

  // Edge contact can leave isIntersecting true at zero area. A positive
  // threshold also reports the transition from visible pixels to that edge.
  const visibility = new IntersectionObserver(
    (entries) => {
      const entry = entries.at(-1);
      if (entry?.target === anchor) {
        const { width, height } = entry.intersectionRect;
        intersects = width > 0 && height > 0;
        move();
      }
    },
    { threshold: Number.EPSILON },
  );

  const bind = (): void => {
    const next = resolveOverlayAnchor(host, id);
    const target = next === host || (next && host.contains(next)) ? null : next;
    if (target !== anchor) {
      stopTracking?.();
      visibility.disconnect();
      intersects = false;
      anchor = target;
      if (anchor) visibility.observe(anchor);
      stopTracking = anchor ? trackOverlayPosition(host, anchor, viewport, move, bind) : undefined;
    }
    move();
  };

  const tree = new MutationObserver((records) => {
    const needsUpdate = records.some(
      (record) =>
        record.type === 'childList' ||
        record.attributeName === 'id' ||
        record.target.contains(anchor),
    );
    if (needsUpdate) bind();
  });
  tree.observe(scope, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['id', 'dir', 'class', 'style', 'hidden'],
  });
  bind();

  return () => {
    anchor = null;
    tree.disconnect();
    visibility.disconnect();
    stopTracking?.();
    host.removeAttribute('data-anchor-positioned');
    host.removeAttribute('data-anchor-rtl');
    host.style.removeProperty('--_counter-anchor-block');
    host.style.removeProperty('--_counter-anchor-inline');
  };
}
