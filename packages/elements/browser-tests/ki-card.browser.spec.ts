import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

// @spec:009-ki-card
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineButton } from '../dist/components/ki-button.js';
import { defineCustomElement } from '../dist/components/ki-card.js';
import { expectAccessible } from './axe';

const STYLE_ID = 'ki-card-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-card-browser-material3-token-style';

beforeAll(() => {
  defineButton();
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** The gated entrance animation (opacity/translate) and the hover-exit
 * transitions (box-shadow, media scale) run in this non-reduced instance:
 * wait them out so geometry and axe contrast reads are end-state
 * deterministic. NOT `document.body.getAnimations({subtree: true})`:
 * measured in this Chromium it returns nothing for an animation whose
 * target lives in a shadow root — only elements inside the shadow tree see
 * their own animations, so this walks every shadow root explicitly. */
async function settleMotion(): Promise<void> {
  const collect = (found: Set<Animation>, element: Element): void => {
    for (const animation of element.getAnimations({ subtree: true })) {
      found.add(animation);
    }
  };
  const deadline = Date.now() + 4000;
  for (;;) {
    const found = new Set<Animation>();
    collect(found, document.body);
    const walk = (node: ParentNode): void => {
      for (const element of node.querySelectorAll('*')) {
        const shadow = element.shadowRoot;
        if (shadow !== null) {
          for (const child of shadow.children) {
            collect(found, child);
          }
          walk(shadow);
        }
      }
    };
    walk(document.body);
    const running = [...found].filter(
      (animation) =>
        animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity,
    );
    if (running.length === 0 || Date.now() >= deadline) {
      return;
    }
    // Bounded wait: `finished` can stall forever when an animation sticks in
    // `running` (loaded-CI observation, issue #105); an unbounded await here
    // skips the deadline re-check. Race against the remaining budget.
    await Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - Date.now()))),
    ]);
    await nextFrame();
  }
}

async function mount(markup: string): Promise<HTMLElement> {
  ensureTokens();
  document.body.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.insertAdjacentHTML('beforeend', markup);
  const el = document.body.lastElementChild as HTMLElement;
  await customElements.whenDefined('ki-card');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  // The fidelity pass gave the card real :hover paint (e2 lift, media
  // scale). The pointer position persists across tests — the S5 click on the
  // footer button leaves it parked over where every later card mounts — so a
  // rest-state read taken without parking measures the hover state instead
  // (e2 shadow, 1.02-scaled media). Park at the page origin, give the
  // hover-exit transitions a frame to start, then settle all motion.
  await (commands as unknown as { resetPointer: () => Promise<void> }).resetPointer();
  await nextFrame();
  await nextFrame();
  await settleMotion();
  return el;
}

function cardPart(el: HTMLElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="card"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-card did not render a card part');
  }
  return part;
}

function regionPart(
  el: HTMLElement,
  partName: 'media' | 'header' | 'body' | 'footer',
): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>(`[part="${partName}"]`);
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error(`ki-card did not render ${partName} part`);
  }
  return part;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

function readTokenShadow(name: string): string {
  const probe = document.createElement('div');
  probe.style.boxShadow = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}

describe('ki-card in a real browser', () => {
  it('S1 presents media header body footer in visual reading order on a distinct surface', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <img slot="media" alt="" src="about:blank" style="display:block; inline-size: 10px; block-size: 10px;" />
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
        <button slot="footer" type="button">Download</button>
      </ki-card>
    `);
    const media = regionPart(el, 'media').getBoundingClientRect();
    const header = regionPart(el, 'header').getBoundingClientRect();
    const body = regionPart(el, 'body').getBoundingClientRect();
    const footer = regionPart(el, 'footer').getBoundingClientRect();
    const computed = getComputedStyle(cardPart(el));

    expect(media.top).toBeLessThanOrEqual(header.top);
    expect(header.top).toBeLessThanOrEqual(body.top);
    expect(body.top).toBeLessThanOrEqual(footer.top);
    expect(computed.backgroundColor).toBe(readTokenColor('--ki-card-bg'));
    // MarsUI light cards sit on the s0 surface in the SAME white
    // (Surface/special/light-s0_dark-s1): distinctness comes from the
    // resting elevation, not a background delta.
    expect(computed.boxShadow).not.toBe('none');
  });

  it('S2 renders a body-only card with no reserved space for absent regions', async () => {
    cleanup();
    const el = await mount('<ki-card>Storage is almost full</ki-card>');
    const card = cardPart(el).getBoundingClientRect();
    const body = regionPart(el, 'body').getBoundingClientRect();
    const cardStyles = getComputedStyle(cardPart(el));

    expect(regionPart(el, 'media').getBoundingClientRect().height).toBe(0);
    expect(regionPart(el, 'header').getBoundingClientRect().height).toBe(0);
    expect(regionPart(el, 'footer').getBoundingClientRect().height).toBe(0);
    // The card is the body region plus the SURFACE block padding (MarsUI:
    // one space/3xl padding on the wrap, none stacked on the regions).
    expect(Math.round(card.height)).toBe(
      Math.round(
        body.height +
          Number.parseFloat(cardStyles.paddingBlockStart) +
          Number.parseFloat(cardStyles.paddingBlockEnd),
      ),
    );
  });

  it('S2 re-evaluates region emptiness when a slotted text node changes content', async () => {
    cleanup();
    const el = await mount('<ki-card> </ki-card>');
    const body = regionPart(el, 'body');
    expect(body.hasAttribute('data-empty')).toBe(true);

    // Mutate the already-assigned text node's data (no slotchange fires).
    const textNode = el.childNodes[0] as Text;
    textNode.textContent = 'Storage is almost full';
    await nextFrame();
    await nextFrame();
    expect(body.hasAttribute('data-empty')).toBe(false);

    textNode.textContent = '   ';
    await nextFrame();
    await nextFrame();
    expect(body.hasAttribute('data-empty')).toBe(true);
  });

  it('S1 S2 have zero axe violations across representative region subsets', async () => {
    cleanup();
    ensureTokens();
    document.body.innerHTML = `
      <main>
      <ki-card>
        <img slot="media" alt="" src="about:blank" />
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
        <button slot="footer" type="button">Download</button>
      </ki-card>
      <ki-card>Storage is almost full</ki-card>
      <ki-card><img slot="media" alt="" src="about:blank" /><p>Media body</p></ki-card>
      <ki-card><h2 slot="header">Header</h2><button slot="footer" type="button">Close</button></ki-card>
      <ki-card></ki-card>
      </main>
    `;
    await customElements.whenDefined('ki-card');
    await nextFrame();
    await nextFrame();

    await expectAccessible(document.body);
  });

  /**
   * A one-line description of where focus is and what could hold it.
   *
   * S4 fails intermittently on CI and has never reproduced locally: two
   * hypotheses were measured over 40 rounds each — the slotted button not yet
   * hydrated when `mount()` returns, and the Tab not landing before the
   * sentinel is removed — and both came back clean on a developer machine.
   * The failure only says `expected <body> to be <ki-button>`, which does not
   * distinguish "the Tab went nowhere" from "the page never had focus" from
   * "there was nothing focusable to reach".
   *
   * So the state is captured at each step and reported with the assertion.
   * This changes nothing the test asserts; it makes the next red carry
   * evidence instead of a bare comparison. Reads only, and synchronously, so
   * it adds no await between the Tab and the assertion it describes.
   */
  const FOCUSABLE_SELECTOR =
    'a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable]';

  const nameOf = (node: Element | null | undefined): string =>
    node === null || node === undefined
      ? 'none'
      : `${node.localName}${node.id === '' ? '' : `#${node.id}`}`;

  /**
   * The controls a Tab can actually stop on, including those inside open
   * shadow roots.
   *
   * The whole subject of S4 lives in one: `ki-button` delegates focus to a
   * `<button>` in its shadow tree, and `querySelectorAll` does not cross that
   * boundary — a flat count reports "1 focusable" on a page with two tab stops
   * and would send the next reader looking for a missing control that is
   * there. Disabled controls and `tabindex="-1"` are excluded because neither
   * is a sequential tab stop, which is the question being asked.
   *
   * Document order, not tab order: a positive `tabindex` would reorder the
   * real sequence. Nothing here uses one, and this is a diagnostic rather than
   * an assertion.
   */
  function sequentialTabStops(root: ParentNode): Element[] {
    const stops: Element[] = [];

    for (const element of root.querySelectorAll('*')) {
      if (
        element.matches(FOCUSABLE_SELECTOR) &&
        !element.hasAttribute('disabled') &&
        (element as HTMLElement).tabIndex >= 0
      ) {
        stops.push(element);
      }
      if (element.shadowRoot !== null) {
        stops.push(...sequentialTabStops(element.shadowRoot));
      }
    }

    return stops;
  }

  /**
   * Where focus is, and what could hold it.
   *
   * S4 fails intermittently on CI and has never reproduced locally: two
   * hypotheses were measured over 40 rounds each — the slotted button not yet
   * hydrated when `mount()` returns, and the Tab not landing before the
   * sentinel is removed — and both came back clean on a developer machine.
   * The failure only says `expected <body> to be <ki-button>`, which does not
   * distinguish "the Tab went nowhere" from "the page never had focus" from
   * "there was nothing focusable to reach".
   *
   * So the state is captured at each step and reported with the assertion.
   * This changes nothing the test asserts; it makes the next red carry
   * evidence instead of a bare comparison. Reads only, and synchronously, so
   * it adds no await between the Tab and the assertion it describes.
   */
  function focusReport(label: string, subject: Element | null): string {
    // Focus inside a shadow root reports as the host, so follow it down.
    let deep: Element | null = document.activeElement;
    while (deep?.shadowRoot?.activeElement != null) {
      deep = deep.shadowRoot.activeElement;
    }

    const inner = subject?.shadowRoot?.querySelector('button');
    const stops = sequentialTabStops(document.body);
    return [
      label,
      `hasFocus=${String(document.hasFocus())}`,
      `active=${nameOf(document.activeElement)}`,
      `deepActive=${nameOf(deep)}`,
      `subjectHydrated=${String(Boolean(subject?.shadowRoot?.hasChildNodes()))}`,
      `subjectInnerControl=${inner === null || inner === undefined ? 'none' : `button tabindex=${String(inner.tabIndex)}`}`,
      `tabStops=${String(stops.length)}[${stops.map(nameOf).join(',')}]`,
    ].join(' ');
  }

  it('S4 moves focus to slotted content and never to the card host', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <ki-button slot="footer" type="button">Renew subscription</ki-button>
      </ki-card>
    `);
    const button = el.querySelector('ki-button');
    expect(button).toBeInstanceOf(HTMLElement);

    // Anchor the Tab start point: page-level focus state persists across
    // spec FILES in the same browser instance, so an unanchored Tab lands
    // wherever the previous file left focus — this exact test went red on
    // main when wave 1 reshuffled the file order (same failure class the
    // visual gate caught twice). A focused in-document sentinel makes the
    // next tab stop deterministic; it is removed before the assertions.
    const sentinel = document.createElement('button');
    sentinel.textContent = 'sentinel';
    sentinel.id = 'sentinel';
    document.body.prepend(sentinel);
    sentinel.focus();

    const beforeTab = focusReport('before-tab', button);
    // The sentinel only makes the next tab stop deterministic if the document
    // is focused and the sentinel actually holds it. Forcing that precondition
    // to fail locally reproduced the CI signature exactly: with
    // `hasFocus=false` the first synthetic Tab is spent entering the document
    // and lands ON the first focusable — the sentinel — so the removal below
    // sends activeElement to <body>. Stated here so a CI red says which of the
    // two it was instead of leaving them indistinguishable.
    expect(
      document.hasFocus(),
      `the page never held focus, so Tab has no anchor\n  ${beforeTab}`,
    ).toBe(true);
    expect(document.activeElement, `the sentinel did not take focus\n  ${beforeTab}`).toBe(
      sentinel,
    );

    await userEvent.keyboard('{Tab}');
    // Captured before the removal: taking the sentinel out while it still held
    // focus would itself send activeElement to <body>, and the assertion below
    // could not tell that apart from a Tab that went nowhere.
    const afterTab = focusReport('after-tab', button);
    sentinel.remove();
    const afterRemoval = focusReport('after-removal', button);

    const evidence = `\n  ${beforeTab}\n  ${afterTab}\n  ${afterRemoval}`;

    expect(document.activeElement, `focus landed on the card host itself${evidence}`).not.toBe(el);
    expect(document.activeElement, `focus never reached the slotted button${evidence}`).toBe(
      button,
    );
  });

  it('S5 exposes the slotted heading and body text without card role name or state', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
      </ki-card>
    `);

    await expect.element(page.getByRole('heading', { name: 'Monthly report' })).toBeInTheDocument();
    await expect.element(page.getByText('Revenue increased.')).toBeInTheDocument();
    expect(el.matches('[role],[aria-label],[aria-labelledby],[aria-describedby],[tabindex]')).toBe(
      false,
    );
  });

  it('S8 lets a real click on slotted content produce exactly one page activation', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <ki-button slot="footer" type="button">Download</ki-button>
      </ki-card>
    `);
    const button = el.querySelector('ki-button');
    expect(button).toBeInstanceOf(HTMLElement);
    let activations = 0;
    document.body.addEventListener('click', () => {
      activations += 1;
    });

    await userEvent.click(page.getByRole('button', { name: 'Download' }));

    expect(activations).toBe(1);
  });

  it('S6 resolves material3 surface border and elevation from tokens without markup changes', async () => {
    cleanup();
    ensureTokens();
    const markup = `
      <ki-card>
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
      </ki-card>
    `;
    const onmars = await mount(markup);
    const onmarsSurface = getComputedStyle(cardPart(onmars)).backgroundColor;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(markup);
    const card = cardPart(el);
    const computed = getComputedStyle(card);

    expect(el.innerHTML).toBe(onmars.innerHTML);
    expect(computed.backgroundColor).toBe(readTokenColor('--ki-card-bg'));
    expect(computed.borderColor).toBe(readTokenColor('--ki-card-border-color'));
    expect(computed.boxShadow).toBe(readTokenShadow('--ki-card-elevation'));
    expect(computed.backgroundColor, 'material3 must restyle the surface').not.toBe(onmarsSurface);
  });

  // Review round 1 (SC-003 / Art. V surface): the axe matrix must cover the
  // material3 theme, not only onmars.
  it('S6 has zero axe violations under the material3 theme', async () => {
    cleanup();
    ensureTokens();
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    // Wrapped in <main> like the S1/S2 axe fixture: axe's best-practice
    // region rule is about the PAGE (content outside landmarks), and a card
    // is not a landmark. The component-level claims (contrast, structure)
    // are unchanged by the wrapper.
    await mount(`
      <main>
        <ki-card>
          <div slot="media">media</div>
          <h2 slot="header">Monthly report</h2>
          <p>Revenue increased.</p>
          <ki-button slot="footer">Share</ki-button>
        </ki-card>
      </main>
    `);

    await expectAccessible(document.body);
  });

  it('stacks regions in block order and resolves region padding under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount(`
      <ki-card>
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
        <button slot="footer" type="button">Download</button>
      </ki-card>
    `);
    const header = regionPart(el, 'header').getBoundingClientRect();
    const body = regionPart(el, 'body').getBoundingClientRect();
    const footer = regionPart(el, 'footer').getBoundingClientRect();
    const bodyStyles = getComputedStyle(regionPart(el, 'body'));

    expect(header.top).toBeLessThanOrEqual(body.top);
    expect(body.top).toBeLessThanOrEqual(footer.top);
    expect(bodyStyles.paddingInlineStart).toBe(bodyStyles.paddingInlineEnd);
    expect(bodyStyles.paddingInlineStart).not.toBe('0px');
  });

  it('resolves the MarsUI surface rhythm: one block padding on the card, inline-only regions', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <img slot="media" alt="" src="about:blank" />
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
      </ki-card>
    `);
    const cardStyles = getComputedStyle(cardPart(el));
    const headerStyles = getComputedStyle(regionPart(el, 'header'));
    const bodyStyles = getComputedStyle(regionPart(el, 'body'));

    // Surface carries the single space/3xl block padding (Dashboard_info /
    // Chart masters)...
    expect(cardStyles.paddingBlockStart).toBe('16px');
    expect(cardStyles.paddingBlockEnd).toBe('16px');
    // ...and regions pad inline only: the old 16+16 stacked block paddings
    // (32px of visual space between rows) are gone.
    expect(headerStyles.paddingBlockStart).toBe('0px');
    expect(headerStyles.paddingBlockEnd).toBe('0px');
    expect(headerStyles.paddingInlineStart).toBe('16px');
    expect(bodyStyles.paddingBlockStart).toBe('0px');
    expect(bodyStyles.paddingBlockEnd).toBe('0px');
    expect(bodyStyles.paddingInlineStart).toBe('16px');

    // Slotted media conforms to the region inline size (ki-video precedent)
    // and takes the nested big_component radius_sm.
    const img = el.querySelector('img');
    expect(img).toBeInstanceOf(HTMLImageElement);
    if (!img) {
      throw new Error('media fixture missing');
    }
    const imgStyles = getComputedStyle(img);
    expect(imgStyles.display).toBe('block');
    expect(imgStyles.borderRadius).toBe('20px');
    // The media region is an inset sub-surface (Chart master): it pads
    // space/md inline and the slotted media fills the CONTENT box, not the
    // region border box.
    const media = regionPart(el, 'media');
    const mediaStyles = getComputedStyle(media);
    expect(mediaStyles.paddingInlineStart).toBe('8px');
    expect(mediaStyles.paddingInlineEnd).toBe('8px');
    expect(Math.round(img.getBoundingClientRect().width)).toBe(
      Math.round(
        media.getBoundingClientRect().width -
          Number.parseFloat(mediaStyles.paddingInlineStart) -
          Number.parseFloat(mediaStyles.paddingInlineEnd),
      ),
    );
  });

  it('lifts the resting e1 elevation to e2 while hovered (MarsUI resting levels)', async () => {
    cleanup();
    const el = await mount('<ki-card>Storage is almost full</ki-card>');
    // Pointer position persists across spec files in this page: park it on a
    // probe below the card first so the resting read is hover-free.
    const probe = document.createElement('button');
    probe.textContent = 'probe';
    document.body.append(probe);
    await userEvent.hover(probe);
    await expect
      .poll(() => getComputedStyle(cardPart(el)).boxShadow)
      .toBe(readTokenShadow('--ki-card-elevation'));

    await userEvent.hover(el);
    await expect
      .poll(() => getComputedStyle(cardPart(el)).boxShadow)
      .toBe(readTokenShadow('--ki-elevation-e2'));

    await userEvent.hover(probe);
    await expect
      .poll(() => getComputedStyle(cardPart(el)).boxShadow)
      .toBe(readTokenShadow('--ki-card-elevation'));
    probe.remove();
  });
});
