// @spec:103-ki-drawer
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer, settleEntryMotion } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-drawer.js';
import { defineCustomElement as defineInput } from '../../../dist/components/ki-input.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browser = commands as unknown as {
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
};
type Drawer = HTMLElement & {
  close(): Promise<void>;
  show(): Promise<void>;
  open: boolean;
  modal: boolean;
  placement: string;
  size: string;
};
type CloseEvent = CustomEvent<{ reason: string }>;

beforeAll(() => {
  defineInput();
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('data-ki-theme');
  fixture.removeAttribute('style');
  document.documentElement.style.removeProperty('--ki-surface-s1');
  await browser.emulateForcedColors(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mount(attributes = {}, content = '<p>Incident details</p>'): Drawer {
  const drawer = document.createElement('ki-drawer') as Drawer;
  drawer.setAttribute('heading', 'Edit incident');
  for (const [name, value] of Object.entries<string>(attributes)) {
    drawer.setAttribute(name, value);
  }
  drawer.innerHTML = content;
  fixture.append(drawer);
  return drawer;
}

function part(drawer: Drawer, name: string): HTMLElement {
  const element = drawer.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`Drawer did not render the ${name} part`);
  return element;
}

function dialog() {
  return page.getByRole('dialog', { name: 'Edit incident' });
}

function closeButton() {
  return page.getByRole('button', { name: 'Close', exact: true });
}

async function open(drawer: Drawer): Promise<void> {
  await drawer.show();
  await expect.element(dialog()).toBeVisible();
}

function reasons(drawer: Drawer, veto = false): string[] {
  const seen: string[] = [];
  drawer.addEventListener('ki-close', (event) => {
    const request = event as CloseEvent;
    expect(request.cancelable).toBe(true);
    expect(drawer.open).toBe(true);
    seen.push(request.detail.reason);
    if (veto) request.preventDefault();
  });
  return seen;
}

function swipe(drawer: Drawer, dx: number, dy: number): void {
  const handle = part(drawer, 'handle');
  for (const [type, clientX, clientY] of [
    ['pointerdown', 100, 100],
    ['pointerup', 100 + dx, 100 + dy],
  ] as const) {
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX,
        clientY,
      }),
    );
  }
}

it('S1 opens and closes through reflected state and methods', async () => {
  const drawer = mount();
  await expect.element(dialog()).not.toBeInTheDocument();
  await open(drawer);
  await expect.element(drawer).toHaveAttribute('open');
  await drawer.show();

  await drawer.close();
  await expect.element(dialog()).not.toBeInTheDocument();
  await expect.element(drawer).not.toHaveAttribute('open');

  drawer.setAttribute('open', '');
  await expect.element(dialog()).toBeVisible();
  drawer.removeAttribute('open');
  await expect.element(dialog()).not.toBeInTheDocument();
  expect(drawer.open).toBe(false);
});

it.each([
  ['ltr', 'start', 'left'],
  ['ltr', 'end', 'right'],
  ['rtl', 'start', 'right'],
  ['rtl', 'end', 'left'],
  ['rtl', 'bottom', 'bottom'],
] as const)(
  'S2 places a %s %s drawer at the %s edge and shows its slots',
  async (dir, placement, edge) => {
    fixture.dir = dir;
    const drawer = mount(
      { placement },
      `
    <button slot="header-actions" type="button">Help</button>
    <p>Incident details</p>
    <button slot="footer" type="button">Save</button>
  `,
    );
    await open(drawer);
    await settleEntryMotion();
    const expected = { left: 0, right: window.innerWidth, bottom: window.innerHeight };
    await expect
      .poll(() => Math.abs(part(drawer, 'dialog').getBoundingClientRect()[edge] - expected[edge]))
      .toBeLessThan(0.5);
    await expect.element(page.getByText('Incident details')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Help' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Save' })).toBeVisible();
  },
);

it('S3 leaves a page action usable and no backdrop in non-modal mode', async () => {
  const action = document.createElement('button');
  action.textContent = 'Refresh incident list';
  fixture.append(action);
  let clicked = false;
  action.addEventListener('click', () => {
    clicked = true;
  });
  const drawer = mount({ modal: 'false' });

  await open(drawer);
  await userEvent.click(action);

  expect(clicked).toBe(true);
  action.focus();
  await expect.element(action).toHaveFocus();
  expect(drawer.open).toBe(true);
  const surface = part(drawer, 'dialog');
  expect(surface.matches(':modal')).toBe(false);
  expect(getComputedStyle(surface, '::backdrop').backgroundColor).toBe('rgba(0, 0, 0, 0)');
  await userEvent.keyboard('{Escape}');
  expect(drawer.open).toBe(true);
  part(drawer, 'close').focus();
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog()).not.toBeInTheDocument();
});

it('S3 restores modal behavior when the non-modal attribute is removed', async () => {
  const drawer = mount({ modal: 'false' });
  await open(drawer);
  drawer.removeAttribute('modal');

  await expect.poll(() => part(drawer, 'dialog').matches(':modal')).toBe(true);
  expect(drawer.open).toBe(true);
});

it.each([
  ['button', async () => closeButton().click()],
  ['escape', async () => userEvent.keyboard('{Escape}')],
  ['method', async (drawer: Drawer) => drawer.close()],
  [
    'open state',
    (drawer: Drawer) => {
      drawer.removeAttribute('open');
    },
  ],
  [
    'swipe',
    (drawer: Drawer) => {
      swipe(drawer, 4, 80);
    },
  ],
] as const)('S4 allows the application to veto a %s close request', async (source, dismiss) => {
  const drawer = mount({ placement: 'bottom' });
  await open(drawer);
  const seen = reasons(drawer, true);

  await dismiss(drawer);

  expect(seen).toEqual([source === 'open state' ? 'method' : source]);
  await expect.element(dialog()).toBeVisible();
  await expect.element(drawer).toHaveAttribute('open');
});

it('S4 accepts a later close request after the veto is removed', async () => {
  const drawer = mount();
  await open(drawer);
  drawer.addEventListener(
    'ki-close',
    (event) => {
      event.preventDefault();
    },
    { once: true },
  );

  await drawer.close();
  expect(drawer.open).toBe(true);
  await drawer.close();

  expect(drawer.open).toBe(false);
  await expect.element(dialog()).not.toBeInTheDocument();
});

it('S5 closes a bottom sheet on a deliberate downward touch from the handle', async () => {
  const drawer = mount({ placement: 'bottom' });
  await open(drawer);
  const seen = reasons(drawer);
  await expect.element(part(drawer, 'handle')).toBeVisible();

  swipe(drawer, 4, 80);

  expect(seen).toEqual(['swipe']);
  await expect.element(dialog()).not.toBeInTheDocument();
});

it.each([
  [0, 10],
  [90, 50],
  [0, -80],
])('S6 ignores a touch delta of %i × %i', async (dx, dy) => {
  const drawer = mount({ placement: 'bottom' });
  await open(drawer);
  const seen = reasons(drawer);

  swipe(drawer, dx, dy);

  expect(seen).toEqual([]);
  await expect.element(dialog()).toBeVisible();
});

it('S7 focuses a slotted field, wraps Tab and restores the trigger on Escape', async () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Edit';
  trigger.tabIndex = 0;
  fixture.append(trigger);
  const drawer = mount(
    {},
    `
    <ki-input label="Title"></ki-input>
    <button slot="footer" type="button" tabindex="0">Save</button>
  `,
  );
  const input = drawer.querySelector('ki-input');
  trigger.addEventListener('click', () => {
    void drawer.show();
  });
  trigger.focus();

  await userEvent.keyboard('{Enter}');

  await expect.element(dialog()).toBeVisible();
  await expect.poll(() => input?.shadowRoot?.activeElement?.localName).toBe('input');
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  // At document level, focus on a shadow button is reported as focus on its host.
  await expect.poll(() => drawer.shadowRoot?.activeElement).toBe(closeButton().element());
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');

  await expect.element(dialog()).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

it('S7 honors an autofocus footer action on an initially open drawer', async () => {
  mount({ open: '' }, '<button slot="footer" type="button" autofocus tabindex="0">Cancel</button>');

  await expect.element(dialog()).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toHaveFocus();
});

it('S8 closes a bottom sheet via its localized Close button', async () => {
  const drawer = mount({ placement: 'bottom', 'close-label': 'Dismiss sheet' });
  await open(drawer);
  const close = page.getByRole('button', { name: 'Dismiss sheet', exact: true });
  await expect.poll(() => drawer.shadowRoot?.activeElement).toBe(close.element());

  await userEvent.keyboard('{Enter}');

  await expect.element(dialog()).not.toBeInTheDocument();
});

it('S8 restores the default name when the close-label attribute is cleared', async () => {
  const drawer = mount({ 'close-label': 'Dismiss sheet' });
  await open(drawer);

  drawer.removeAttribute('close-label');

  await expect.element(closeButton()).toHaveAccessibleName('Close');
});

it.each([true, false])(
  'S9 exposes the heading and the modality when modal is %s',
  async (modal) => {
    const drawer = mount({ modal: String(modal) });

    await open(drawer);

    await expect.element(dialog()).toHaveAccessibleName('Edit incident');
    expect(part(drawer, 'dialog').getAttribute('aria-modal')).toBe(modal ? 'true' : null);
    await expect.element(closeButton()).toBeVisible();
    await expectAccessible(fixture);
  },
);

it('S10 follows the raised surface and size tokens and accepts an explicit bottom height cap', async () => {
  document.documentElement.style.setProperty('--ki-surface-s1', 'rgb(242, 246, 250)');
  fixture.style.setProperty('--ki-drawer-size', '220px');
  const drawer = mount({}, '<p style="min-block-size:400px">Incident details</p>');

  await open(drawer);
  const surface = part(drawer, 'dialog');
  expect(getComputedStyle(surface).backgroundColor).toBe('rgb(242, 246, 250)');
  await expect.poll(() => surface.getBoundingClientRect().width).toBeCloseTo(220);

  drawer.size = '160px';
  drawer.placement = 'bottom';
  await expect.poll(() => surface.getBoundingClientRect().height).toBeCloseTo(160);
  const body = part(drawer, 'body');
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
  await expect.poll(() => body.tabIndex).toBe(0);
});

it.for(['onmars', 'material3'])(
  'S12 preserves the drawer edge and close affordance in %s forced colors',
  async (theme, test) => {
    await browser.emulateForcedColors('active');
    if (!matchMedia('(forced-colors: active)').matches)
      test.skip('Browser lacks forced-colors emulation');
    fixture.setAttribute('data-ki-theme', theme);
    const drawer = mount();
    drawer.style.setProperty('--ki-drawer-bg-image', 'linear-gradient(red, blue)');

    await open(drawer);

    const surface = getComputedStyle(part(drawer, 'dialog'));
    const close = getComputedStyle(part(drawer, 'close'));
    expect(surface.backgroundImage).toBe('none');
    expect(Number.parseFloat(surface.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(surface.borderBlockStartColor).not.toBe(surface.backgroundColor);
    expect(close.color).not.toBe(close.backgroundColor);
    await expect.element(closeButton()).toBeVisible();
  },
);
