import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:025-ki-video
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III) — mock-doc has no layout and no media
// pipeline, so playback itself is asserted there. Every test maps to a
// scenario ID (S<n>) from the approved feature.feature (traceability gate).
describe('ki-video', () => {
  it('S1 renders the facade: themed frame, a slot for the media and one play control', async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted></video>
      </ki-video>,
    );
    const frame = root.shadowRoot?.querySelector('[part="frame"]');
    expect(frame).toBeTruthy();
    expect(frame?.querySelector('slot')).toBeTruthy();
    expect(root.shadowRoot?.querySelectorAll('button')).toHaveLength(1);
    expect(root.shadowRoot?.querySelector('[part="play"]')?.getAttribute('type')).toBe('button');
  });

  it('S3 initiates nothing on render: the slotted media gains no controls and no autoplay', async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted></video>
      </ki-video>,
    );
    const media = root.querySelector('video');
    expect(media?.hasAttribute('controls')).toBe(false);
    expect(media?.hasAttribute('autoplay')).toBe(false);
  });

  it('S3 clears preexisting autoplay and native controls from the slotted media', async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted autoplay controls></video>
      </ki-video>,
    );
    // Common consumer markup must not defeat the facade contract: playback
    // never self-starts (FR-003) and the play control stays the only
    // interactive element until activation (S1); the browser suite asserts
    // the live pause and the controls round-trip.
    const media = root.querySelector('video');
    expect(media?.hasAttribute('autoplay')).toBe(false);
    expect(media?.hasAttribute('controls')).toBe(false);
  });

  it('S5 keeps the default anatomy and an operable play control under an unrecognized variant attribute', async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted></video>
      </ki-video>,
    );
    // Deliberately exercising unknown vocabulary copied from another design
    // system: the attribute matches no prop, no code path and no selector.
    root.setAttribute('variant', 'hero');
    await new Promise((resolve) => setTimeout(resolve));
    const play = root.shadowRoot?.querySelector<HTMLButtonElement>('[part="play"]');
    expect(play).toBeTruthy();
    expect(play?.hasAttribute('disabled')).toBe(false);
    expect(root.shadowRoot?.querySelector('[part="frame"]')).toBeTruthy();
  });

  it('S8 names the play control from label while the frame adds no role, name or state', async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted></video>
      </ki-video>,
    );
    expect(root.shadowRoot?.querySelector('[part="play"]')?.getAttribute('aria-label')).toBe(
      'Play the product tour',
    );
    const frame = root.shadowRoot?.querySelector('[part="frame"]');
    expect(frame?.getAttribute('role')).toBeNull();
    expect(frame?.getAttribute('aria-label')).toBeNull();
    expect(root.getAttribute('role')).toBeNull();
  });

  it("S9 passes the slotted media through untouched: sources, poster and captions stay the consumer's", async () => {
    const { root } = await render(
      <ki-video label="Play the product tour">
        <video poster="poster.png" muted>
          <track kind="captions" srclang="es" label="Español" src="data:text/vtt,WEBVTT" />
        </video>
      </ki-video>,
    );
    const media = root.querySelector('video');
    expect(media?.getAttribute('poster')).toBe('poster.png');
    const track = media?.querySelector('track');
    expect(track?.getAttribute('kind')).toBe('captions');
    expect(track?.getAttribute('srclang')).toBe('es');
  });
});
