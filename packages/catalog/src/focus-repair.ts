/**
 * Focus repair for the live surface (spec 155 FR-003). A batch that removes
 * or replaces the element holding keyboard focus leaves focus nowhere, and so
 * can a component reacting to the batch after it returns: a dialog that closes
 * hands focus to the page body a task later. Once the change has settled,
 * focus that is nowhere goes to the element the batch asked for. Focus that is
 * somewhere (inside the surface, in the host page, in a component still
 * closing) is never moved.
 */

/**
 * How many rendered frames a repair keeps watching: new components render and
 * closing ones hand focus back within a frame or two, and the margin covers a
 * slow frame. A repair that has not happened by then lapses.
 */
const SETTLE_FRAMES = 8;

export interface FocusRepair {
  /**
   * Gives focus to the element `target` returns once focus is nowhere, within
   * the next frames. A later request replaces this one; the person pressing a
   * key or a pointer first ends it.
   */
  request(target: () => Element | undefined): void;
}

/** Focus is nowhere when the page's active element is its body or nothing. */
function focusIsNowhere(doc: Document): boolean {
  const active = doc.activeElement;
  return active === null || active === doc.body || active === doc.documentElement;
}

/** Whether `element` or a node inside it holds focus, through open shadow roots. */
export function holdsFocus(element: Element): boolean {
  for (
    let active = element.ownerDocument.activeElement;
    active !== null;
    active = active.shadowRoot?.activeElement ?? null
  ) {
    if (element.contains(active)) {
      return true;
    }
  }
  return false;
}

export function createFocusRepair(doc: Document): FocusRepair {
  let end: (() => void) | undefined;
  return {
    request(target) {
      end?.();
      const view = doc.defaultView;
      if (view === null) {
        return;
      }
      let frame = 0;
      let handle = 0;
      const stop = (): void => {
        view.cancelAnimationFrame(handle);
        doc.removeEventListener('keydown', stop, true);
        doc.removeEventListener('pointerdown', stop, true);
      };
      const tick = (): void => {
        if (focusIsNowhere(doc)) {
          const element = target();
          if (element instanceof view.HTMLElement) {
            element.focus();
          }
          if (!focusIsNowhere(doc)) {
            stop();
            return;
          }
        }
        frame += 1;
        if (frame < SETTLE_FRAMES) {
          handle = view.requestAnimationFrame(tick);
        } else {
          stop();
        }
      };
      // What the person does next decides focus, not a pending repair.
      doc.addEventListener('keydown', stop, true);
      doc.addEventListener('pointerdown', stop, true);
      handle = view.requestAnimationFrame(tick);
      end = stop;
    },
  };
}
