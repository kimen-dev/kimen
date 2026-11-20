// @spec:120-ki-rating
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from '../../../browser-tests/all-components';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

type RatingElement = HTMLElement & { value: number };

function radio(name: string) {
  return page.getByRole('radio', { name, exact: true });
}

async function mount(html: string, visibleName: string, role: 'radiogroup' | 'img' = 'radiogroup') {
  fixture.innerHTML = html;
  await expect.element(page.getByRole(role, { name: visibleName, exact: true })).toBeVisible();
  const rating = fixture.querySelector<RatingElement>('ki-rating');
  if (!rating?.shadowRoot) throw new Error('Expected a rendered rating');
  return { rating, shadow: rating.shadowRoot };
}

function changes(rating: RatingElement) {
  const events: { value: number }[] = [];
  rating.addEventListener('ki-change', (event) => {
    events.push((event as CustomEvent<{ value: number }>).detail);
  });
  return events;
}

function glyphs(shadow: ShadowRoot) {
  return [...shadow.querySelectorAll<HTMLElement>('[part="glyph"]')];
}

function glyphSvgs(glyph: HTMLElement) {
  return [...glyph.querySelectorAll('ki-icon')]
    .map((icon) => icon.shadowRoot?.querySelector('svg'))
    .filter((svg) => svg != null);
}

function glyphPaint(glyph: HTMLElement) {
  return glyphSvgs(glyph).map((svg) => getComputedStyle(svg));
}

function filledCounts(shadow: ShadowRoot) {
  return glyphs(shadow).map(
    (glyph) => glyphPaint(glyph).filter((style) => style.fill !== 'none').length,
  );
}

function formFixture() {
  const form = fixture.querySelector('form');
  if (!form) throw new Error('Expected a rating form');
  return form;
}

it('S1 shows an unrounded score with a half-filled glyph', async () => {
  const { shadow } = await mount(
    '<ki-rating readonly label="Average rating" value="4.3"></ki-rating>',
    'Rated 4.3 out of 5',
    'img',
  );

  await expect.element(page.getByText('4.3', { exact: true })).toBeVisible();
  await expect.poll(() => filledCounts(shadow)).toEqual([1, 1, 1, 1, 1]);
  const last = glyphs(shadow).at(-1);
  if (!last) throw new Error('Expected the last glyph');
  const clip = glyphSvgs(last).at(-1)?.getRootNode();
  if (!(clip instanceof ShadowRoot) || !clip.host.parentElement) {
    throw new Error('Expected the clipping element for the filled glyph');
  }
  expect(clip.host.parentElement.getBoundingClientRect().width).toBeCloseTo(
    last.getBoundingClientRect().width / 2,
  );
});

it('S2 updates fill and visible score and emits only for changed choices', async () => {
  const { rating, shadow } = await mount(
    '<ki-rating label="Usefulness"></ki-rating>',
    'Usefulness',
  );
  const events = changes(rating);

  await radio('3 stars').click();
  await expect.element(page.getByText('3 of 5', { exact: true })).toBeVisible();
  await expect.poll(() => filledCounts(shadow)).toEqual([1, 1, 1, 0, 0]);
  await radio('3 stars').click();

  expect(rating.value).toBe(3);
  expect(events).toEqual([{ value: 3 }]);
});

it('S3 exposes and selects the half step of a star by pointer', async () => {
  const { rating, shadow } = await mount(
    '<ki-rating label="Usefulness" precision="0.5"></ki-rating>',
    'Usefulness',
  );
  const events = changes(rating);

  await radio('2.5 stars').click();

  await expect.element(radio('2.5 stars')).toBeChecked();
  await expect.element(page.getByText('2.5 of 5', { exact: true })).toBeVisible();
  await expect.poll(() => filledCounts(shadow)).toEqual([1, 1, 1, 0, 0]);
  expect(events).toEqual([{ value: 2.5 }]);
});

it('S4 enters the group on one tab stop without changing the selection', async () => {
  const { rating, shadow } = await mount(
    '<button tabindex="0">Before</button><ki-rating label="Usefulness" value="3"></ki-rating><button tabindex="0">After</button>',
    'Usefulness',
  );
  const events = changes(rating);
  fixture.querySelector('button')?.focus();

  await userEvent.keyboard('{Tab}');

  await expect.poll(() => shadow.activeElement).toBe(radio('3 stars').element());
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
  expect(events).toEqual([]);
});

it('S5 wraps forward and selects once with ArrowRight', async () => {
  const { rating, shadow } = await mount(
    '<ki-rating label="Usefulness" value="5"></ki-rating>',
    'Usefulness',
  );
  const events = changes(rating);
  (radio('5 stars').element() as HTMLElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(radio('1 star')).toBeChecked();
  await expect.poll(() => shadow.activeElement).toBe(radio('1 star').element());
  expect(events).toEqual([{ value: 1 }]);
});

it('S6 selects the first focused option with Space', async () => {
  const { rating, shadow } = await mount(
    '<button tabindex="0">Before</button><ki-rating label="Usefulness"></ki-rating>',
    'Usefulness',
  );
  const events = changes(rating);
  fixture.querySelector('button')?.focus();
  await userEvent.keyboard('{Tab}');
  await expect.poll(() => shadow.activeElement).toBe(radio('1 star').element());

  await userEvent.keyboard(' ');

  await expect.element(radio('1 star')).toBeChecked();
  expect(events).toEqual([{ value: 1 }]);
});

it('S7 reverses horizontal navigation for inherited RTL', async () => {
  const { shadow } = await mount(
    '<div dir="rtl"><ki-rating label="Usefulness" value="3"></ki-rating></div>',
    'Usefulness',
  );
  const [first, second] = glyphs(shadow);
  if (!first || !second) throw new Error('Expected adjacent glyphs');
  expect(first.getBoundingClientRect().left).toBeGreaterThan(second.getBoundingClientRect().left);
  (radio('3 stars').element() as HTMLElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(radio('2 stars')).toBeChecked();
  await expect.poll(() => shadow.activeElement).toBe(radio('2 stars').element());
});

it('S8 exposes one named image with the exact score and no radios', async () => {
  await mount(
    '<ki-rating readonly label="Average rating" value="4.2"></ki-rating>',
    'Rated 4.2 out of 5',
    'img',
  );
  const snapshot = await browserCommands.ariaSnapshot('main');

  expect(snapshot.match(/- img /gu)).toHaveLength(1);
  expect(snapshot).toContain('Rated 4.2 out of 5');
  expect(snapshot).not.toContain('radio');
  await expectAccessible(fixture);
});

it('S9 exposes a named radiogroup and checked radio and passes axe', async () => {
  await mount('<ki-rating label="Usefulness" value="3"></ki-rating>', 'Usefulness');

  await expect.element(radio('3 stars')).toBeChecked();
  expect(
    page.getByRole('radiogroup', { name: 'Usefulness' }).getByRole('radio').all(),
  ).toHaveLength(5);
  await expectAccessible(fixture);
});

it('S10 submits one decimal value for each named rating', async () => {
  await mount(
    `<form><ki-rating label="Usefulness" name="usefulness" precision="0.5" value="2.5"></ki-rating>
    <ki-rating label="Clarity" name="clarity" value="4"></ki-rating>
    <ki-rating readonly label="Average rating" name="average" value="4.2"></ki-rating></form>`,
    'Usefulness',
  );
  const form = formFixture();
  let submitted: FormData | undefined;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = new FormData(form);
  });

  form.requestSubmit();

  expect(submitted?.getAll('usefulness')).toEqual(['2.5']);
  expect(submitted?.getAll('clarity')).toEqual(['4']);
  expect(submitted?.has('average')).toBe(false);
});

it('S11 blocks required submission until the rating has a selection', async () => {
  const { rating } = await mount(
    '<form><ki-rating label="Usefulness" name="usefulness" required></ki-rating></form>',
    'Usefulness',
  );
  const form = formFixture();
  const invalid = vi.fn();
  const submitted = vi.fn((event: Event) => { event.preventDefault(); });
  rating.addEventListener('invalid', invalid);
  form.addEventListener('submit', submitted);

  form.requestSubmit();

  expect(invalid).toHaveBeenCalledOnce();
  expect(submitted).not.toHaveBeenCalled();
  await expect
    .element(page.getByRole('radiogroup', { name: 'Usefulness' }))
    .toHaveAttribute('aria-required', 'true');
  await radio('1 star').click();
  form.requestSubmit();
  expect(submitted).toHaveBeenCalledOnce();
});

it('S12 resets the selected radio and submitted value silently', async () => {
  const { rating } = await mount(
    '<form><ki-rating label="Usefulness" name="usefulness" value="2"></ki-rating></form>',
    'Usefulness',
  );
  await radio('4 stars').click();
  const events = changes(rating);
  const form = formFixture();

  form.reset();

  await expect.element(radio('2 stars')).toBeChecked();
  expect(new FormData(form).getAll('usefulness')).toEqual(['2']);
  expect(events).toEqual([]);
});

it('S13 disabled fieldsets remove choices from focus and submission', async () => {
  await mount(
    `<form><button tabindex="0" type="button">Before</button><fieldset disabled>
      <ki-rating label="Usefulness" name="usefulness" value="3"></ki-rating>
    </fieldset><button tabindex="0" type="button">After</button></form>`,
    'Usefulness',
  );
  await expect.element(radio('3 stars')).toBeDisabled();
  fixture.querySelector('button')?.focus();

  await userEvent.keyboard('{Tab}');

  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
  expect(new FormData(formFixture()).has('usefulness')).toBe(false);
});

it('S14 paints filled and empty glyphs using their theme overrides', async () => {
  const { rating, shadow } = await mount(
    '<ki-rating label="Usefulness" value="3"></ki-rating>',
    'Usefulness',
  );
  rating.style.setProperty('--ki-rating-on-fg', 'rgb(130, 60, 10)');
  rating.style.setProperty('--ki-rating-off-fg', 'rgb(20, 80, 120)');

  const [first, , , fourth] = glyphs(shadow);
  if (!first || !fourth) throw new Error('Expected filled and empty glyphs');
  await expect.poll(() => glyphPaint(first).at(-1)?.fill).toBe('rgb(130, 60, 10)');
  await expect.poll(() => glyphPaint(fourth)[0]?.stroke).toBe('rgb(20, 80, 120)');
});

it('S15 keeps filled and outlined glyphs distinct in forced colours', async (test) => {
  const { shadow } = await mount(
    '<ki-rating label="Usefulness" value="3"></ki-rating>',
    'Usefulness',
  );
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  fixture.append(witness);
  try {
    await browserCommands.emulateForcedColors('active');
    if (
      !navigator.userAgent.includes('Chrome/') &&
      getComputedStyle(witness).backgroundColor === 'rgb(1, 2, 3)'
    ) {
      test.skip('This engine does not apply an emulated forced palette');
      return;
    }
    await expect.poll(() => getComputedStyle(witness).backgroundColor).not.toBe('rgb(1, 2, 3)');
    await expect.poll(() => filledCounts(shadow)).toEqual([1, 1, 1, 0, 0]);
    await expect.element(page.getByText('3 of 5', { exact: true })).toBeVisible();
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S16 applies the changed score without motion under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    const { shadow } = await mount(
      '<ki-rating label="Usefulness" value="2"></ki-rating>',
      'Usefulness',
    );
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

    await radio('3 stars').click();

    await expect.element(page.getByText('3 of 5', { exact: true })).toBeVisible();
    expect(shadow.querySelector('[part="scale"]')?.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
