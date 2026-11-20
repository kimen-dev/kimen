import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const sample = new URL('./fixtures/three-tones.wav', import.meta.url).href;

export default {
  width: 400,
  html: `
    <ki-audio src="${sample}" title="Interview, episode 4" transcript-href="#interview-transcript" data-position="84"></ki-audio>
    <div style="inline-size:min(100%,14rem)">
      <ki-audio src="${sample}" title="Voice note" rates="1,1.5,2" dir="rtl" data-position="215"></ki-audio>
    </div>
  `,
  prepare(wrapper) {
    for (const player of wrapper.querySelectorAll<HTMLElement>('ki-audio[data-position]')) {
      const audio = player.shadowRoot?.querySelector('audio');
      if (!audio) throw new Error('The audio gallery requires a mounted media element');

      // Pin the readouts independently of the engine's media decode timing.
      Object.defineProperties(audio, {
        duration: { value: 725 },
        currentTime: { value: Number(player.dataset.position), writable: true },
      });
      audio.dispatchEvent(new Event('loadedmetadata'));
      audio.dispatchEvent(new Event('timeupdate'));
    }
    return Promise.resolve();
  },
} satisfies VisualGallery;
