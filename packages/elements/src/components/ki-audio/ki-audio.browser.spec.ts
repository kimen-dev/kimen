// @spec:125-ki-audio
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-audio.js';

const browser = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.style.removeProperty('--ki-surface-raised');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function required<T>(value: T | undefined | null): T {
  if (value == null) throw new Error('Expected the audio fixture to be rendered');
  return value;
}

async function mount(attributes: Record<string, string> = {}): Promise<HTMLElement> {
  const host = document.createElement('ki-audio');
  host.setAttribute('title', 'Interview');
  for (const [name, value] of Object.entries(attributes)) {
    host.setAttribute(name, value);
  }
  fixture.append(host);
  await expect.element(page.getByRole('group', { name: 'Interview' })).toBeVisible();
  return host;
}

function part(host: HTMLElement, name: string): HTMLElement {
  return required(host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`));
}

const playButton = () => page.getByRole('button', { name: 'Play', exact: true });
const pauseButton = () => page.getByRole('button', { name: 'Pause', exact: true });
const seek = () => page.getByRole('slider', { name: 'Seek' });

function seekPart(host: HTMLElement, name: string): HTMLElement {
  const slider = host.shadowRoot?.querySelector('ki-slider');
  return required(slider?.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`));
}

/** Substitute only the media resource and its timeline. Controls, focus, and events run in the browser. */
function simulateRecording(media: HTMLAudioElement, duration: number) {
  let paused = true;
  let ended = false;
  let currentTime = 0;
  const signal = (type: string) => media.dispatchEvent(new Event(type));
  const play = vi.fn(() => {
    paused = false;
    ended = false;
    signal('play');
    return Promise.resolve();
  });
  const pause = vi.fn(() => {
    paused = true;
    signal('pause');
  });
  Object.defineProperties(media, {
    duration: { get: () => duration },
    paused: { get: () => paused },
    ended: { get: () => ended },
    currentTime: {
      get: () => currentTime,
      set: (seconds: number) => {
        currentTime = seconds;
        signal('timeupdate');
      },
    },
    play: { value: play },
    pause: { value: pause },
  });

  return {
    play,
    pause,
    finish: () => {
      paused = true;
      ended = true;
      media.currentTime = duration;
      signal('ended');
    },
  };
}

async function mountRecording({
  currentTime = 0,
  duration = 725,
  attributes = {},
}: {
  currentTime?: number;
  duration?: number;
  attributes?: Record<string, string>;
} = {}) {
  const host = await mount(attributes);
  const findAudio = () => host.shadowRoot?.querySelector('audio');
  await expect.poll(findAudio).toBeInstanceOf(HTMLAudioElement);
  const media = required(findAudio());
  const recording = simulateRecording(media, duration);
  // The shim supplies metadata and playback. Keep the placeholder URL from
  // triggering a request while leaving source selection under test.
  media.preload = 'none';
  host.setAttribute('src', '/ep4.mp3');
  await expect.poll(() => media.getAttribute('src')).toBe('/ep4.mp3');
  media.dispatchEvent(new Event('loadedmetadata'));
  media.currentTime = currentTime;
  await expect.element(playButton()).toBeEnabled();
  await expect.element(seek()).toHaveAttribute('aria-valuemax', String(duration));
  return { host, media, ...recording };
}

it('S1 stays paused until Play is activated and forwards one play event', async () => {
  const { host, media, play } = await mountRecording({ attributes: { autoplay: '' } });
  const event = vi.fn();
  host.addEventListener('play', event);
  expect(media.autoplay).toBe(false);
  expect(play).toHaveBeenCalledTimes(0);

  await playButton().click();

  await expect.element(pauseButton()).toBeVisible();
  expect(media.paused).toBe(false);
  expect(play).toHaveBeenCalledTimes(1);
  expect(event).toHaveBeenCalledTimes(1);
});

it('S2 chooses a playback speed with the keyboard and returns focus to its trigger', async () => {
  const { host, media } = await mountRecording();
  const speed = part(host, 'speed');
  const menu = page.getByRole('menu');
  speed.focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(menu).toBeVisible();
  await expect
    .element(page.getByRole('menuitemradio', { name: '1×', exact: true }))
    .toHaveAttribute('aria-checked', 'true');

  await userEvent.keyboard('{End}{ArrowUp}{Enter}');

  await expect.element(menu).not.toBeVisible();
  await expect.poll(() => media.playbackRate).toBe(1.5);
  await expect.element(page.getByRole('button', { name: 'Playback speed: 1.5×' })).toBeVisible();
  expect(host.shadowRoot?.activeElement).toBe(speed);
});

it('S3 toggles the native muted state and names the next action', async () => {
  const { media } = await mountRecording();
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  const unmute = page.getByRole('button', { name: 'Unmute', exact: true });

  await mute.click();

  await expect.element(unmute).toBeVisible();
  expect(media.muted).toBe(true);

  await unmute.click();

  await expect.element(mute).toBeVisible();
  expect(media.muted).toBe(false);
});

it('S4 pauses on Space while Seek keeps focus and forwards one pause event', async () => {
  const { host, media, pause } = await mountRecording();
  const event = vi.fn();
  host.addEventListener('pause', event);
  await playButton().click();
  await expect.element(pauseButton()).toBeVisible();
  const thumb = seekPart(host, 'thumb');
  thumb.focus();

  await userEvent.keyboard(' ');

  await expect.element(playButton()).toBeVisible();
  expect(media.paused).toBe(true);
  expect(pause).toHaveBeenCalledTimes(1);
  expect(event).toHaveBeenCalledTimes(1);
  expect(thumb.getRootNode()).toBeInstanceOf(ShadowRoot);
  expect((thumb.getRootNode() as ShadowRoot).activeElement).toBe(thumb);
});

it('S5 seeks five seconds in each direction without leaving Seek', async () => {
  const { host, media } = await mountRecording({ currentTime: 84 });
  seekPart(host, 'thumb').focus();

  await userEvent.keyboard('{ArrowRight}');
  await expect.element(seek()).toHaveAttribute('aria-valuenow', '89');
  expect(media.currentTime).toBe(89);

  await userEvent.keyboard('{ArrowLeft}');
  await expect.element(seek()).toHaveAttribute('aria-valuenow', '84');
  expect(media.currentTime).toBe(84);
});

it.each([
  ['ArrowLeft', 2, 0],
  ['ArrowRight', 723, 725],
] as const)('S5 clamps %s at the edge of the available timeline', async (key, start, expected) => {
  const { host, media } = await mountRecording({ currentTime: start });
  seekPart(host, 'thumb').focus();

  await userEvent.keyboard(`{${key}}`);

  await expect.poll(() => media.currentTime).toBe(expected);
});

it('S6 exposes the named group and seek time with no axe findings', async () => {
  const { host } = await mountRecording({ currentTime: 84 });
  const group = page.getByRole('group', { name: 'Interview' });
  const groupSeek = group.getByRole('slider', { name: 'Seek' });

  seekPart(host, 'thumb').focus();

  await expect.element(groupSeek).toHaveAttribute('aria-valuetext', '1:24 of 12:05');
  await expect.element(group.getByText('1:24', { exact: true })).toBeVisible();
  await expect.element(group.getByText('12:05', { exact: true })).toBeVisible();
  await expectAccessible(fixture);
});

it('S7 repaints the player when the page overrides its raised-surface token', async () => {
  const host = await mount();
  const player = part(host, 'player');
  const background = () => getComputedStyle(player).backgroundColor;
  expect(background()).not.toBe('rgb(232, 238, 244)');

  fixture.style.setProperty('--ki-surface-raised', 'rgb(232, 238, 244)');

  await expect.poll(background).toBe('rgb(232, 238, 244)');
});

it('S9 renders the transcript URL as a named link', async () => {
  await mount({ 'transcript-href': '/ep4/transcript' });
  const transcript = page
    .getByRole('group', { name: 'Interview' })
    .getByRole('link', { name: 'Read the transcript' });

  await expect.element(transcript).toHaveAttribute('href', '/ep4/transcript');
  await expect.element(transcript).toBeVisible();
});

it('S10 forwards playback updates and restores Play at the end', async () => {
  const { host, media, finish } = await mountRecording({ currentTime: 722 });
  const update = vi.fn();
  const ended = vi.fn();
  host.addEventListener('timeupdate', update);
  host.addEventListener('ended', ended);
  await playButton().click();
  await expect.element(pauseButton()).toBeVisible();
  media.currentTime = 724;
  await expect.element(seek()).toHaveAttribute('aria-valuetext', '12:04 of 12:05');

  finish();

  await expect.element(playButton()).toBeVisible();
  await expect.element(seek()).toHaveAttribute('aria-valuetext', '12:05 of 12:05');
  expect(update).toHaveBeenCalledTimes(2);
  expect(ended).toHaveBeenCalledTimes(1);
});

it('S11 rejects a non-HTTP source and omits an unsafe transcript link', async () => {
  const host = await mount({
    src: 'data:audio/wav,invalid',
    'transcript-href': 'javascript:void(0)',
  });

  expect(host.shadowRoot?.querySelector('audio[src]')).toBeNull();
  await expect.element(playButton()).toBeDisabled();
  await expect
    .element(page.getByRole('link', { name: 'Read the transcript' }))
    .not.toBeInTheDocument();
});

it('clears the old timeline when the source is removed', async () => {
  const { host, media } = await mountRecording({ currentTime: 84 });
  await expect.element(seek()).toHaveAttribute('aria-valuetext', '1:24 of 12:05');

  host.removeAttribute('src');

  await expect.element(playButton()).toBeDisabled();
  await expect.element(seek()).toHaveAttribute('aria-disabled', 'true');
  await expect.element(seek()).toHaveAttribute('aria-valuenow', '0');
  expect(media.getAttribute('src')).toBeNull();
  expect(part(host, 'time').textContent).not.toMatch(/12:05|1:24/u);
});

it('seeks to the point selected on the track', async () => {
  const { host, media } = await mountRecording({ duration: 120 });

  await userEvent.click(seekPart(host, 'track'));

  await expect.poll(() => Math.abs(media.currentTime - 60)).toBeLessThan(2);
});

it('mirrors control placement and timeline navigation in RTL', async () => {
  const { host, media } = await mountRecording({ currentTime: 84, attributes: { dir: 'rtl' } });
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await expect.element(mute).toBeVisible();
  expect(playButton().element().getBoundingClientRect().left).toBeGreaterThan(
    mute.element().getBoundingClientRect().right,
  );
  const track = seekPart(host, 'track').getBoundingClientRect();
  const thumb = seekPart(host, 'thumb');
  expect(thumb.getBoundingClientRect().left).toBeGreaterThan(track.left + track.width / 2);
  thumb.focus();

  await userEvent.keyboard('{ArrowLeft}');

  await expect.poll(() => media.currentTime).toBe(89);
});

it('keeps a visible edge and distinguishable seek progress with forced colors', async ({
  skip,
}) => {
  await browser.emulateForcedColors('active');
  try {
    fixture.style.backgroundColor = 'rgb(1, 2, 3)';
    const paletteApplies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(paletteApplies).toBe(true);
    } else if (!paletteApplies()) {
      skip('This browser does not paint a forced palette under emulation');
    }
    const { host } = await mountRecording({ currentTime: 84 });
    const player = getComputedStyle(part(host, 'player'));
    const track = getComputedStyle(seekPart(host, 'track'));
    const fill = getComputedStyle(seekPart(host, 'fill'));
    expect(Number.parseFloat(player.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(player.borderBlockStartColor).not.toBe(player.backgroundColor);
    expect(track.backgroundColor).not.toBe(fill.backgroundColor);
  } finally {
    fixture.style.removeProperty('background-color');
    await browser.emulateForcedColors(null);
  }
});

it('shows the updated seek time immediately under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const { host, media } = await mountRecording();

    media.currentTime = 84;

    await expect.element(seek()).toHaveAttribute('aria-valuetext', '1:24 of 12:05');
    expect(part(host, 'player').getAnimations({ subtree: true })).toEqual([]);
    expect(seekPart(host, 'track').getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
