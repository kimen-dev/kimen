import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { isOutsideRect } from './ki-dialog.backdrop';
import { resolveEntryFocusTarget } from './ki-dialog.focus';

// @spec:012-ki-dialog
// mock-doc has no HTMLDialogElement/showModal/top-layer/backdrop/inertness.
// Keep this suite to closed-state anatomy, S5, and pure helper coverage.
describe('ki-dialog', () => {
  function shadow(root: HTMLElement): ShadowRoot {
    expect(root.shadowRoot).toBeInstanceOf(ShadowRoot);
    const shadowRoot = root.shadowRoot;
    if (!shadowRoot) {
      throw new Error('ki-dialog did not render a shadow root');
    }
    return shadowRoot;
  }

  function requireElement(root: ParentNode, selector: string): Element {
    const element = root.querySelector(selector);
    expect(element).not.toBeNull();
    if (!element) {
      throw new Error(`Expected ${selector} to render`);
    }
    return element;
  }

  it('S5 renders closed with default anatomy when unrecognized markup is present', async () => {
    const { root } = await render(
      h('ki-dialog', { variant: 'fullscreen' }, [
        h('p', null, 'Body'),
        h('button', { slot: 'footer' }, 'Cancel'),
      ]),
    );
    const shadowRoot = shadow(root);
    const dialog = requireElement(shadowRoot, 'dialog');

    expect(root.hasAttribute('open')).toBe(false);
    expect(root.getAttribute('variant')).toBe('fullscreen');
    expect(dialog.nodeName).toBe('DIALOG');
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(shadowRoot.querySelector('[part="dialog"]')).toBe(dialog);
    expect(requireElement(shadowRoot, '[part="body"] slot:not([name])').nodeName).toBe('SLOT');
    expect(requireElement(shadowRoot, '[part="footer"] slot[name="footer"]').nodeName).toBe('SLOT');
  });

  it('S5 renders h2 heading and aria-labelledby only for a non-empty heading', async () => {
    const withHeading = await render(h('ki-dialog', { heading: 'Delete account?' }));
    const withHeadingShadow = shadow(withHeading.root);
    const dialog = requireElement(withHeadingShadow, 'dialog');
    const heading = requireElement(withHeadingShadow, 'h2[part="heading"]');

    expect(dialog.nodeName).toBe('DIALOG');
    expect(heading.nodeName).toBe('H2');
    expect(heading.textContent).toBe('Delete account?');
    expect(heading.id).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);

    const withoutHeading = await render(h('ki-dialog', { heading: '' }));
    const withoutHeadingShadow = shadow(withoutHeading.root);
    const unnamedDialog = requireElement(withoutHeadingShadow, 'dialog');

    expect(unnamedDialog.nodeName).toBe('DIALOG');
    expect(withoutHeadingShadow.querySelector('[part="heading"]')).toBeNull();
    expect(unnamedDialog.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('S5 resolveEntryFocusTarget prefers slotted autofocus then first focusable then null', () => {
    const host = document.createElement('ki-dialog');
    const hidden = document.createElement('button');
    hidden.hidden = true;
    const disabled = document.createElement('button');
    disabled.disabled = true;
    const negativeTabindex = document.createElement('button');
    negativeTabindex.tabIndex = -1;
    const firstFocusable = document.createElement('button');
    const autofocus = document.createElement('button');
    autofocus.autofocus = true;
    host.append(hidden, disabled, negativeTabindex, firstFocusable, autofocus);

    expect(resolveEntryFocusTarget(host)).toBe(autofocus);
    autofocus.remove();
    expect(resolveEntryFocusTarget(host)).toBe(firstFocusable);
    firstFocusable.remove();
    expect(resolveEntryFocusTarget(host)).toBeNull();
  });

  it('S5 resolveEntryFocusTarget ignores non-focusable slotted content', () => {
    const host = document.createElement('ki-dialog');
    host.append(document.createElement('span'), document.createElement('div'));

    expect(resolveEntryFocusTarget(host)).toBeNull();
  });

  it('S5 isOutsideRect treats outside points as outside and boundary points as inside', () => {
    const rect = {
      bottom: 70,
      left: 10,
      right: 110,
      top: 20,
    } as DOMRectReadOnly;

    expect(isOutsideRect(9, 45, rect)).toBe(true);
    expect(isOutsideRect(111, 45, rect)).toBe(true);
    expect(isOutsideRect(40, 19, rect)).toBe(true);
    expect(isOutsideRect(40, 71, rect)).toBe(true);
    expect(isOutsideRect(10, 20, rect)).toBe(false);
    expect(isOutsideRect(110, 70, rect)).toBe(false);
    expect(isOutsideRect(60, 45, rect)).toBe(false);
  });
});
