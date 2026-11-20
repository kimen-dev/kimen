import '../../../icons/pause.js';
import '../../../icons/play.js';
import '../../../icons/volume-2.js';
import '../../../icons/volume-x.js';
import { Component, Element, Event, type EventEmitter, h, Prop, State, Watch } from '@stencil/core';

import { offendingScheme } from '../../utils/url-scheme';
import { DEFAULT_RATES, formatPlaybackTime, parsePlaybackRates } from './ki-audio.media';

const DEFAULT_TITLE = 'Audio player';
const DEFAULT_TIME_LABEL = '{elapsed} of {duration}';
const SEEK_SECONDS = 5;

function safeUrl(value?: string): string | undefined {
  const url = value?.trim();
  return url && offendingScheme(url) === null ? url : undefined;
}

/**
 * A recording player with play, pause, a seek timeline, elapsed and total time,
 * playback speed, mute, and an optional transcript link.
 *
 * @whenToUse play a voice note, interview, or other prerecorded audio that a person deliberately starts. Provide a title and the equivalent text transcript URL when available.
 * @whenNotToUse show video (use ki-video), play an ambient loop or start playback automatically, or record audio.
 * @part player - The named group and themed surface.
 * @part title - Visible recording title.
 * @part play - Play and pause control.
 * @part seek - Native seek slider.
 * @part track - Timeline rail.
 * @part progress - Played portion of the timeline rail.
 * @part time - Elapsed and total time readouts.
 * @part speed - Native playback-rate picker.
 * @part mute - Mute and unmute control.
 * @part transcript - Transcript link.
 * @part status - Playback failure message.
 */
@Component({
  tag: 'ki-audio',
  styleUrl: 'ki-audio.css',
  shadow: true,
})
export class KiAudio {
  @Element() private readonly host!: HTMLElement;

  /**
   * Source URL for the recording. Use an HTTP(S) URL or a relative URL.
   * @format url
   */
  @Prop() src!: string;

  /** Visible title and accessible name of the player. @default 'Audio player' */
  @Prop({ attribute: 'title' }) audioTitle?: string = DEFAULT_TITLE;

  /**
   * URL for the recording's text transcript. Use an HTTP(S) URL or a relative URL.
   * @format url
   */
  @Prop() transcriptHref?: string;

  /**
   * Comma-separated playback speeds between 0.25 and 4. Normal speed (1) is always available.
   * @default '0.75,1,1.25,1.5,2'
   */
  @Prop() rates = DEFAULT_RATES;

  /** Accessible name of the play button. @default 'Play' */
  @Prop() playLabel = 'Play';

  /** Accessible name of the pause button. @default 'Pause' */
  @Prop() pauseLabel = 'Pause';

  /** Accessible name of the mute button. @default 'Mute' */
  @Prop() muteLabel = 'Mute';

  /** Accessible name of the unmute button. @default 'Unmute' */
  @Prop() unmuteLabel = 'Unmute';

  /** Accessible name of the timeline slider. @default 'Seek' */
  @Prop() seekLabel = 'Seek';

  /** Accessible time template. Keep the {elapsed} and {duration} placeholders. @default '{elapsed} of {duration}' */
  @Prop() timeLabel?: string = DEFAULT_TIME_LABEL;

  /** Accessible label for the playback-rate picker. @default 'Playback speed' */
  @Prop() speedLabel = 'Playback speed';

  /** Text of the transcript link. @default 'Read the transcript' */
  @Prop() transcriptLabel = 'Read the transcript';

  /** Message shown if playback cannot start or the recording fails to load. @default 'Audio could not be played' */
  @Prop() errorLabel = 'Audio could not be played';

  /** Forwarded when the native playback state switches to playing. */
  @Event({ eventName: 'play', cancelable: false }) mediaPlay!: EventEmitter<void>;

  /** Forwarded when native playback pauses. */
  @Event({ eventName: 'pause', cancelable: false }) mediaPause!: EventEmitter<void>;

  /** Forwarded when the recording ends. The catalog can bind a declared action here. */
  @Event({ eventName: 'ended', cancelable: false }) mediaEnded!: EventEmitter<void>;

  /** Forwarded when the native playback position is updated. */
  @Event({ eventName: 'timeupdate', cancelable: false }) mediaTimeUpdate!: EventEmitter<void>;

  @State() private elapsed = 0;
  @State() private duration = 0;
  @State() private playing = false;
  @State() private muted = false;
  @State() private rate = 1;
  @State() private failed = false;

  private media: HTMLAudioElement | undefined;
  private playRequest: Promise<void> | undefined;
  private choices: number[] = [];

  componentWillLoad(): void {
    this.updateRates(this.rates);
  }

  disconnectedCallback(): void {
    this.playRequest = undefined;
    if (this.media && !this.media.paused) this.media.pause();
    this.playing = false;
  }

  @Watch('src')
  protected resetSource(value: string, previous: string): void {
    const source = safeUrl(value);
    if (source === safeUrl(previous)) return;
    this.playRequest = undefined;
    const media = this.media;
    if (media && !media.paused) media.pause();
    if (media?.hasAttribute('src') && source === undefined) {
      // Removing the attribute alone leaves the selected resource loaded.
      media.removeAttribute('src');
      media.load();
    }
    this.elapsed = 0;
    this.duration = 0;
    this.playing = false;
    this.failed = false;
  }

  @Watch('rates')
  protected updateRates(value?: string): void {
    this.choices = parsePlaybackRates(value ?? DEFAULT_RATES);
    if (!this.choices.includes(this.rate)) this.applyRate(1);
  }

  private get activeMedia(): HTMLAudioElement | undefined {
    const source = safeUrl(this.src);
    return source !== undefined && this.media?.getAttribute('src') === source
      ? this.media
      : undefined;
  }

  private readonly togglePlayback = (): void => {
    const media = this.activeMedia;
    if (!media) return;
    if (!media.paused) {
      this.playRequest = undefined;
      media.pause();
      return;
    }

    this.failed = false;
    const request = media.play();
    this.playRequest = request;
    void request.then(
      () => {
        if (this.playRequest === request) this.playRequest = undefined;
      },
      () => {
        if (this.playRequest !== request) return;
        this.playRequest = undefined;
        this.failed = true;
      },
    );
  };

  private readonly toggleMuted = (): void => {
    const media = this.activeMedia;
    if (!media) return;
    media.muted = !media.muted;
    this.muted = media.muted;
  };

  private applyRate(rate: number): void {
    if (this.media) {
      this.media.defaultPlaybackRate = rate;
      this.media.playbackRate = rate;
    }
    this.rate = rate;
  }

  private readonly selectRate = (event: globalThis.Event): void => {
    event.stopPropagation();
    if (!(event.currentTarget instanceof HTMLSelectElement)) return;
    const rate = Number(event.currentTarget.value);
    if (this.activeMedia && this.choices.includes(rate)) this.applyRate(rate);
  };

  private readonly syncTimeline = (): void => {
    const media = this.activeMedia;
    if (!media) return;
    this.duration = Number.isFinite(media.duration) ? Math.max(0, media.duration) : 0;
    this.elapsed = media.currentTime;
  };

  private readonly forwardMediaEvent = (event: globalThis.Event): void => {
    const media = this.activeMedia;
    if (!media) return;
    this.syncTimeline();
    this.playing = !media.paused && !media.ended;

    switch (event.type) {
      case 'play':
        this.mediaPlay.emit();
        break;
      case 'pause':
        this.mediaPause.emit();
        break;
      case 'ended':
        this.mediaEnded.emit();
        break;
      case 'timeupdate':
        this.mediaTimeUpdate.emit();
        break;
    }
  };

  private readonly reportError = (): void => {
    if (!this.activeMedia) return;
    this.playing = false;
    this.failed = true;
    this.duration = 0;
  };

  private seekTo(seconds: number): void {
    const media = this.activeMedia;
    if (!media || this.duration <= 0 || !Number.isFinite(seconds)) return;
    media.currentTime = Math.max(0, Math.min(this.duration, seconds));
    this.elapsed = media.currentTime;
  }

  private readonly seekFromSlider = (event: globalThis.Event): void => {
    event.stopPropagation();
    if (event.currentTarget instanceof HTMLInputElement) {
      this.seekTo(event.currentTarget.valueAsNumber);
    }
  };

  private readonly handleKeys = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.target instanceof HTMLSelectElement) return;

    if (event.key === ' ' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      if (!event.repeat) this.togglePlayback();
      return;
    }

    const media = this.activeMedia;
    if (!media || this.duration <= 0 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight'))
      return;
    event.preventDefault();
    // Consume the transport shortcut before the native slider applies its own step.
    event.stopPropagation();
    const direction = getComputedStyle(this.host).direction === 'rtl' ? -1 : 1;
    const delta = event.key === 'ArrowRight' ? SEEK_SECONDS : -SEEK_SECONDS;
    this.seekTo(media.currentTime + direction * delta);
  };

  render() {
    const source = safeUrl(this.src);
    const transcript = safeUrl(this.transcriptHref);
    const elapsed = formatPlaybackTime(this.elapsed);
    const duration = formatPlaybackTime(this.duration);
    const timeText = (this.timeLabel ?? DEFAULT_TIME_LABEL)
      .replace('{elapsed}', elapsed)
      .replace('{duration}', duration);
    const seekPosition = Math.min(this.elapsed, this.duration);
    const progress = this.duration > 0 ? (seekPosition / this.duration) * 100 : 0;
    const title = this.audioTitle?.trim() ?? '';

    return (
      <div
        part="player"
        role="group"
        aria-labelledby="audio-title"
        on-keydownCapture={this.handleKeys}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- The audio-only alternative is the transcript link. */}
        <audio
          hidden
          preload="metadata"
          {...(source ? { src: source } : {})}
          ref={(element) => {
            this.media = element;
          }}
          onLoadedMetaData={this.syncTimeline}
          onDurationChange={this.syncTimeline}
          onPlay={this.forwardMediaEvent}
          onPause={this.forwardMediaEvent}
          onEnded={this.forwardMediaEvent}
          onTimeUpdate={this.forwardMediaEvent}
          onError={this.reportError}
        />
        <div class="row">
          <button
            part="play"
            type="button"
            tabindex={0}
            aria-label={this.playing ? this.pauseLabel : this.playLabel}
            disabled={!source}
            onClick={this.togglePlayback}
          >
            <ki-icon name={this.playing ? 'pause' : 'play'} />
          </button>
          <div class="main">
            <div part="title" id="audio-title">
              {title === '' ? DEFAULT_TITLE : title}
            </div>
            <div class="timeline" style={{ '--_audio-progress': `${String(progress)}%` }}>
              <div part="track" aria-hidden="true">
                <span part="progress" />
              </div>
              <input
                part="seek"
                class="seek"
                type="range"
                tabindex={0}
                aria-label={this.seekLabel}
                aria-valuetext={timeText}
                disabled={this.duration <= 0}
                min="0"
                max={String(this.duration)}
                step="any"
                value={String(seekPosition)}
                onInput={this.seekFromSlider}
                onChange={(event) => {
                  event.stopPropagation();
                }}
              />
            </div>
            <div part="time">
              <span dir="ltr">{elapsed}</span>
              <span dir="ltr">{duration}</span>
            </div>
          </div>
          <div class="controls">
            <select
              part="speed"
              tabindex={0}
              aria-label={this.speedLabel}
              disabled={!source}
              onChange={this.selectRate}
            >
              {this.choices.map((rate) => (
                <option key={rate} value={String(rate)} selected={rate === this.rate}>
                  {`${String(rate)}×`}
                </option>
              ))}
            </select>
            <button
              part="mute"
              type="button"
              tabindex={0}
              aria-label={this.muted ? this.unmuteLabel : this.muteLabel}
              disabled={!source}
              onClick={this.toggleMuted}
            >
              <ki-icon name={this.muted ? 'volume-x' : 'volume-2'} />
            </button>
          </div>
        </div>
        {transcript && (
          <a part="transcript" tabindex={0} href={transcript}>
            {this.transcriptLabel}
          </a>
        )}
        {this.failed && (
          <div part="status" role="alert">
            {this.errorLabel}
          </div>
        )}
      </div>
    );
  }
}
