import { Component, Element, Event, type EventEmitter, Listen, Prop, h } from '@stencil/core';

export type KiSuggestionsVariant = 'chips' | 'cards';
export type KiSuggestionsMode = 'send' | 'fill';

/** Application-owned editor used by a suggestions group. */
export interface KiSuggestionsComposer {
  value: string;
  focus(): void;
}

const SUGGESTION = ['ki', 'suggestion'].join('-');

/**
 * A labelled group of prompt starters or follow-up suggestions.
 * @whenToUse offer suggested prompts to start or continue an assistant conversation.
 * @whenNotToUse choose a form value, switch views, or display static example text.
 * @slot - Direct ki-suggestion children in reading order.
 * @part group - The container that lays out the suggested prompts.
 */
@Component({
  tag: 'ki-suggestions',
  styleUrl: 'ki-suggestions.css',
  // The shadow layout groups its slotted buttons in the accessibility tree.
  shadow: true,
})
export class KiSuggestions {
  @Element() private readonly host!: HTMLElement;

  /** Required accessible name for the group. */
  @Prop() label!: string;

  /** Wrapping chips for follow-ups or cards with room for a description. */
  @Prop({ reflect: true }) variant: KiSuggestionsVariant = 'chips';

  /** Send through the application or fill its attached editor for revision. */
  @Prop() mode: KiSuggestionsMode = 'send';

  /**
   * Optional composer supplied by application code. Fill mode sets its value.
   * Both modes focus it after an uncancelled selection.
   */
  @Prop({ attribute: null }) composer?: KiSuggestionsComposer;

  /**
   * Reports the chosen prompt title. Use this event to send the prompt in
   * send mode. Cancel it to take over the default composer write and focus.
   */
  @Event({ eventName: 'ki-select', bubbles: true, composed: true, cancelable: true })
  kiSelect!: EventEmitter<{ text: string }>;

  @Listen('click')
  protected selectSuggestion(event: MouseEvent): void {
    const item = event.target;
    if (
      event.defaultPrevented ||
      !(item instanceof HTMLElement) ||
      item.localName !== SUGGESTION ||
      item.parentElement !== this.host ||
      item.slot !== '' ||
      item.hidden
    ) {
      return;
    }

    const button = item.shadowRoot?.querySelector('button');
    const text = button?.getAttribute('aria-label');
    if (!text || !button || !event.composedPath().includes(button)) return;

    const selection = this.kiSelect.emit({ text });
    const composer = this.composer;
    if (selection.defaultPrevented || !composer) return;

    if (this.mode === 'fill') composer.value = text;
    composer.focus();
  }

  render() {
    return (
      <div part="group" role="group" aria-label={this.label}>
        <slot />
      </div>
    );
  }
}
