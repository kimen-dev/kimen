import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:025-ki-video
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// Media fixture (declared decision): a slotted native <video muted> with NO
// source, a canvas-generated data-URI poster and a data-URI WebVTT captions
// track — zero binaries, zero dependencies. The HTML play() algorithm on a
// sourceless element still flips `paused` and fires exactly one `play` event
// (resource selection just waits for sources), so "playback starts exactly
// once" is observable without shipping media bytes; `muted` keeps the
// fixture inside every autoplay policy and is the spec's own "no audio is
// heard" posture (S3). The 16:9 ratio comes from the width/height
// attributes, exactly as consumer markup declares it.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-video.js';

type KiVideoElement = HTMLElement & { label?: string };

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const STYLE_ID = 'ki-video-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-video-browser-material3-token-style';

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.appendChild(style);
}

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

function cleanup(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  document.documentElement.removeAttribute('dir');
  landmark().replaceChildren();
}

async function waitUntil(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), what).toBe(true);
}

let cachedPoster: string | undefined;

/** Deterministic data-URI poster: no fixture files, stable across mounts. */
function posterDataUri(): string {
  if (cachedPoster) {
    return cachedPoster;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 18;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#3a3a3a';
    context.fillRect(0, 0, 32, 18);
  }
  cachedPoster = canvas.toDataURL('image/png');
  return cachedPoster;
}

/** The consumer's media element: poster, captions, no controls, no source. */
function mediaFixture(): HTMLVideoElement {
  const video = document.createElement('video');
  video.setAttribute('muted', '');
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('width', '1280');
  video.setAttribute('height', '720');
  video.setAttribute('poster', posterDataUri());
  const track = document.createElement('track');
  track.setAttribute('kind', 'captions');
  track.setAttribute('srclang', 'es');
  track.setAttribute('label', 'Español');
  track.setAttribute('src', 'data:text/vtt,WEBVTT');
  video.appendChild(track);
  return video;
}

/** Stencil renders async: wait until the play control exists. */
async function mount(
  container: HTMLElement,
  attributes: Record<string, string> = {},
  media: HTMLVideoElement = mediaFixture(),
): Promise<KiVideoElement> {
  ensureTokens();
  const el = document.createElement('ki-video') as KiVideoElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  el.appendChild(media);
  container.appendChild(el);
  await customElements.whenDefined('ki-video');
  await waitUntil(
    () => Boolean(el.shadowRoot?.querySelector('[part="play"]')),
    'ki-video did not render its play control',
  );
  return el;
}

function playControlOf(el: KiVideoElement): HTMLButtonElement {
  const play = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="play"]');
  expect(play).toBeTruthy();
  if (!play) {
    throw new Error('ki-video did not render its play control');
  }
  return play;
}

function frameOf(el: KiVideoElement): HTMLElement {
  const frame = el.shadowRoot?.querySelector<HTMLElement>('[part="frame"]');
  expect(frame).toBeTruthy();
  if (!frame) {
    throw new Error('ki-video did not render its frame');
  }
  return frame;
}

function mediaOf(el: KiVideoElement): HTMLVideoElement {
  const media = el.querySelector('video');
  expect(media).toBeTruthy();
  if (!media) {
    throw new Error('ki-video has no slotted media');
  }
  return media;
}

function countPlays(media: HTMLVideoElement): () => number {
  let plays = 0;
  media.addEventListener('play', () => {
    plays += 1;
  });
  return () => plays;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-video', () => {
  it('S1 presents the poster in the themed frame behind one centered play control', async () => {
    cleanup();
    const pane = document.createElement('div');
    pane.style.inlineSize = '480px';
    landmark().appendChild(pane);
    const el = await mount(pane, { label: 'Play the product tour' });

    // The consumer's poster fills the frame (FR-001)...
    const media = mediaOf(el);
    expect(media.getAttribute('poster')).toBe(posterDataUri());
    const frameRect = frameOf(el).getBoundingClientRect();
    expect(media.getBoundingClientRect().width).toBe(frameRect.width);
    // ...inside the token-resolved frame (FR-007): big_component/radius_xs.
    expect(getComputedStyle(frameOf(el)).borderRadius).toBe('16px');
    expect(readTokenLength('--ki-video-play-size')).toBe(56);
    // ...and exactly one interactive element, centered in both axes:
    expect(el.shadowRoot?.querySelectorAll('button, [tabindex]')).toHaveLength(1);
    expect(media.hasAttribute('controls')).toBe(false);
    const playRect = playControlOf(el).getBoundingClientRect();
    expect(
      Math.abs(playRect.left + playRect.width / 2 - (frameRect.left + frameRect.width / 2)),
    ).toBeLessThan(1.5);
    expect(
      Math.abs(playRect.top + playRect.height / 2 - (frameRect.top + frameRect.height / 2)),
    ).toBeLessThan(1.5);
  });

  it('S2 activating the play control starts playback exactly once and yields to the native player', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const media = mediaOf(el);
    const plays = countPlays(media);

    await userEvent.click(playControlOf(el));

    await waitUntil(() => plays() === 1, 'activation did not start playback');
    expect(media.paused).toBe(false);
    // The native player controls take over the surface (FR-002)...
    expect(media.controls).toBe(true);
    await waitUntil(
      () => getComputedStyle(playControlOf(el)).visibility === 'hidden',
      'the facade did not yield the surface',
    );
    // ...and the facade never comes back: a second activation attempt is
    // inert (pointer-events are off; even a programmatic click is guarded).
    playControlOf(el).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(plays()).toBe(1);
    expect(getComputedStyle(playControlOf(el)).pointerEvents).toBe('none');
  });

  it('S3 the video never plays on its own: nothing starts and nothing sounds after load', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const media = mediaOf(el);
    const plays = countPlays(media);

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(plays()).toBe(0);
    expect(media.paused).toBe(true);
    expect(media.currentTime).toBe(0);
    expect(media.muted).toBe(true);
  });

  it('S4 the frame follows a narrow container and the media keeps its 16:9 proportions', async () => {
    cleanup();
    const pane = document.createElement('div');
    pane.style.inlineSize = '240px';
    landmark().appendChild(pane);
    const el = await mount(pane, { label: 'Play the product tour' });

    const mediaRect = mediaOf(el).getBoundingClientRect();
    expect(mediaRect.width).toBe(240);
    // width/height attributes carry the intrinsic ratio: 240 × 9/16 = 135.
    expect(Math.abs(mediaRect.height - 135)).toBeLessThan(1.5);
    expect(Math.abs(frameOf(el).getBoundingClientRect().height - 135)).toBeLessThan(1.5);
  });

  it('S5 an unrecognized variant attribute keeps the default appearance and an operable control', async () => {
    cleanup();
    const control = await mount(landmark(), { label: 'Play the product tour' });
    const controlRadius = getComputedStyle(frameOf(control)).borderRadius;

    const el = await mount(landmark(), { variant: 'hero', label: 'Play the product tour' });
    const media = mediaOf(el);
    const plays = countPlays(media);

    // Unknown vocabulary from another design system matches no code path
    // and no selector: same anatomy, same token-resolved appearance...
    expect(el.shadowRoot?.querySelectorAll('button')).toHaveLength(1);
    expect(getComputedStyle(frameOf(el)).borderRadius).toBe(controlRadius);
    // ...and the play control remains operable (FR-009).
    await userEvent.click(playControlOf(el));
    await waitUntil(() => plays() === 1, 'the control was not operable under unknown vocabulary');
  });

  it('S6 Tab reaches the play control directly with a visible focus indicator', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(el);
    const play = playControlOf(el);
    expect(el.shadowRoot?.activeElement).toBe(play);
    // The theme's focus ring (S6): outline resolves from the focus tokens.
    const focused = getComputedStyle(play);
    expect(focused.outlineStyle).toBe('solid');
    expect(Number.parseFloat(focused.outlineWidth)).toBe(2);
  });

  it('S7 Enter starts playback from the keyboard exactly once', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const media = mediaOf(el);
    const plays = countPlays(media);

    playControlOf(el).focus();
    expect(el.shadowRoot?.activeElement).toBe(playControlOf(el));
    await userEvent.keyboard('{Enter}');

    await waitUntil(() => plays() === 1, 'Enter did not start playback');
    expect(media.paused).toBe(false);
    expect(media.controls).toBe(true);
  });

  it('S8 exposes exactly one button named from label while the frame contributes nothing, and passes axe', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    el.id = 's8-video';

    // The REAL computed accessibility tree (Playwright ariaSnapshot): one
    // button named from `label`; the frame adds no role, name or state.
    const snapshot = await browserCommands.ariaSnapshot('#s8-video');
    expect(snapshot).toMatch(/- button "Play the product tour"/);
    expect(snapshot.match(/- button/g)).toHaveLength(1);
    expect(frameOf(el).getAttribute('role')).toBeNull();
    expect(frameOf(el).getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('role')).toBeNull();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 captions on the slotted media stay available after playback starts', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const media = mediaOf(el);

    await userEvent.click(playControlOf(el));
    await waitUntil(() => media.controls, 'activation did not enable the native controls');

    // The consumer's track passes through untouched (FR-005): still a child
    // of their element and listed by the media's text tracks, enableable
    // from the native player (S9, SC-005).
    expect(media.querySelectorAll('track')).toHaveLength(1);
    expect(media.textTracks).toHaveLength(1);
    expect(media.textTracks[0]?.kind).toBe('captions');
    expect(media.textTracks[0]?.language).toBe('es');
  });

  it('S10 material3 restyles frame and play control through tokens alone with unchanged markup', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Play the product tour' });
    const onmarsPlayBg = readTokenColor('--ki-video-play-bg');
    const onmarsFrameRadius = readTokenLength('--ki-video-frame-radius');
    const onmarsScrimPadding = readTokenLength('--ki-video-scrim-padding');
    const onmarsPlayRadius = readTokenLength('--ki-video-play-radius');
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Play the product tour' });

    // Frame radius, scrim and play control resolve from material3 token
    // values (S10): 12dp medium shape, no halo, round filled control —
    // zero markup or component changes.
    expect(el.outerHTML).toBe(markup);
    expect(readTokenLength('--ki-video-frame-radius')).toBe(12);
    expect(onmarsFrameRadius).toBe(16);
    expect(readTokenLength('--ki-video-scrim-padding')).toBe(0);
    expect(onmarsScrimPadding).toBe(16);
    // M3 shape Round: the radius token resolves to the theme's full-round
    // primitive (≥1000px), replacing the onmars 14px glass square.
    expect(readTokenLength('--ki-video-play-radius')).toBeGreaterThanOrEqual(1000);
    expect(onmarsPlayRadius).toBe(14);
    expect(readTokenColor('--ki-video-play-bg')).not.toBe(onmarsPlayBg);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S12 reduced motion dismisses the facade without transitional motion', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('reduce');
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const play = playControlOf(el);

    // The computed transitions of the facade are inert (SC-007): durations
    // resolve to zero under prefers-reduced-motion by construction.
    for (const duration of getComputedStyle(play).transitionDuration.split(',')) {
      expect(Number.parseFloat(duration)).toBe(0);
    }

    await userEvent.click(play);
    await waitUntil(
      () => getComputedStyle(play).visibility === 'hidden',
      'the facade was not dismissed',
    );
    expect(getComputedStyle(play).opacity).toBe('0');
    for (const duration of getComputedStyle(play).transitionDuration.split(',')) {
      expect(Number.parseFloat(duration)).toBe(0);
    }
    await browserCommands.emulateReducedMotion(null);
  });
});
