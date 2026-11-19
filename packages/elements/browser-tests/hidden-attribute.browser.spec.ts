// `hidden` contract (Art. III: the reproduction IS a failing test).
//
// The HTML `hidden` attribute is how a page — and every framework, router
// and agent-written template — says "not now" about any element. The browser
// honours it from its own stylesheet (`[hidden] { display: none }`), which is
// the weakest origin there is: a component whose shadow stylesheet declares
// `:host { display: block }` overrides it without ever mentioning it, and the
// element the author hid is on screen, in the tab order and in the
// accessibility tree. Each stylesheet that sets `display` on its host has to
// hand the attribute back with `:host([hidden]) { display: none }`.
//
// One assertion per shipped tag, read after the component's own stylesheet
// has been adopted: before that moment the browser's rule is still the only
// one in play, and every tag would pass for a reason that is not the
// component's doing.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { componentTags, defineAllComponents } from './all-components';

const STYLES_ADOPTED_DEADLINE_MS = 2000;

beforeAll(() => {
  defineAllComponents();
});

afterEach(() => {
  document.body.replaceChildren();
});

/** Mounts `<tag hidden>` and resolves once its own stylesheet is in effect. */
async function mountHidden(tag: string): Promise<HTMLElement> {
  const host = document.createElement(tag);
  host.hidden = true;
  document.body.append(host);
  await customElements.whenDefined(tag);
  await expect
    .poll(
      () => {
        if (host.shadowRoot) return host.shadowRoot.adoptedStyleSheets.length > 0;
        // Stencil adds the scope class after attaching the light-DOM styles.
        return host.classList.contains(`sc-${tag}-h`);
      },
      {
        message: `${tag} never attached its stylesheet, so its hidden rule was not measured`,
        timeout: STYLES_ADOPTED_DEADLINE_MS,
      },
    )
    .toBe(true);
  return host;
}

describe('hidden attribute', () => {
  it.each(componentTags)('%s stays out of the page while hidden', async (tag) => {
    const host = await mountHidden(tag);

    expect(
      getComputedStyle(host).display,
      `<${tag} hidden> is rendered: its :host display overrides the attribute`,
    ).toBe('none');
  });
});
