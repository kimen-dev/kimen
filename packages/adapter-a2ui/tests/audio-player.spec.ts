// @spec:125-ki-audio
import { beforeEach, describe, expect, it } from 'vitest';

import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_V1_BASIC_CATALOG_IDS,
  createA2uiAdapter,
} from '../src/index.js';

const dialects = [
  { bindingKey: 'path', catalogId: A2UI_BASIC_CATALOG_IDS[0], version: 'v0.9' },
  { bindingKey: 'path', catalogId: A2UI_BASIC_CATALOG_IDS[0], version: 'v0.9.1' },
  { bindingKey: '@path', catalogId: A2UI_V1_BASIC_CATALOG_IDS[0], version: '1.0' },
];

describe.each(dialects)('A2UI $version AudioPlayer', ({ bindingKey, catalogId, version }) => {
  const surfaceId = 'audio-surface';
  let surface: HTMLElement;
  let adapter: ReturnType<typeof createA2uiAdapter>;

  beforeEach(() => {
    surface = document.createElement('div');
    document.body.replaceChildren(surface);
    adapter = createA2uiAdapter({ surface });
    adapter.apply({ version, createSurface: { catalogId, surfaceId } });
  });

  const setAudio = (properties: Record<string, unknown>) =>
    adapter.apply({
      version,
      updateComponents: {
        components: [{ component: 'AudioPlayer', id: 'root', ...properties }],
        surfaceId,
      },
    });

  it('S8 maps a bound URL and description to the catalog audio player', () => {
    const pending = setAudio({
      description: { [bindingKey]: '/recording/name' },
      url: { [bindingKey]: '/recording/url' },
    });
    expect(pending).toStrictEqual({ degradations: [], diagnostics: [], ok: true });
    expect(surface.querySelector('ki-audio')).toBeNull();

    const result = adapter.apply({
      version,
      updateDataModel: {
        surfaceId,
        value: { recording: { name: 'Interview with Ada', url: '/media/interview.mp3' } },
      },
    });

    expect(result).toStrictEqual({ degradations: [], diagnostics: [], ok: true });
    const audio = surface.querySelector('ki-audio');
    expect(audio?.getAttribute('src')).toBe('/media/interview.mp3');
    expect(audio?.getAttribute('title')).toBe('Interview with Ada');
  });

  it('preserves the previous audio player when its new URL fails the catalog policy', () => {
    const accepted = setAudio({ url: '/media/interview.mp3' });
    expect(accepted.ok).toBe(true);
    const previous = surface.querySelector('ki-audio');
    expect(previous).not.toBeNull();

    const result = setAudio({ url: 'data:audio/wav;base64,AA==' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('url-scheme');
    expect(surface.firstElementChild).toBe(previous);
  });

  it('rejects autoplay outside the basic catalog AudioPlayer contract', () => {
    const result = setAudio({ autoplay: true, url: '/media/interview.mp3' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      path: '/components/root/autoplay',
      rule: 'unknown-property',
    });
    expect(surface.firstElementChild).toBeNull();
  });
});
