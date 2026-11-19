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
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-video.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { hasVisibleShadow } from './contracts';
import { disableComponentEffectShadows } from './flat-effects';
import { resolvedShadowToken } from './resolved-token';

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

/** The painted play disc inside the play control's halo. */
function discOf(el: KiVideoElement): HTMLElement {
  const disc = playControlOf(el).querySelector<HTMLElement>('.control');
  expect(disc).toBeTruthy();
  if (!disc) {
    throw new Error('ki-video did not paint its play disc');
  }
  return disc;
}

/** How far the halo extends past the disc on each side, in px. */
function haloInset(el: KiVideoElement): number {
  return (
    (playControlOf(el).getBoundingClientRect().width - discOf(el).getBoundingClientRect().width) / 2
  );
}

/** What a viewer sees of the play control: its shape, inset and paint. */
function playAppearance(el: KiVideoElement) {
  const disc = getComputedStyle(discOf(el));
  return {
    frameRadius: getComputedStyle(frameOf(el)).borderTopLeftRadius,
    haloInset: haloInset(el),
    discRadius: Number.parseFloat(disc.borderTopLeftRadius),
    discBackground: disc.backgroundColor,
  };
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
    // ...behind a 56px play disc (Placeholder_xl).
    const disc = discOf(el).getBoundingClientRect();
    expect(disc.width).toBe(56);
    expect(disc.height).toBe(56);
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
    // The Placeholder_xl play vector (12089:6573): inset 20.83% / 12.5% /
    // 16.67% / 12.5% of the 28px icon slot, so the glyph ink spans 15x18 of
    // the 24-unit viewBox — 17.5x21px rendered, not the old 12.8x13.9 path.
    const glyphSlot = el.shadowRoot?.querySelector('.glyph')?.getBoundingClientRect();
    expect(glyphSlot?.width).toBe(28);
    expect(glyphSlot?.height).toBe(28);
    const glyphPath = el.shadowRoot?.querySelector<SVGPathElement>('.glyph path');
    expect(glyphPath).toBeTruthy();
    if (!glyphPath) {
      throw new Error('ki-video did not render its play glyph');
    }
    const ink = glyphPath.getBBox();
    expect(ink.x).toBeCloseTo(5, 0);
    expect(ink.y).toBeCloseTo(3, 0);
    expect(ink.width).toBeCloseTo(15, 0);
    expect(ink.height).toBeCloseTo(18, 0);
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

  it('hovering the play control lifts the glass container through transform/box-shadow only', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('no-preference');
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const control = el.shadowRoot?.querySelector<HTMLElement>('.control');
    expect(control).toBeTruthy();
    if (!control) {
      throw new Error('ki-video did not render its glass container');
    }
    const rest = getComputedStyle(control, '::before').boxShadow;
    expect(getComputedStyle(control).transform).toBe('none');

    await userEvent.hover(playControlOf(el));

    // Hover updates the separate shadow layer and scales the container to 102%.
    // Both changes leave layout alone and use the motion tokens only when
    // reduced motion is off.
    await waitUntil(
      () => getComputedStyle(control, '::before').boxShadow !== rest,
      'hover did not lift the glass container',
    );
    await waitUntil(
      () => getComputedStyle(control).transform.startsWith('matrix(1.02'),
      'hover did not scale the glass container to 102%',
    );
    // Calma keeps the lift and makes the additional shadow layer transparent.
    expect(hasVisibleShadow(getComputedStyle(control, '::before').boxShadow)).toBe(false);

    await userEvent.unhover(playControlOf(el));
    await waitUntil(
      () => getComputedStyle(control).transform === 'none',
      'the glass container did not settle back at rest',
    );
    await browserCommands.emulateReducedMotion(null);
  });

  it('S10 keeps the play-container shadow on hover with component effect shadows disabled (#349)', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    disableComponentEffectShadows(el);
    el.style.setProperty('--ki-video-play-shadow', 'var(--ki-elevation-e2)');
    const control = el.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) {
      throw new Error('ki-video did not render its glass container');
    }
    const restShadow = resolvedShadowToken(control, '--ki-video-play-shadow');
    expect(getComputedStyle(control).boxShadow).toBe(restShadow);
    expect(hasVisibleShadow(restShadow)).toBe(true);

    await userEvent.hover(playControlOf(el));

    await expect.poll(() => getComputedStyle(control).transform).toMatch(/^matrix\(1\.02/u);
    expect(getComputedStyle(control).boxShadow).toBe(restShadow);
    expect(getComputedStyle(control, '::before').boxShadow).toBe('none');
    await userEvent.unhover(playControlOf(el));
  });

  it('S13 a theme can hide just the hover shadow', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    // Supply a visible hover effect because Calma ships a transparent layer.
    el.style.setProperty('--ki-effect-component-primary-hover-shadow', 'var(--ki-elevation-e2)');
    el.style.setProperty('--ki-effect-video-hover-opacity', '0');
    const control = el.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) {
      throw new Error('ki-video did not render its glass container');
    }
    const restShadow = resolvedShadowToken(control, '--ki-video-play-shadow');
    expect(getComputedStyle(control).boxShadow).toBe(restShadow);
    expect(hasVisibleShadow(restShadow)).toBe(true);

    await userEvent.hover(playControlOf(el));

    await expect.poll(() => getComputedStyle(control).transform).toMatch(/^matrix\(1\.02/u);
    expect(getComputedStyle(control).boxShadow).toBe(restShadow);
    const hoverLayer = getComputedStyle(control, '::before');
    expect(hoverLayer.opacity).toBe('0');
    const hoverShadow = resolvedShadowToken(control, '--ki-effect-component-primary-hover-shadow');
    await expect.poll(() => hoverLayer.boxShadow).toBe(hoverShadow);
    expect(hasVisibleShadow(hoverShadow)).toBe(true);
    await userEvent.unhover(playControlOf(el));
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

  it('S1 preexisting native controls on the slotted media are stripped until activation', async () => {
    cleanup();
    const media = mediaFixture();
    media.setAttribute('controls', '');
    media.controls = true;
    const el = await mount(landmark(), { label: 'Play the product tour' }, media);
    const slotted = mediaOf(el);

    // Before activation the centered play control is the ONLY interactive
    // element (S1/S6): common `<video controls>` markup must not leave a
    // second keyboard-reachable surface behind the facade.
    await waitUntil(() => !slotted.hasAttribute('controls'), 'controls were not stripped');
    expect(slotted.controls).toBe(false);
    expect(el.shadowRoot?.querySelectorAll('button, [tabindex]')).toHaveLength(1);

    // Activation hands the surface to the native player (FR-002).
    await userEvent.click(playControlOf(el));
    await waitUntil(() => slotted.controls, 'activation did not restore the native controls');
  });

  it('S3 preexisting autoplay on the slotted media is neutralized: playback must not precede activation', async () => {
    cleanup();
    const media = mediaFixture();
    media.setAttribute('autoplay', '');
    // Simulate autoplay already underway before the component upgrades
    // (muted autoplay is broadly permitted): playback must not survive
    // the facade's mount (FR-003).
    const playback: unknown = media.play();
    if (playback instanceof Promise) {
      playback.catch(() => undefined);
    }
    const el = await mount(landmark(), { label: 'Play the product tour' }, media);
    const slotted = mediaOf(el);

    await waitUntil(() => !slotted.hasAttribute('autoplay'), 'autoplay was not cleared');
    expect(slotted.autoplay).toBe(false);
    await waitUntil(() => slotted.paused, 'pre-activation playback was not paused');
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

  // A press shows whatever the input. Firefox never matches `:active` on a
  // button held with Space, so from the keyboard the press shows there only
  // because the component marks it itself (utils/keyboard-press).
  it('S6 the play control changes appearance while Space is held on it', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the tour' });
    const play = playControlOf(el);
    const control = play.querySelector<HTMLElement>('.control');
    if (!control) {
      throw new Error('ki-video did not render the play container');
    }
    const painted = (): string => {
      const style = getComputedStyle(control);
      return [style.boxShadow, style.transform].join('|');
    };
    play.focus();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const focused = painted();

    // `{ >}` holds the key down; the matching `{/ }` releases it.
    await userEvent.keyboard('{ >}');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const held = painted();
    await userEvent.keyboard('{/ }');

    expect(held, 'the play control looks the same while held from the keyboard').not.toBe(focused);
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

  // The facade button leaves the Tab order as it yields; a keyboard user who
  // just pressed it must land on the native player that replaced it, not be
  // dropped on the document body.
  it('S7 keyboard activation moves focus to the native player that takes over', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the tour' });
    const media = mediaOf(el);

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(playControlOf(el));
    await userEvent.keyboard('{Enter}');

    await waitUntil(
      () => getComputedStyle(playControlOf(el)).visibility === 'hidden',
      'the facade did not yield the surface',
    );
    expect(document.activeElement).toBe(media);
  });

  // A consumer may put the media in the Tab order themself. Behind the facade
  // that stop is a second, meaningless one ahead of the play control (S6);
  // once the native player takes over it is theirs again (FR-005).
  it('S6 a tabindex the consumer gave the media waits behind the facade until activation', async () => {
    cleanup();
    const media = mediaFixture();
    media.setAttribute('tabindex', '0');
    const el = await mount(landmark(), { label: 'Play the tour' }, media);

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(playControlOf(el));

    await userEvent.keyboard('{Enter}');
    await waitUntil(() => media.controls, 'the native player did not take over');
    expect(media.getAttribute('tabindex')).toBe('0');
  });

  // The facade holds the media out of the Tab order only while it slots it.
  // Taken out unplayed, the media is the consumer's again, tabindex included.
  it('S6 media taken out of the facade unplayed gets the consumer tabindex back', async () => {
    cleanup();
    const media = mediaFixture();
    media.setAttribute('tabindex', '0');
    await mount(landmark(), { label: 'Play the tour' }, media);
    expect(media.getAttribute('tabindex')).toBe('-1');

    landmark().append(media);

    await waitUntil(() => media.getAttribute('tabindex') === '0', 'the tabindex did not come back');
  });

  // Moved unplayed into another facade, the media keeps the consumer's value:
  // the second facade must not take the first one's temporary -1 for it.
  it('S6 media moved unplayed to another facade keeps the consumer tabindex', async () => {
    cleanup();
    const media = mediaFixture();
    media.setAttribute('tabindex', '0');
    await mount(landmark(), { label: 'Play the tour' }, media);
    const second = await mount(landmark(), { label: 'Play the other tour' }, mediaFixture());
    second.replaceChildren(media);
    await waitUntil(
      () => media.getAttribute('tabindex') === '-1' && !media.controls,
      'the second facade did not take the media',
    );

    playControlOf(second).click();

    await waitUntil(() => media.controls, 'the native player did not take over');
    expect(media.getAttribute('tabindex')).toBe('0');
  });

  // Whoever asks for the video's focus stop on the very next keystroke (a
  // ki-dialog wrapping Tab) must not be handed the control on its way out:
  // focus sent there falls to the document body once the facade hides. The
  // Tab order therefore changes with the activation itself, not with the
  // render it schedules.
  it('S7 the play control leaves the Tab order in the same turn it yields', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the tour' });
    const play = playControlOf(el);

    play.click();

    expect(play.tabIndex).toBe(-1);
  });

  it('S2 activation from elsewhere leaves focus where the person put it', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the tour' });
    const elsewhere = document.createElement('button');
    elsewhere.textContent = 'Elsewhere';
    landmark().append(elsewhere);
    elsewhere.focus();

    playControlOf(el).click();

    await waitUntil(() => mediaOf(el).controls, 'activation did not enable the native player');
    expect(document.activeElement).toBe(elsewhere);
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

    await expectAccessible(document.body);
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

  it('S11 honors a forced dark scheme: the play control repaints', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });

    expect(await repaintedUnderForcedDark(el)).toContain('play');
  });

  it('S10 material3 restyles frame and play control through tokens alone with unchanged markup', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Play the product tour' });
    const before = playAppearance(onmars);
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Play the product tour' });

    // Frame radius, scrim and play control resolve from material3 token
    // values (S10): 12dp medium shape, no halo, round filled control —
    // zero markup or component changes.
    expect(el.outerHTML).toBe(markup);
    const after = playAppearance(el);
    expect(before.frameRadius).toBe('16px');
    expect(after.frameRadius).toBe('12px');
    expect(before.haloInset).toBe(16);
    expect(after.haloInset).toBe(0);
    // M3 shape Round: the disc reads as a circle (its corner radius reaches
    // half its height), replacing the onmars 14px glass square.
    expect(before.discRadius).toBe(14);
    expect(after.discRadius).toBeGreaterThanOrEqual(discOf(el).getBoundingClientRect().height / 2);
    expect(after.discBackground).not.toBe(before.discBackground);

    await expectAccessible(document.body);
  });

  it('S12 reduced motion dismisses the facade without transitional motion', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Play the product tour' });
    const play = playControlOf(el);
    // Reduced motion is switched on with the component in the document, as a
    // person turns it on: WebKit re-evaluates a component's media queries
    // only in the shadow roots present at the change, so an instance mounted
    // after it can keep the motion of one mounted before.
    await browserCommands.emulateReducedMotion('reduce');
    try {
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
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });
});
