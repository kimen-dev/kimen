import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// Deterministic 32x18 (16:9) four-quadrant PNG poster for the ki-video
// gallery: a sourceless <video> takes its intrinsic ratio from the poster
// frame, so the fixture itself must carry the 16:9 the gallery guards.
// Same slate family and generation flow as the avatar portrait above.
const videoPoster =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAASCAYAAAA6yNxSAAAAM0lEQVR42mNILtzwnxLsGtpKEWYYdcCoA0YdMOqA3llH/lOCjR2TKcKjDhh1wKgDRh0AAAhDRtyaKKpFAAAAAElFTkSuQmCC';

// A captions track is part of correct video authoring (WCAG 1.2.2): without
// one the accessibility audit cannot decide, and rightly refuses to pass. An
// empty inline WebVTT keeps the fixture network-free and paints nothing.
const videoCaptions =
  '<track kind="captions" srclang="en" label="English" src="data:text/vtt,WEBVTT">';

export default {
  html: [
    // The poster facade with the glass play control, wide and narrow: the
    // deterministic quadrant PNG stands in for the consumer's poster and
    // the width/height attributes carry the 16:9 intrinsic ratio. No
    // source is ever declared, so nothing can load or play (Art. X).
    `<ki-video label="Play the product tour"><video muted playsinline width="1280" height="720" poster="${videoPoster}">${videoCaptions}</video></ki-video>`,
    `<div style="inline-size:240px;"><ki-video label="Play the teaser"><video muted playsinline width="1280" height="720" poster="${videoPoster}">${videoCaptions}</video></ki-video></div>`,
  ].join(''),
} satisfies VisualGallery;
