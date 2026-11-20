// @spec:132-rich-tooltip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as definePopover } from '../../../dist/components/ki-popover.js';
import { defineCustomElement as defineTooltip } from '../../../dist/components/ki-tooltip.js';

const fixture = document.createElement('main');
const style = document.createElement('style');
const body = 'Deleted projects stay restorable for 30 days.';
const tooltipDescription = `Grace period ${body}`;
const clock = commands as unknown as {
  installClock: () => Promise<void>;
  fastForwardClock: (ms: number) => Promise<void>;
};
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineButton();
  defineTooltip();
  definePopover();
  style.textContent = tokensCss;
  fixture.style.cssText =
    'background: var(--ki-surface-s0); color: var(--ki-text-high-em); padding: 8rem; text-align: center;';
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  fixture.style.cssText =
    'background: var(--ki-surface-s0); color: var(--ki-text-high-em); padding: 8rem; text-align: center;';
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

function mountTooltip(content = body, placement = 'top', describedBy = '') {
  fixture.innerHTML = `
    <button id="retention" type="button" tabindex="0" ${describedBy}>Retention</button>
    <ki-tooltip for="retention" heading="Grace period" placement="${placement}">${content}</ki-tooltip>
    <button type="button" tabindex="0">Next</button>
    <span id="existing" hidden>Account policy</span>
  `;
  return {
    trigger: page.getByRole('button', { name: 'Retention' }),
    tip: page.getByRole('tooltip'),
  };
}

it('S1 stays open when the pointer crosses from the external trigger onto the bubble', async () => {
  const { trigger, tip } = mountTooltip();
  fixture.style.setProperty('--ki-tooltip-hide-delay', '0ms');
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
  try {
    await clock.installClock();
  } catch {
    // The page clock may already have been installed by another spec.
  }

  await trigger.hover();
  await clock.fastForwardClock(550);
  await expect.element(tip).toBeVisible();
  await tip.hover();
  await clock.fastForwardClock(550);

  await expect.element(tip).toHaveTextContent('Grace period');
  await expect.element(tip).toHaveTextContent(body);
  await expect.element(tip).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(tip).not.toBeInTheDocument();
});

it('S2 presents direct body text and makes interactive children unavailable', async () => {
  const { trigger, tip } = mountTooltip(`${body}<a href="/help" tabindex="0">Learn more</a>`);
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
  trigger.element().focus();

  await expect.element(tip).toHaveTextContent('Grace period');
  await expect.element(tip).toHaveTextContent(body);
  await expect.element(page.getByRole('link', { name: 'Learn more' })).not.toBeInTheDocument();
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
});

it('S5 opens on Tab and leaves focus on the trigger', async () => {
  const { trigger, tip } = mountTooltip();
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);

  await userEvent.tab();

  await expect.element(trigger).toHaveFocus();
  await expect.element(tip).toBeVisible();
});

it('S5 shows a rich tooltip added after its trigger took focus', async () => {
  fixture.innerHTML = '<button id="retention" type="button" tabindex="0">Retention</button>';
  const trigger = page.getByRole('button', { name: 'Retention' });
  trigger.element().focus();

  fixture.insertAdjacentHTML(
    'beforeend',
    `<ki-tooltip for="retention" heading="Grace period">${body}</ki-tooltip>`,
  );

  await expect.element(page.getByRole('tooltip')).toBeVisible();
  await expect.element(trigger).toHaveFocus();
});

it('S6 Escape closes the focused tooltip and leaves the trigger focused', async () => {
  const { trigger, tip } = mountTooltip();
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
  trigger.element().focus();
  await expect.element(tip).toBeVisible();

  await userEvent.keyboard('{Escape}');

  await expect.element(tip).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

it('S9 describes the trigger before and after focus, preserving existing descriptions', async () => {
  const { trigger, tip } = mountTooltip(body, 'top', 'aria-describedby="existing"');
  const description = `Account policy ${tooltipDescription}`;
  await expect.element(trigger).toHaveAccessibleDescription(description);
  expect(trigger.element().getAttribute('aria-describedby')).toMatch(/^existing\s/u);

  trigger.element().focus();

  await expect.element(tip).toBeVisible();
  await expect.element(trigger).toHaveAccessibleDescription(description);
  await expectAccessible(fixture);
  fixture.querySelector('ki-tooltip')?.remove();
  await expect.element(trigger).toHaveAttribute('aria-describedby', 'existing');
});

it('S9 follows late trigger replacement and body edits', async () => {
  const { trigger } = mountTooltip();
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
  const previous = trigger.element();
  const replacement = previous.cloneNode(true) as HTMLElement;
  replacement.removeAttribute('aria-describedby');
  previous.replaceWith(replacement);
  const tooltip = fixture.querySelector('ki-tooltip');
  if (!tooltip) throw new Error('Tooltip fixture missing');
  tooltip.replaceChildren('Restorable for one month.');

  await expect
    .element(trigger)
    .toHaveAccessibleDescription('Grace period Restorable for one month.');
  await expect.element(previous).not.toHaveAttribute('aria-describedby');
});

it('S9 preserves existing reflected description references when a tooltip is removed', async () => {
  fixture.innerHTML =
    '<button id="retention" type="button">Retention</button><span hidden>Policy</span>';
  const trigger = page.getByRole('button', { name: 'Retention' }).element();
  const authored = fixture.querySelector('span');
  if (!authored) throw new Error('Description fixture missing');
  trigger.ariaDescribedByElements = [authored];

  fixture.insertAdjacentHTML(
    'beforeend',
    `<ki-tooltip for="retention" heading="Grace period">${body}</ki-tooltip>`,
  );

  await expect
    .poll(() => trigger.ariaDescribedByElements?.map((element) => element.textContent))
    .toEqual(['Policy', tooltipDescription]);
  fixture.querySelector('ki-tooltip')?.remove();
  expect(trigger.ariaDescribedByElements).toEqual([authored]);
});

it('S9 describes the shadow button inside a Kimen trigger', async () => {
  fixture.innerHTML = `
    <ki-button id="retention" variant="ghost">Retention</ki-button>
    <ki-tooltip for="retention" heading="Grace period">${body}</ki-tooltip>
  `;
  const trigger = await page.getByRole('button', { name: 'Retention' }).findElement();
  await expect
    .poll(() => trigger.ariaDescribedByElements?.map((element) => element.textContent).join(' '))
    .toBe(tooltipDescription);

  trigger.focus();

  await expect.element(page.getByRole('tooltip')).toBeVisible();
});

it('S11 styles both rich surfaces from the same tokens', async () => {
  const { trigger, tip } = mountTooltip();
  fixture.insertAdjacentHTML(
    'beforeend',
    `<button id="contrast" type="button" tabindex="0">Contrast</button>
    <ki-popover for="contrast" label="About contrast" appearance="rich" open>
      <strong>Contrast mode</strong> ${body}
    </ki-popover>`,
  );
  fixture.style.setProperty('--ki-tooltip-rich-bg', 'rgb(240, 246, 252)');
  fixture.style.setProperty('--ki-tooltip-rich-fg', 'rgb(25, 35, 45)');
  fixture.style.setProperty('--ki-tooltip-rich-heading-fg', 'rgb(15, 20, 25)');
  fixture.style.setProperty('--ki-tooltip-rich-radius', '12px');
  fixture.style.setProperty('--ki-tooltip-rich-max-width', '180px');
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);

  trigger.element().focus();

  const dialog = page.getByRole('dialog', { name: 'About contrast' });
  await expect.element(tip).toBeVisible();
  await expect.element(dialog).toBeVisible();
  for (const panel of [tip.element(), dialog.element()]) {
    const paint = getComputedStyle(panel);
    expect(paint.backgroundColor).toBe('rgb(240, 246, 252)');
    expect(paint.color).toBe('rgb(25, 35, 45)');
    expect(paint.borderStartStartRadius).toBe('12px');
    expect(paint.maxInlineSize).toBe('180px');
    const heading = panel.querySelector('strong') ?? fixture.querySelector('ki-popover strong');
    if (!heading) throw new Error('Rich heading missing');
    expect(getComputedStyle(heading).color).toBe('rgb(15, 20, 25)');
  }
});

it('S12 keeps a visible boundary in forced colours', async (test) => {
  try {
    if ((await media.emulateForcedColors('active')) === false) {
      test.skip('This engine does not emulate forced colours');
    }
    const { trigger, tip } = mountTooltip();
    await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
    trigger.element().focus();

    await expect.element(tip).toBeVisible();
    const paint = getComputedStyle(tip.element());
    expect(Number.parseFloat(paint.borderInlineStartWidth)).toBeGreaterThan(0);
    expect(paint.borderInlineStartColor).not.toBe(paint.backgroundColor);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S12 opens without animation with reduced motion', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    const { trigger, tip } = mountTooltip();
    await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
    trigger.element().focus();

    await expect.element(tip).toBeVisible();
    expect(tip.element().getAnimations()).toHaveLength(0);
  } finally {
    await media.emulateReducedMotion(null);
  }
});

it('S13 places rich inline-start on the right in RTL', async () => {
  fixture.dir = 'rtl';
  fixture.style.setProperty('--ki-tooltip-rich-max-width', '7rem');
  const { trigger, tip } = mountTooltip(body, 'start');
  await expect.element(trigger).toHaveAccessibleDescription(tooltipDescription);
  trigger.element().focus();

  await expect.element(tip).toBeVisible();
  await expect
    .poll(
      () =>
        tip.element().getBoundingClientRect().left >
        trigger.element().getBoundingClientRect().right,
    )
    .toBe(true);
});
