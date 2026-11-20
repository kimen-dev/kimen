import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import { anchoredOverlayPosition } from '../../utils/anchored-overlay-layout';
import { AnchoredOverlay } from '../../utils/anchored-overlay';
import { formatSourceLabel } from '../ki-sources/sources-model';
import { type CitationTarget, connectCitation, sameSource } from '../ki-sources/sources-scope';

const DEFAULT_LABEL = 'Source {number}: {title}';

/**
 * A numbered inline link from an answer to a source card.
 *
 * @whenToUse Next to a claim supported by a `ki-source` in the same document
 * or shadow root. Repeat the same reference for subsequent mentions.
 * @whenNotToUse To cite a source outside this tree or replace a standalone
 * link. Use `ki-link` for direct navigation.
 * @part link - Focusable citation link.
 * @part marker - Visible citation number.
 * @part preview - Anchored title and hostname preview.
 * @part preview-title - Title in the preview.
 * @part preview-domain - Hostname in the preview.
 */
@Component({ tag: 'ki-citation', styleUrl: 'ki-citation.css', shadow: true })
export class KiCitation {
  @Element() private readonly host!: HTMLElement;

  /**
   * ID or source-id of the source. Use the `ref` attribute in HTML and
   * `citationRef` in JSX so framework refs remain available.
   */
  @Prop({ attribute: 'ref', reflect: true }) citationRef!: string;

  /**
   * Localized link name with `{number}` and `{title}` placeholders.
   * @default 'Source {number}: {title}'
   */
  @Prop() labelTemplate = DEFAULT_LABEL;

  @State() private target: CitationTarget | undefined;

  private disconnect: (() => void) | undefined;
  private trigger: HTMLAnchorElement | undefined;
  private preview: HTMLElement | undefined;
  private pointerInside = false;
  private focused = false;
  private touchPressed = false;
  private dismissed = false;
  private readonly overlay = new AnchoredOverlay();
  private readonly overlayOptions = {
    position: anchoredOverlayPosition({ placement: 'top' }),
    escape: 'bubble' as const,
    onDismiss: () => {
      this.dismissPreview();
    },
  };

  connectedCallback(): void {
    this.disconnect = connectCitation(this.host, this.update);
  }

  disconnectedCallback(): void {
    this.disconnect?.();
    this.overlay.hide();
    this.pointerInside = false;
    this.focused = false;
    this.touchPressed = false;
    this.dismissed = false;
  }

  componentDidRender(): void {
    this.updatePreview();
  }

  private update = (target: CitationTarget | undefined): void => {
    if (
      !sameSource(target?.source, this.target?.source) ||
      target?.reveal !== this.target?.reveal
    ) {
      this.target = target;
    }
  };

  private updatePreview(): void {
    if (
      this.target &&
      this.trigger &&
      !this.host.hidden &&
      !this.dismissed &&
      (this.pointerInside || this.focused)
    ) {
      this.overlay.show(this.preview, this.trigger, this.overlayOptions);
    } else {
      this.overlay.hide();
    }
  }

  private dismissPreview(): void {
    this.dismissed = true;
    this.overlay.hide();
  }

  private onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      this.pointerInside = true;
      this.dismissed = false;
      this.updatePreview();
    }
  };

  private onPointerLeave = (): void => {
    this.pointerInside = false;
    this.updatePreview();
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.touchPressed = event.pointerType === 'touch';
  };

  private onPointerCancel = (): void => {
    this.touchPressed = false;
  };

  private onFocus = (): void => {
    this.focused = !this.touchPressed;
    if (this.focused) {
      this.dismissed = false;
      this.updatePreview();
    }
  };

  private onBlur = (): void => {
    this.focused = false;
    this.updatePreview();
  };

  private onActivate = (event: MouseEvent): void => {
    this.touchPressed = false;
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      this.target?.reveal(this.target.source.id)
    ) {
      event.preventDefault();
      this.dismissPreview();
    }
  };

  render() {
    const source = this.target?.source;
    if (!source) {
      return <Host data-unresolved />;
    }
    return (
      <Host
        data-unresolved={false}
        onPointerEnter={this.onPointerEnter}
        onPointerLeave={this.onPointerLeave}
      >
        <a
          part="link"
          href={source.href}
          tabIndex={0}
          aria-label={formatSourceLabel(this.labelTemplate || DEFAULT_LABEL, {
            number: String(source.number),
            title: source.title,
          })}
          aria-describedby="source-preview"
          onPointerDown={this.onPointerDown}
          onPointerCancel={this.onPointerCancel}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onClick={this.onActivate}
          ref={(element) => {
            this.trigger = element;
          }}
        >
          <span part="marker">{source.number}</span>
        </a>
        <span
          id="source-preview"
          part="preview"
          role="tooltip"
          aria-labelledby="preview-domain"
          popover="manual"
          ref={(element) => {
            this.preview = element;
          }}
        >
          <span part="preview-title">{source.title}</span>
          <span id="preview-domain" part="preview-domain">
            {source.domain}
          </span>
        </span>
      </Host>
    );
  }
}
