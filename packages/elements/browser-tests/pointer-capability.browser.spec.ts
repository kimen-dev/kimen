// Pointer-capability contract (Art. III: the reproduction IS a failing test).
//
// `:hover` is a promise about a pointer that can rest on a control without
// pressing it. A touch screen has no such pointer, and it does not decline the
// promise — it latches :hover on the tap and holds it until the user touches
// something else. The last control tapped keeps wearing its hover paint on a
// page where nothing is under the finger. The remedy every mature system
// reached is the same one: hover-conditional paint belongs inside
// `@media (hover: hover)`.
//
// Two instruments, because neither covers what the other does:
//
//   THE AUDIT walks the stylesheets the browser actually parsed for every
//   mounted component and requires each `:hover` rule to sit inside a
//   hover-capability query. It is the completeness claim — every rule, every
//   component, every engine — but it reads CSS, not paint.
//
//   THE MEASUREMENT emulates a device with no hovering pointer, hovers the
//   control, and reads what was painted. It proves the query does the thing
//   the audit assumes. It is deliberately not exhaustive: it reaches only
//   what is on screen at rest (a closed listbox's options are audited, not
//   hovered), and it samples HOSTS_PER_TAG instances of each tag.
//
// The measurement carries a WITNESS: a deliberately ungated hover rule that
// must still repaint under the same emulation. Without it, a harness that
// silently stopped delivering hovers would report every component clean. That
// is not hypothetical — the first version of this spec emulated the media
// features directly, Chromium accepted the call and changed nothing, and all
// fifteen components "failed" for a reason that had nothing to do with them.
//
// Touch emulation is a CDP call, so the measurement runs on Chromium. On the
// prerelease firefox/webkit engines the command reports that it could not
// emulate and the measurement fails loudly rather than passing silently; the
// audit still runs everywhere.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';
import { defineCustomElement as defineKiBadge } from '../dist/components/ki-badge.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiCard } from '../dist/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '../dist/components/ki-checkbox.js';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '../dist/components/ki-divider.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { defineCustomElement as defineKiIndicator } from '../dist/components/ki-indicator.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiProgress } from '../dist/components/ki-progress.js';
import { defineCustomElement as defineKiQr } from '../dist/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { defineCustomElement as defineKiScroller } from '../dist/components/ki-scroller.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { defineCustomElement as defineKiStatus } from '../dist/components/ki-status.js';
import { defineCustomElement as defineKiSwitch } from '../dist/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '../dist/components/ki-textarea.js';
import { defineCustomElement as defineKiTooltip } from '../dist/components/ki-tooltip.js';
import { defineCustomElement as defineKiVideo } from '../dist/components/ki-video.js';
import { visualGalleries } from './visual/galleries';
import type { VisualComponent } from './visual/galleries';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
  resetPointer: () => Promise<void>;
};

const TOKENS_STYLE_ID = 'pointer-capability-tokens';
const WITNESS_STYLE_ID = 'pointer-capability-witness-style';
const SHADOW_RENDER_DEADLINE_MS = 1500;
// Bound on the measurement, not on the contract: enough instances to cover
// the variants a gallery opens with, few enough to keep 29 components inside
// one suite. Whatever this leaves out, the audit still reads.
const HOSTS_PER_TAG = 6;

/**
 * After whitespace is stripped, the one condition that means "this device has
 * a hovering pointer". `(any-hover: hover)` deliberately does NOT match: it is
 * true of a touch screen with a mouse plugged in somewhere, which is not the
 * question a hover style is asking.
 */
const HOVER_CAPABILITY_QUERY = '(hover:hover)';

const defineAll: readonly (() => void)[] = [
  defineKiAlert,
  defineKiAvatar,
  defineKiAvatarGroup,
  defineKiBadge,
  defineKiButton,
  defineKiCard,
  defineKiCheckbox,
  defineKiDialog,
  defineKiDivider,
  defineKiIconButton,
  defineKiIndicator,
  defineKiInput,
  defineKiList,
  defineKiListItem,
  defineKiOption,
  defineKiProgress,
  defineKiQr,
  defineKiRadio,
  defineKiRadioGroup,
  defineKiScroller,
  defineKiSelect,
  defineKiStatus,
  defineKiSwitch,
  defineKiTab,
  defineKiTabPanel,
  defineKiTabs,
  defineKiTextarea,
  defineKiTooltip,
  defineKiVideo,
];

const components = Object.keys(visualGalleries) as VisualComponent[];

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Every shadow host in the mounted tree, in document order. */
function shadowHosts(root: ParentNode): HTMLElement[] {
  const hosts: HTMLElement[] = [];
  const walk = (node: ParentNode): void => {
    for (const element of node.querySelectorAll<HTMLElement>('*')) {
      if (element.shadowRoot !== null) {
        hosts.push(element);
        walk(element.shadowRoot);
      }
    }
  };
  walk(root);
  return hosts;
}

async function waitForShadowRender(root: ParentNode): Promise<void> {
  const pending = (): boolean =>
    [...root.querySelectorAll('*')].some(
      (element) =>
        element.tagName.startsWith('KI-') &&
        element.shadowRoot !== null &&
        !element.shadowRoot.hasChildNodes() &&
        getComputedStyle(element).display !== 'none',
    );
  const deadline = Date.now() + SHADOW_RENDER_DEADLINE_MS;
  while (pending() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
}

function ensureStyles(): void {
  if (!document.getElementById(TOKENS_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = TOKENS_STYLE_ID;
    style.textContent = tokensCss;
    document.head.append(style);
  }
  if (!document.getElementById(WITNESS_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = WITNESS_STYLE_ID;
    // Ungated on purpose. This is the apparatus talking, not the library.
    style.textContent =
      '#pointer-capability-witness{position:fixed;inset-block-start:8px;inset-inline-start:8px;' +
      'inline-size:96px;block-size:96px;margin:0;padding:0;border:0;background:#000}' +
      '#pointer-capability-witness:hover{background:#fff}' +
      // The pointer rests at the page origin, so the gallery starts below it.
      '#pointer-capability-gallery{margin-block-start:240px}';
    document.head.append(style);
  }
}

async function mount(component: VisualComponent): Promise<HTMLElement> {
  document.body.replaceChildren();
  ensureStyles();
  const gallery = document.createElement('div');
  gallery.id = 'pointer-capability-gallery';
  gallery.innerHTML = visualGalleries[component].html;
  document.body.append(gallery);
  await waitForShadowRender(gallery);
  await visualGalleries[component].prepare?.(gallery);
  await nextFrame();
  return gallery;
}

interface StyleRule {
  readonly owner: string;
  readonly selector: string;
  readonly media: string;
}

/** Every style rule the browser parsed, with the media conditions it sits inside. */
function styleRulesOf(host: HTMLElement): StyleRule[] {
  const shadow = host.shadowRoot;
  if (shadow === null) {
    return [];
  }
  const owner = host.tagName.toLowerCase();
  const found: StyleRule[] = [];
  const walk = (rules: CSSRuleList, media: readonly string[]): void => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, [...media, rule.conditionText.replaceAll(/\s+/gu, '')]);
      } else if (rule instanceof CSSGroupingRule) {
        // @supports / @layer / @container carry no hover capability; they pass
        // the conditions they inherited straight through.
        walk(rule.cssRules, media);
      } else if (rule instanceof CSSStyleRule) {
        found.push({ owner, selector: rule.selectorText, media: media.join(' and ') });
      }
    }
  };
  for (const sheet of [...shadow.adoptedStyleSheets, ...shadow.styleSheets]) {
    walk(sheet.cssRules, []);
  }
  return found;
}

function hoverRulesOf(host: HTMLElement): StyleRule[] {
  return styleRulesOf(host).filter((rule) => rule.selector.includes(':hover'));
}

/** Only what a finger could actually land on. */
function isHoverable(element: HTMLElement): boolean {
  if (
    !element.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    })
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * The elements a hover rule waits for. `:host(…:hover…)` names the host
 * itself; every other form in this library keys off a shadow part, so the part
 * name reaches it.
 */
function hoverSubjects(host: HTMLElement, rule: StyleRule): HTMLElement[] {
  const shadow = host.shadowRoot;
  if (shadow === null) {
    return [];
  }
  const parts = [...rule.selector.matchAll(/\[part="([^"]+)"\]/gu)].map((match) => match[1] ?? '');
  if (parts.length > 0) {
    return parts.flatMap((part) => [...shadow.querySelectorAll<HTMLElement>(`[part~="${part}"]`)]);
  }
  if (rule.selector.startsWith(':host')) {
    return [host];
  }
  return [...shadow.querySelectorAll<HTMLElement>(rule.selector.replaceAll(':hover', ''))];
}

const PAINTED_PROPERTIES = [
  'background-color',
  'background-image',
  'border-block-end-color',
  'border-block-start-color',
  'border-inline-end-color',
  'border-inline-start-color',
  'box-shadow',
  'color',
  'fill',
  'opacity',
  'outline-color',
  'stroke',
  'text-decoration-color',
] as const;

/** Everything paintable in the mounted gallery, hosts and shadow content alike. */
function paintSignature(gallery: HTMLElement): string {
  const signatures: string[] = [];
  const walk = (node: ParentNode): void => {
    for (const element of node.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      signatures.push(
        PAINTED_PROPERTIES.map((property) => style.getPropertyValue(property)).join(','),
      );
      if (element.shadowRoot !== null) {
        walk(element.shadowRoot);
      }
    }
  };
  walk(gallery);
  return signatures.join('|');
}

/** The hover-rule subjects this run will hover, and the instances it left out. */
function measurementPlan(gallery: HTMLElement): {
  subjects: Map<HTMLElement, string>;
  rules: StyleRule[];
  capped: string[];
} {
  const byTag = new Map<string, HTMLElement[]>();
  for (const host of shadowHosts(gallery)) {
    const tag = host.tagName.toLowerCase();
    byTag.set(tag, [...(byTag.get(tag) ?? []), host]);
  }
  const subjects = new Map<HTMLElement, string>();
  const rules: StyleRule[] = [];
  const capped: string[] = [];
  for (const [tag, hosts] of byTag) {
    if (hosts.length > HOSTS_PER_TAG) {
      capped.push(`${tag}: ${String(hosts.length)} mounted, ${String(HOSTS_PER_TAG)} hovered`);
    }
    for (const host of hosts.slice(0, HOSTS_PER_TAG)) {
      for (const rule of hoverRulesOf(host)) {
        rules.push(rule);
        for (const subject of hoverSubjects(host, rule).filter(isHoverable)) {
          subjects.set(subject, `${rule.owner} { ${rule.selector} }`);
        }
      }
    }
  }
  return { subjects, rules, capped };
}

/** Rest the pointer at the page origin, clear of the gallery and the witness. */
async function park(): Promise<void> {
  await browserCommands.resetPointer();
  await nextFrame();
}

/** Hover every subject in turn; report the ones whose hover repainted the gallery. */
async function repaintingSubjects(
  gallery: HTMLElement,
  subjects: Map<HTMLElement, string>,
): Promise<{ repainting: string[]; unreached: string[] }> {
  await park();
  const resting = paintSignature(gallery);
  const repainting: string[] = [];
  const unreached: string[] = [];
  for (const [subject, label] of subjects) {
    try {
      await userEvent.hover(subject);
    } catch {
      // Visible but not reachable by a pointer (covered, or moving). Recorded
      // rather than dropped: a measurement that quietly shrinks is a green
      // result about nothing.
      unreached.push(label);
      continue;
    }
    await nextFrame();
    if (paintSignature(gallery) !== resting) {
      repainting.push(label);
    }
  }
  await park();
  return { repainting: [...new Set(repainting)].sort(), unreached: [...new Set(unreached)].sort() };
}

/**
 * Does a hover still reach the page at all under the current emulation?
 *
 * On an empty page, on purpose: ki-dialog's gallery opens a modal that covers
 * the viewport and swallows the pointer, and a witness a modal can cover would
 * report "no hover delivered" for a reason with nothing to do with hovering.
 * What this guards is a property of the harness, not of the gallery.
 */
async function witnessDelivers(): Promise<boolean> {
  document.body.replaceChildren();
  ensureStyles();
  const witness = document.createElement('div');
  witness.id = 'pointer-capability-witness';
  document.body.append(witness);
  await park();
  const resting = getComputedStyle(witness).backgroundColor;
  await userEvent.hover(witness);
  await nextFrame();
  const hovered = getComputedStyle(witness).backgroundColor;
  await park();
  witness.remove();
  return hovered !== resting;
}

beforeAll(() => {
  for (const define of defineAll) {
    define();
  }
});

describe('hover capability audit', () => {
  it.each(components)('%s gates every hover rule on a hovering pointer', async (component) => {
    const gallery = await mount(component);
    const ungated = shadowHosts(gallery)
      .flatMap((host) => hoverRulesOf(host))
      .filter((rule) => !rule.media.includes(HOVER_CAPABILITY_QUERY))
      .map((rule) => `${rule.owner} { ${rule.selector} }`);

    expect(
      [...new Set(ungated)].sort(),
      `${component} paints a hover state on a device that cannot hover, where it latches on the tap and never lifts; wrap the rule in @media (hover: hover)`,
    ).toEqual([]);
  });

  // The other direction, and the reason it is here: gating is a mechanical
  // edit over contiguous blocks, and a block that ends one rule too late takes
  // a rest or disabled style out of every touch device's stylesheet — a defect
  // no hover test would ever see.
  it.each(components)('%s puts nothing but hover behind the hover query', async (component) => {
    const gallery = await mount(component);
    const stranded = shadowHosts(gallery)
      .flatMap((host) => styleRulesOf(host))
      .filter(
        (rule) => rule.media.includes(HOVER_CAPABILITY_QUERY) && !rule.selector.includes(':hover'),
      )
      .map((rule) => `${rule.owner} { ${rule.selector} }`);

    expect(
      [...new Set(stranded)].sort(),
      `${component} hides a rule that has nothing to do with hovering from every device that cannot hover`,
    ).toEqual([]);
  });
});

describe('hover capability measurement', () => {
  it('emulates a device with no hovering pointer', async () => {
    try {
      expect(
        await browserCommands.emulateHoverCapability('none'),
        'this engine has no CDP, so a touch device cannot be emulated and only the audit above ran',
      ).toBe(true);
      expect(
        matchMedia('(hover: none)').matches,
        'the emulation was accepted but the page still reports a hovering pointer',
      ).toBe(true);
      expect(matchMedia('(hover: hover)').matches).toBe(false);
      expect(
        await witnessDelivers(),
        'an ungated :hover rule stopped repainting under the emulation, so the harness is no longer delivering hovers and every clean result below would be meaningless',
      ).toBe(true);
    } finally {
      await browserCommands.emulateHoverCapability(null);
    }
    expect(
      matchMedia('(hover: hover)').matches,
      'the emulation did not lift, so every later assertion would measure a touch device',
    ).toBe(true);
  });

  // Liveness, once: a gate written the wrong way round would silence hover for
  // mouse users too, and every per-component assertion below would still be
  // green. ki-button carries the largest hover matrix in the library.
  it('leaves hover working for a pointer that has it', async () => {
    const gallery = await mount('ki-button');
    const { subjects } = measurementPlan(gallery);
    const { repainting, unreached } = await repaintingSubjects(gallery, subjects);
    expect(unreached).toEqual([]);
    expect(
      repainting.length,
      'no ki-button hover repainted for a mouse user: hover is not gated, it is gone',
    ).toBeGreaterThan(0);
  });

  it.each(components)('%s paints no hover on a device without one', async (component) => {
    try {
      expect(await browserCommands.emulateHoverCapability('none')).toBe(true);
      expect(
        await witnessDelivers(),
        `the ungated witness went inert, so this run cannot tell a gated ${component} from an undelivered hover`,
      ).toBe(true);

      const gallery = await mount(component);
      const { subjects, rules, capped } = measurementPlan(gallery);
      const coverage = `${String(subjects.size)} subjects from ${String(rules.length)} hover rules${capped.length === 0 ? '' : `; sampled ${capped.join(', ')}`}`;
      const { repainting, unreached } = await repaintingSubjects(gallery, subjects);
      expect(unreached, `${component} has hover subjects no pointer could reach`).toEqual([]);
      expect(
        repainting,
        `${component} repaints on hover on a device with no hovering pointer; on a touch screen that paint latches on the tap and stays until the user taps elsewhere (${coverage})`,
      ).toEqual([]);
    } finally {
      await browserCommands.emulateHoverCapability(null);
    }
  });
});
