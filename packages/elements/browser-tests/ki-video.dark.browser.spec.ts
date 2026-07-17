// @spec:025-ki-video
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-video.js';

const STYLE_ID = 'ki-video-dark-tokens';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
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

async function mount(): Promise<HTMLElement> {
  const el = document.createElement('ki-video');
  el.setAttribute('label', 'Play the product tour');
  const video = document.createElement('video');
  video.setAttribute('muted', '');
  video.setAttribute('width', '1280');
  video.setAttribute('height', '720');
  const track = document.createElement('track');
  track.setAttribute('kind', 'captions');
  track.setAttribute('srclang', 'es');
  track.setAttribute('label', 'Español');
  track.setAttribute('src', 'data:text/vtt,WEBVTT');
  video.appendChild(track);
  el.appendChild(video);
  landmark().appendChild(el);
  await customElements.whenDefined('ki-video');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="play"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe('ki-video under the dark scheme', () => {
  it('S11 resolves the frame and play control from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    let el = await mount();
    const lightPlayBg = readTokenColor('--ki-video-play-bg');
    const lightScrim = readTokenColor('--ki-video-scrim-color');
    el.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    el = await mount();
    expect(el.shadowRoot?.querySelector('[part="play"]')).toBeTruthy();

    // Surface/inverse_white and Inverse_white/alpha_6 flip with the scheme
    // (black ↔ white): frame scrim and play container resolve from the dark
    // token values with zero component code (S11).
    expect(readTokenColor('--ki-video-play-bg')).not.toBe(lightPlayBg);
    expect(readTokenColor('--ki-video-scrim-color')).not.toBe(lightScrim);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
