import { AttrDeserialize, Component, Element, h, Prop, State } from '@stencil/core';

import { getIcon } from '../../utils/icon-registry.mjs';
import { resolveHeadingLevel } from './ki-empty-state.heading.js';

/**
 * A short explanation and next step for an empty view.
 *
 * @whenToUse explain an empty list, table, search result, or first-run view.
 * Supply a localized heading that names what is empty and a short next step.
 * Use announce for results that change after an interaction.
 * @whenNotToUse signal that results are loading or draw attention to an error
 * that needs acknowledgement. Use ki-spinner or ki-alert for those states.
 *
 * @slot - Localized supporting text with a reason or recovery advice.
 * @slot media - Optional decorative illustration in place of the icon. Use
 * an image with empty alt text or a decorative SVG. Keep this slot free of controls.
 * @slot actions - Optional controls for the next step, with at most one
 * primary action. In a guarded surface, bind actions to these controls.
 * @part container - Centered layout for the illustration, message and actions.
 * @part media - Decorative illustration or FeatureIcon tile.
 * @part heading - Native heading at the selected document level.
 * @part description - Wrapper for the default slot.
 * @part actions - Wrapping row of consumer-supplied controls.
 */
@Component({
  tag: 'ki-empty-state',
  styleUrl: 'ki-empty-state.css',
  shadow: true,
})
export class KiEmptyState {
  @Element() private readonly host!: HTMLElement;
  private currentHeadingLevel = 3;
  private lastHeadingLevelAttribute: string | null = null;

  /** Localized heading that identifies the empty view. Blank text omits the heading. */
  @Prop() heading!: string;

  /**
   * Optional decorative Lucide glyph. Register it with a per-icon import before
   * mounting. A supplied illustration takes precedence.
   */
  @Prop() iconName?: string;

  /** FeatureIcon tone. Unrecognized tones use the neutral tile. */
  @Prop() tone:
    | 'neutral'
    | 'primary'
    | 'primary-light'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger' = 'neutral';

  /** Use small inside a table or narrow panel. Unrecognized sizes use the medium layout. */
  @Prop({ reflect: true }) size: 'sm' | 'md' = 'md';

  /**
   * Native heading level for the surrounding document outline. Only integers
   * from 2 through 6 are valid; unsupported values use level 3.
   * @minimum 2
   * @maximum 6
   */
  @Prop()
  get headingLevel(): number {
    const attribute = this.host.getAttribute('heading-level');
    // Stencil reads the getter before skipping an attribute write that
    // already equals the numeric property. Remember that spelling too.
    if (Number(attribute) === this.currentHeadingLevel) {
      this.lastHeadingLevelAttribute = attribute;
    }
    return this.currentHeadingLevel;
  }

  set headingLevel(value: number | null) {
    const attribute = this.host.getAttribute('heading-level');
    // The external Stencil runtime can call this setter with parseFloat's
    // result. Validate the complete attribute before accepting that value.
    const fromAttribute =
      attribute !== null &&
      attribute !== this.lastHeadingLevelAttribute &&
      Object.is(value, Number.parseFloat(attribute));
    this.lastHeadingLevelAttribute = attribute;
    this.currentHeadingLevel = resolveHeadingLevel(fromAttribute ? attribute : value);
  }

  /**
   * Put the heading and description in a polite status, with actions outside
   * the region. Set before mounting a message that reports changed results.
   */
  @Prop() announce = false;

  @AttrDeserialize('headingLevel')
  private deserializeHeadingLevel(value: string | null): number {
    return resolveHeadingLevel(value);
  }

  @State() private hasMedia = false;
  @State() private hasActions = false;
  @State() private liveRegionReady = false;

  componentDidLoad(): void {
    if (this.announce) {
      // Give assistive technology time to observe the empty region before
      // the first message, following the ki-spinner live-region pattern.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.liveRegionReady = true;
        });
      });
    } else {
      this.liveRegionReady = true;
    }
  }

  private readonly syncMedia = (event: Event): void => {
    this.hasMedia = (event.currentTarget as HTMLSlotElement).assignedElements().length > 0;
  };

  private readonly syncActions = (event: Event): void => {
    this.hasActions = (event.currentTarget as HTMLSlotElement).assignedElements().length > 0;
  };

  render() {
    const heading = typeof this.heading === 'string' ? this.heading.trim() : '';
    const headingTag = `h${String(this.headingLevel)}`;
    const iconName = this.iconName;
    const hasIcon = iconName !== undefined && getIcon(iconName) !== undefined;
    const small = this.size === 'sm';

    return (
      <div part="container">
        <div part="media" aria-hidden="true" inert hidden={!this.hasMedia && !hasIcon}>
          <slot name="media" onSlotchange={this.syncMedia}>
            {hasIcon &&
              h(
                'ki-feature-icon',
                { tone: this.tone, size: small ? 'md' : 'lg', 'data-tone': this.tone },
                h('ki-icon', { name: iconName, size: small ? 'md' : 'lg' }),
              )}
          </slot>
        </div>
        <div class="message" {...(this.announce ? { role: 'status' } : {})}>
          {(!this.announce || this.liveRegionReady) && [
            heading ? h(headingTag, { part: 'heading' }, heading) : null,
            <div part="description">
              <slot />
            </div>,
          ]}
        </div>
        <div part="actions" hidden={!this.hasActions}>
          <slot name="actions" onSlotchange={this.syncActions} />
        </div>
      </div>
    );
  }
}
