// @spec:001-tokens-theming
//
// S17: before a component script registers its tags, a custom element is an
// inline box, so the items of a group run together as one line of text
// ("Usarlo yaEntenderloA mano"). The page contract lays those items out as
// blocks until their tags register, and leaves registered components exactly
// as their own styles lay them out.
//
// The tests run in file order on purpose: every test before the last one
// needs the tags unregistered, and the last one registers them.
import { afterEach, describe, expect, it } from 'vitest';

import pageContractCss from '@kimen/tokens/css/base?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { defineCustomElement as defineKiSegment } from '../dist/components/ki-segment.js';
import { defineCustomElement as defineKiSegmentedControl } from '../dist/components/ki-segmented-control.js';
import { componentTags } from './all-components';

const TOKENS_ID = 'pre-registration-tokens';
const PAGE_CONTRACT_ID = 'pre-registration-page-contract';
const RENDER_DEADLINE_MS = 1500;
// No whitespace between the items, as a framework or a minifier emits them:
// nothing but layout keeps one label from running into the next.
const MARKUP =
  '<ki-segmented-control label="Mode"><ki-segment value="now">Usarlo ya</ki-segment><ki-segment value="learn">Entenderlo</ki-segment><ki-segment value="manual">A mano</ki-segment></ki-segmented-control>' +
  '<ki-radio-group label="Tu respuesta"><ki-radio value="yes">Sí</ki-radio><ki-radio value="no">No</ki-radio><ki-radio value="maybe">Quizá</ki-radio></ki-radio-group>';

function load(css: string, id: string): void {
  if (document.getElementById(id) !== null) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

function mount(): HTMLElement {
  const main = document.createElement('main');
  main.innerHTML = MARKUP;
  document.body.replaceChildren(main);
  return main;
}

/** The block offset of each item: equal offsets mean one shared line. */
function lineOffsets(main: HTMLElement, tag: string): number[] {
  return [...main.querySelectorAll(tag)].map((item) => item.getBoundingClientRect().top);
}

/** What the browser lays out for each item: its box and its display type. */
function layoutOf(main: HTMLElement): string[] {
  return [
    ...main.querySelectorAll('ki-segment, ki-radio, ki-segmented-control, ki-radio-group'),
  ].map((element) => {
    const { top, left, width, height } = element.getBoundingClientRect();
    const box = [top, left, width, height].map(String).join(' ');
    return `${element.localName} ${getComputedStyle(element).display} ${box}`;
  });
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

afterEach(() => {
  document.getElementById(PAGE_CONTRACT_ID)?.remove();
  document.body.replaceChildren();
});

describe('unregistered group items', () => {
  it('S17 runs together on one line without the page contract', () => {
    // The failure the page contract answers, so the next test cannot pass
    // vacuously on a page where the items already stack.
    load(onmarsCss, TOKENS_ID);
    const main = mount();

    expect(customElements.get('ki-segment')).toBeUndefined();
    expect(new Set(lineOffsets(main, 'ki-segment')).size).toBe(1);
    expect(new Set(lineOffsets(main, 'ki-radio')).size).toBe(1);
  });

  it('S17 puts each segment and each radio on its own line with the page contract', () => {
    load(onmarsCss, TOKENS_ID);
    load(pageContractCss, PAGE_CONTRACT_ID);
    const main = mount();

    for (const tag of ['ki-segment', 'ki-radio']) {
      const offsets = lineOffsets(main, tag);
      expect(offsets, `${tag} items stack, one per line`).toEqual(
        offsets.toSorted((left, right) => left - right),
      );
      expect(new Set(offsets).size, `${tag} items stack, one per line`).toBe(offsets.length);
    }
  });

  it('S17 lays out only Kimen tags, so other custom elements keep their own default', () => {
    const selector = /:where\(([^)]*)\):where\(:not\(:defined\)\)/u.exec(pageContractCss);
    if (selector === null) {
      throw new Error('the page contract must carry its pre-registration rule');
    }
    const tags = selector[1].split(',').map((tag) => tag.trim());
    const known = new Set(componentTags);

    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((tag) => !known.has(tag))).toEqual([]);
  });
});

describe('registered components', () => {
  it('S17 lay out exactly as without the page contract once their tags register', async () => {
    defineKiSegmentedControl();
    defineKiSegment();
    defineKiRadioGroup();
    defineKiRadio();
    load(onmarsCss, TOKENS_ID);
    load(pageContractCss, PAGE_CONTRACT_ID);
    const main = mount();
    const hosts = [...main.querySelectorAll('ki-segmented-control, ki-radio-group')];
    const deadline = Date.now() + RENDER_DEADLINE_MS;
    while (
      hosts.some((host) => host.shadowRoot?.hasChildNodes() !== true) &&
      Date.now() < deadline
    ) {
      await nextFrame();
    }
    await nextFrame();
    await nextFrame();
    const withContract = layoutOf(main);

    document.getElementById(PAGE_CONTRACT_ID)?.remove();
    await nextFrame();

    expect(customElements.get('ki-segment')).toBeDefined();
    expect(hosts.every((host) => host.shadowRoot?.hasChildNodes() === true)).toBe(true);
    expect(layoutOf(main)).toEqual(withContract);
    // A registered segment is laid out by its own host style (a flex row
    // item), never by the fallback's block.
    expect(getComputedStyle(main.querySelector('ki-segment') as Element).display).not.toBe('block');
  });
});
