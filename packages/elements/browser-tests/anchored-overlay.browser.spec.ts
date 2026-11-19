import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnchoredOverlay, resolveOverlayAnchor } from '../src/utils/anchored-overlay';
import { anchoredOverlayPosition } from '../src/utils/anchored-overlay-layout';

let overlay: AnchoredOverlay;
let fixture: HTMLDivElement;

beforeEach(() => {
  overlay = new AnchoredOverlay();
  fixture = document.createElement('div');
  fixture.dir = 'ltr';
  fixture.style.cssText = 'position:fixed;inset-block-start:16px;inset-inline-start:16px';
  document.body.append(fixture);
});

afterEach(() => {
  overlay.hide();
  fixture.remove();
});

function mount(): { trigger: HTMLButtonElement; popup: HTMLDivElement } {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open';
  const popup = document.createElement('div');
  popup.setAttribute('popover', 'manual');
  popup.style.cssText = 'position:fixed;inset:auto;margin:0;inline-size:64px;block-size:24px';
  fixture.append(trigger, popup);
  return { trigger, popup };
}

function positionOf(element: HTMLElement) {
  const { left, top } = element.getBoundingClientRect();
  return { left, top };
}

function bottomStartOf(trigger: HTMLElement, gap: number) {
  const { bottom, left } = trigger.getBoundingClientRect();
  return { left, top: bottom + gap };
}

function pointerDown(element: HTMLElement): void {
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
}

describe('anchored overlay lifecycle', () => {
  it('keeps the measured popup aligned through ancestor scroll and a connected trigger move', async () => {
    const { trigger, popup } = mount();
    const scroller = document.createElement('div');
    scroller.style.cssText = 'overflow:auto;inline-size:120px;block-size:120px';
    const content = document.createElement('div');
    content.style.cssText = 'block-size:300px;padding-block-start:64px';
    const destination = document.createElement('div');
    destination.style.cssText = 'position:fixed;inset-block-start:48px;inset-inline-start:180px';
    scroller.append(content);
    content.append(trigger);
    fixture.append(scroller, destination);
    const gap = 6;

    overlay.show(popup, trigger, {
      position: anchoredOverlayPosition({ placement: 'bottom-start', offset: gap }),
    });

    expect(popup.matches(':popover-open')).toBe(true);
    expect(positionOf(popup)).toEqual(bottomStartOf(trigger, gap));

    scroller.scrollTop = 32;
    const scrolled = bottomStartOf(trigger, gap);
    await expect.poll(() => positionOf(popup)).toEqual(scrolled);

    destination.append(trigger);
    const moved = bottomStartOf(trigger, gap);
    await expect.poll(() => positionOf(popup)).toEqual(moved);
    expect(popup.matches(':popover-open')).toBe(true);
  });

  it('tracks a light-DOM trigger slotted into a shadow scroll container', async () => {
    const { trigger, popup } = mount();
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const scroller = document.createElement('div');
    scroller.style.cssText = 'overflow:auto;inline-size:120px;block-size:120px';
    const content = document.createElement('div');
    content.style.cssText = 'block-size:300px;padding-block-start:64px';
    content.append(document.createElement('slot'));
    scroller.append(content);
    root.append(scroller);
    host.append(trigger);
    fixture.append(host);

    overlay.show(popup, trigger, {
      position: anchoredOverlayPosition({ placement: 'bottom-start' }),
    });
    expect(positionOf(popup)).toEqual(bottomStartOf(trigger, 0));
    // Flush the initial ResizeObserver update before testing a scroll-only change.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    });

    scroller.scrollTop = 32;
    const scrolled = bottomStartOf(trigger, 0);
    await expect.poll(() => positionOf(popup)).toEqual(scrolled);
  });

  it.each([
    { anchorName: '--test-anchor', usesCss: true },
    { anchorName: '--missing-anchor', usesCss: false },
  ] as const)(
    'positions against the visible trigger with $anchorName',
    ({ anchorName, usesCss }) => {
      const { trigger, popup } = mount();
      fixture.style.transform = 'translate(34px, 46px)';
      trigger.style.setProperty('anchor-name', '--test-anchor');

      overlay.show(popup, trigger, {
        position: anchoredOverlayPosition({ placement: 'bottom-start', anchorName, offset: 5 }),
      });

      expect(popup.style.top.includes('anchor(')).toBe(usesCss);
      expect(positionOf(popup)).toEqual(bottomStartOf(trigger, 5));
    },
  );

  it('dismisses and hides a managed popup when the trigger leaves the document', async () => {
    const { trigger, popup } = mount();
    const reasons: string[] = [];
    overlay.show(popup, trigger, {
      position: anchoredOverlayPosition({ placement: 'bottom-start' }),
      onDismiss: (reason) => {
        reasons.push(reason);
        overlay.hide();
      },
    });

    trigger.remove();

    await expect.poll(() => reasons).toEqual(['disconnect']);
    expect(popup.matches(':popover-open')).toBe(false);
  });

  it('finds a trigger by its literal ID within the caller’s shadow root', () => {
    const id = 'actions:primary';
    const outerTrigger = document.createElement('button');
    outerTrigger.id = id;
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const localTrigger = document.createElement('button');
    localTrigger.id = id;
    const caller = document.createElement('div');
    root.append(localTrigger, caller);
    fixture.append(host, outerTrigger);

    expect(resolveOverlayAnchor(caller, id)).toBe(localTrigger);
  });

  it('dismisses on outside pointerdown and allows interactions with the trigger and popup', () => {
    const { trigger, popup } = mount();
    const outside = document.createElement('button');
    fixture.append(outside);
    const reasons: string[] = [];
    overlay.show(popup, trigger, {
      outsidePointer: true,
      onDismiss: (reason) => {
        reasons.push(reason);
        overlay.hide();
      },
    });

    pointerDown(trigger);
    pointerDown(popup);
    expect(popup.matches(':popover-open')).toBe(true);

    outside.focus();
    pointerDown(outside);
    expect(reasons).toEqual(['outside-pointer']);
    expect(popup.matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('returns focus to the trigger when the caller accepts Escape dismissal', () => {
    const { trigger, popup } = mount();
    const popupButton = document.createElement('button');
    popup.append(popupButton);
    const reasons: string[] = [];
    overlay.show(popup, trigger, {
      escape: 'bubble',
      onDismiss: (reason) => {
        reasons.push(reason);
        overlay.hide(true);
      },
    });
    popupButton.focus();
    expect(document.activeElement).toBe(popupButton);

    popupButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    expect(reasons).toEqual(['escape']);
    expect(popup.matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
