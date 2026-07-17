import { Component, Element, h, Prop, State } from '@stencil/core';

/**
 * A themed video surface: a calm poster facade with exactly one accessible
 * play control over a slotted native `<video>` element. From the first
 * activation on, playback, scrubbing, volume, captions and fullscreen belong
 * to the native player — Kimen ships no custom chrome.
 *
 * @whenToUse playable content the person deliberately chooses to watch —
 * product tours, talks, tutorials, announcements — presented as a poster
 * with one play control. Slot exactly one native `<video>` carrying its own
 * `poster`, sources and `<track>` captions, omit `controls` (the component
 * enables the native chrome the moment the facade yields, FR-002), and give
 * the control a `label` (required: the accessible name of the play button).
 * @whenNotToUse decorative background or ambient loops (plain CSS and
 * `<video>` are the tool), audio-only content (a future audio component),
 * embeds from streaming platforms that ship their own player chrome (use
 * their embed), or static imagery (use an image, not a video). `autoplay`
 * on the slotted media is unsupported: the facade's contract is that
 * playback begins only by explicit user activation — never on scroll,
 * hover or visibility — so preexisting `autoplay` and `controls` on the
 * slotted media are cleared when it arrives, and any playback already
 * running is paused (FR-003; the native chrome returns at activation).
 *
 * @slot - Exactly one native `<video>` element carrying its own poster, sources and `<track>` captions.
 *
 * @part frame - The media frame: radius, clipping, the themed surface.
 * @part play - The play control: overlay scrim, glass container and glyph.
 */
@Component({
  tag: 'ki-video',
  styleUrl: 'ki-video.css',
  shadow: true,
})
export class KiVideo {
  /**
   * Accessible name of the play control ("Play the product tour"). The
   * control is a real button exposing role button with exactly this name;
   * the frame contributes no role, name or state of its own (FR-004,
   * FR-005). Documented as required: no default human-language string is
   * baked in, and an unlabeled control renders but fails the accessibility
   * audit (015-ki-progress precedent). The label is never rendered visually.
   * @default undefined
   */
  @Prop() label?: string;

  /**
   * Facade state (FR-002): flips exactly once, on the first activation of
   * the play control, and never back — the facade does not reappear during
   * the session; end-of-media and replay are the native player's states.
   */
  @State() private playing = false;

  @Element() host!: HTMLElement;

  private frame: HTMLDivElement | undefined;

  private readonly setFrameRef = (frame?: HTMLDivElement): void => {
    this.frame = frame;
  };

  componentDidLoad(): void {
    this.neutralizeSlottedMedia();
  }

  /**
   * The consumer's media element behind the facade. Slot assignment is the
   * browser truth; the light-DOM children are the same elements in
   * mock-doc, whose slots implement no assignment API.
   */
  private slottedMedia(): HTMLVideoElement | undefined {
    const slot = this.frame?.querySelector('slot');
    const assigned: readonly Element[] =
      typeof slot?.assignedElements === 'function'
        ? slot.assignedElements({ flatten: true })
        : [...this.host.children];
    return assigned.find((element): element is HTMLVideoElement => element.localName === 'video');
  }

  /**
   * The facade owns the pre-activation surface (S1/S6: the play control is
   * the only interactive element) and playback never self-starts (FR-003),
   * so preexisting `controls` and `autoplay` on the slotted media — common
   * markup, and muted autoplay is broadly permitted — are cleared the
   * moment it arrives, and playback already underway is paused. From the
   * first activation on the media is the native player's (FR-002) and the
   * component never touches it again.
   */
  private readonly neutralizeSlottedMedia = (): void => {
    if (this.playing) {
      return;
    }
    const media = this.slottedMedia();
    if (!media) {
      return;
    }
    media.autoplay = false;
    media.removeAttribute('autoplay');
    media.controls = false;
    media.removeAttribute('controls');
    // The strict comparison plus typeof detour keeps mock-doc (no media
    // pipeline: `paused` and `pause` are absent) safe, mirroring play().
    if (!media.paused && typeof media.pause === 'function') {
      media.pause();
    }
  };

  /**
   * First activation (pointer, or Enter/Space via native button semantics):
   * start playback exactly once, enable the native chrome and dismiss the
   * facade (FR-002). The component only ever initiates from here — no
   * autoplay, no scroll/hover/visibility trigger exists (FR-003).
   */
  private readonly handleActivate = (): void => {
    if (this.playing) {
      return;
    }
    const media = this.slottedMedia();
    if (!media) {
      // Children other than one native <video> are documented as
      // unsupported: there is no player to hand the surface to, and the
      // component does not attempt to repair foreign markup (spec edge case).
      return;
    }
    this.playing = true;
    // The native player controls MUST be available from now on (FR-002);
    // everything else on the media element passes through untouched
    // (sources, poster, tracks, events — FR-005).
    media.controls = true;
    if (typeof media.play === 'function') {
      // The play() promise's outcome (source availability, platform policy)
      // belongs to the consumer's element, observable through the native
      // media events they already own (FR-011); the component only
      // initiates, so its own reference must not surface a rejection. The
      // unknown detour keeps runtimes without a promise return (mock-doc)
      // safe without an unnecessary-condition lint suppression.
      const playback: unknown = media.play();
      if (playback instanceof Promise) {
        playback.catch(() => undefined);
      }
    }
  };

  render() {
    // The facade button stays mounted and yields through a token-driven
    // fade (visibility flips after it, instantly under reduced motion —
    // FR-013): a removed node could never honor a theme's dismissal motion.
    return (
      <div part="frame" class={{ playing: this.playing }} ref={this.setFrameRef}>
        <slot onSlotchange={this.neutralizeSlottedMedia}></slot>
        <button part="play" type="button" aria-label={this.label} onClick={this.handleActivate}>
          <span class="control" aria-hidden="true">
            <svg class="glyph" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M8.6 5.03c-1-.58-2.25.14-2.25 1.3v11.34c0 1.16 1.25 1.88 2.25 1.3l9.82-5.67c1-.58 1-2.02 0-2.6L8.6 5.03z"
              />
            </svg>
          </span>
        </button>
      </div>
    );
  }
}
