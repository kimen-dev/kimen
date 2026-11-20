import { Component, Event, type EventEmitter, Prop, State, Watch, h } from '@stencil/core';

import { offendingScheme } from '../../utils/url-scheme';

export type KiImageRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9';
export type KiImageFit = 'cover' | 'contain';
export type KiImageRadius = 'none' | 'md' | 'lg';
export type KiImageLoading = 'lazy' | 'eager';

/**
 * Displays one accessible image in a reserved frame, with an optional caption
 * and a fallback if the source is refused or fails to load.
 *
 * @whenToUse to show a photo, illustration, or diagram with a predictable
 * layout. Supply task-relevant alt text, or mark purely decorative media as
 * decorative. Set an explicit ratio when the layout must stay fixed.
 * @whenNotToUse for a background decoration, a video, or an interactive
 * control. Use a separate control to open or otherwise act on an image.
 * @slot caption - Optional visible context displayed below the media in a figcaption.
 * @part figure - The figure containing the frame and optional caption.
 * @part frame - The reserved media box and its shape and backing surface.
 * @part image - The native image and its fit within the frame.
 * @part fallback - The unavailable-image indicator inside the frame.
 * @part caption - The figcaption carrying the slotted caption.
 */
@Component({
  tag: 'ki-image',
  styleUrl: 'ki-image.css',
  shadow: true,
})
export class KiImage {
  /**
   * Relative or HTTP(S) image URL. Refused sources are left unloaded.
   * @format url
   */
  @Prop() src!: string;

  /**
   * Describe what the image shows for the task at hand. Required and nonblank
   * for an informative image. Omit it for a decorative image.
   * @default undefined
   */
  @Prop() alt?: string;

  /** Hide the media from assistive technology when it conveys no information. @default false */
  @Prop() decorative = false;

  /**
   * An explicit ratio reserves the same frame before load and on failure.
   * Auto reserves 16:9 first and uses the intrinsic ratio after load.
   * @default 'auto'
   */
  @Prop({ reflect: true }) ratio: KiImageRatio = 'auto';

  /** Cover fills the frame. Contain preserves the whole image in it. @default 'cover' */
  @Prop({ reflect: true }) fit: KiImageFit = 'cover';

  /** Corner radius of the media frame. @default 'lg' */
  @Prop({ reflect: true }) radius: KiImageRadius = 'lg';

  /** Native loading hint. Use eager for a critical image above the fold. @default 'lazy' */
  @Prop() loading: KiImageLoading = 'lazy';

  /**
   * Localizable fallback label. An informative fallback appends the image's
   * description, when available, to this label.
   * @default 'Image unavailable'
   */
  @Prop() fallbackLabel = 'Image unavailable';

  /**
   * Reports a load failure or rejected URL once per source attempt. Bubbles
   * and crosses shadow boundaries so consumers can observe it on a surface.
   */
  @Event({ eventName: 'ki-error', bubbles: true, cancelable: false, composed: true })
  kiError!: EventEmitter<void>;

  @State() private failed = false;
  @State() private naturalRatio: string | undefined;
  @State() private hasCaption = false;

  private attempt = 0;

  componentWillLoad(): void {
    this.checkScheme();
  }

  @Watch('src')
  protected sourceChanged(): void {
    this.attempt += 1;
    this.failed = false;
    this.naturalRatio = undefined;
    this.checkScheme();
  }

  private checkScheme(): void {
    if (this.src && offendingScheme(this.src) !== null) {
      this.reportFailure(this.attempt);
    }
  }

  private reportFailure(attempt: number): void {
    if (attempt === this.attempt && !this.failed) {
      this.failed = true;
      this.kiError.emit();
    }
  }

  private recordIntrinsicRatio(event: Event, attempt: number): void {
    const image = event.currentTarget;
    if (attempt === this.attempt && image instanceof HTMLImageElement && image.naturalHeight > 0) {
      this.naturalRatio = `${String(image.naturalWidth)} / ${String(image.naturalHeight)}`;
    }
  }

  private readonly captionChanged = (event: Event): void => {
    if (event.currentTarget instanceof HTMLSlotElement) {
      this.hasCaption = event.currentTarget.assignedElements().length > 0;
    }
  };

  render() {
    const alt = this.alt?.trim() ?? '';
    const src = this.src;
    const showImage = src && src.trim() !== '' && !this.failed && (this.decorative || alt);
    const fallbackName = alt ? `${this.fallbackLabel}: ${alt}` : this.fallbackLabel;
    const fallbackSemantics = this.decorative ? {} : { role: 'img', 'aria-label': fallbackName };
    const attempt = this.attempt;

    return (
      <figure part="figure" aria-hidden={this.decorative && !this.hasCaption ? 'true' : undefined}>
        <div
          part="frame"
          aria-hidden={this.decorative ? 'true' : undefined}
          style={{ aspectRatio: this.ratio === 'auto' ? this.naturalRatio : undefined }}
        >
          {showImage ? (
            <img
              key={attempt}
              part="image"
              alt={this.decorative ? '' : alt}
              loading={this.loading === 'eager' ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={(event) => {
                this.recordIntrinsicRatio(event, attempt);
              }}
              onError={() => {
                this.reportFailure(attempt);
              }}
              src={src}
            />
          ) : (
            <div part="fallback" {...fallbackSemantics}>
              <svg viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m4 17 4-4 3 3 4-5 5 6" />
              </svg>
            </div>
          )}
        </div>
        <figcaption part="caption" hidden={!this.hasCaption}>
          <slot name="caption" onSlotchange={this.captionChanged} />
        </figcaption>
      </figure>
    );
  }
}
