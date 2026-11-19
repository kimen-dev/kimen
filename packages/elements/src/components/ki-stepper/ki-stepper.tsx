import '../../../icons/check.js';
import '../../../icons/chevron-down.js';
import '../../../icons/circle-alert.js';
import { Component, Element, Prop, State, h } from '@stencil/core';
import type { KiStepState } from '../ki-step/ki-step';
import { formatStepSummary, resolveStepState } from './ki-stepper.state';

export type KiStepperOrientation = 'horizontal' | 'vertical';

interface Step {
  element: HTMLElement;
  slot: string;
  state: KiStepState;
  href: string | undefined;
  description: string | null;
}

const STEP_TAG = 'ki-step';
const LIST_ID = 'steps';
const STATE_LABELS = {
  done: 'Completed',
  current: 'Current',
  upcoming: 'Not started',
  error: 'Error',
} as const;
const SUMMARY_LABEL = 'Step {current} of {total}';
const COUNT_LABEL = 'Steps ({total})';
let nextSlotId = 0;

function textOrDefault(text: string | undefined, fallback: string): string {
  const trimmed = text?.trim() ?? '';
  return trimmed.length === 0 ? fallback : trimmed;
}

/**
 * An ordered, responsive view of progress through named steps.
 *
 * @whenToUse Show the current place in onboarding, checkout or a wizard.
 * Provide a label and direct ki-step children in task order.
 * @whenNotToUse A percentage or indeterminate task, a carousel position,
 * or navigation among peer views. The task owner updates step states.
 * @slot - Direct ki-step children in task order. The stepper assigns each
 * child to its row automatically.
 * @part list - The ordered list.
 * @part summary - The compact disclosure button.
 * @part step - A list item in the sequence.
 * @part marker - The decorative step number or state glyph.
 * @part title - The label, rendered as a link when a completed step has a destination.
 * @part description - Optional supporting text below the label.
 * @part connector - The decorative line leading to the next step.
 * @cssprop --ki-stepper-dot-size - Diameter of a step marker.
 * @cssprop --ki-stepper-done-bg - Fill of a completed marker.
 * @cssprop --ki-stepper-done-fg - Glyph ink of a completed marker.
 * @cssprop --ki-stepper-current-bg - Fill of the current marker.
 * @cssprop --ki-stepper-current-border - Edge of the current marker.
 * @cssprop --ki-stepper-current-fg - Number ink of the current marker.
 * @cssprop --ki-stepper-upcoming-bg - Fill of an upcoming marker.
 * @cssprop --ki-stepper-upcoming-border - Edge of an upcoming marker.
 * @cssprop --ki-stepper-upcoming-fg - Number and label ink of an upcoming step.
 * @cssprop --ki-stepper-error-bg - Fill of a marker for a step in error.
 * @cssprop --ki-stepper-error-border - Edge of a marker for a step in error.
 * @cssprop --ki-stepper-error-fg - Glyph ink of a marker for a step in error.
 * @cssprop --ki-stepper-label-fg - Default step label ink.
 * @cssprop --ki-stepper-label-bg - Backing of a step label.
 * @cssprop --ki-stepper-summary-fg - Compact disclosure button ink.
 * @cssprop --ki-stepper-summary-bg - Compact disclosure button backing.
 * @cssprop --ki-stepper-connector - Connector before an incomplete step.
 * @cssprop --ki-stepper-connector-done - Connector leaving a completed step.
 * @cssprop --ki-stepper-stroke - Width of a marker outline and connector.
 * @cssprop --ki-stepper-glyph-size - Size of the decorative marker and disclosure glyphs.
 */
// Shadow DOM owns the ordered list and the compact disclosure.
@Component({
  tag: 'ki-stepper',
  styleUrl: 'ki-stepper.css',
  shadow: true,
})
export class KiStepper {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name of the list. Use a localized description of the task. */
  @Prop() label!: string;

  /** Use vertical for a stacked list. Horizontal layout compacts below 22rem.
   * @default 'horizontal'
   */
  @Prop() orientation: KiStepperOrientation = 'horizontal';

  /** Localized text for a completed step.
   * @default 'Completed'
   */
  @Prop() doneLabel?: string = STATE_LABELS.done;

  /** Localized text for the current step.
   * @default 'Current'
   */
  @Prop() currentLabel?: string = STATE_LABELS.current;

  /** Localized text for an upcoming step.
   * @default 'Not started'
   */
  @Prop() upcomingLabel?: string = STATE_LABELS.upcoming;

  /** Localized text for a step that has an error.
   * @default 'Error'
   */
  @Prop() errorLabel?: string = STATE_LABELS.error;

  /** Compact disclosure text. Place {current} and {total} in the local order.
   * @default 'Step {current} of {total}'
   */
  @Prop() summaryLabel?: string = SUMMARY_LABEL;

  /** Compact disclosure text without a current step. Include {total}.
   * @default 'Steps ({total})'
   */
  @Prop() countLabel?: string = COUNT_LABEL;

  @State() private steps: Step[] = [];
  @State() private expanded = false;
  @State() private listFocused = false;

  private observer: MutationObserver | undefined;
  private readonly slotByStep = new WeakMap<HTMLElement, string>();

  connectedCallback(): void {
    this.syncSteps();
    this.observer = new MutationObserver((records) => {
      if (
        records.some(
          ({ target, type }) =>
            target === this.host || (type === 'attributes' && target.parentNode === this.host),
        )
      ) {
        this.syncSteps();
      }
    });
    this.observer.observe(this.host, {
      attributes: true,
      attributeFilter: ['state', 'href', 'description', 'hidden'],
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.listFocused = false;
  }

  private syncSteps(): void {
    let hasCurrent = false;
    const steps: Step[] = [];
    for (const element of this.host.children) {
      if (!(element instanceof HTMLElement) || element.localName !== STEP_TAG || element.hidden) {
        continue;
      }
      const state = resolveStepState(element.getAttribute('state'), hasCurrent);
      hasCurrent ||= state === 'current';
      let slot = this.slotByStep.get(element);
      if (slot === undefined) {
        slot = `step-${String(++nextSlotId)}`;
        this.slotByStep.set(element, slot);
      }
      element.slot = slot;
      steps.push({
        element,
        slot,
        state,
        href: state === 'done' ? element.getAttribute('href')?.trim() : undefined,
        description: element.getAttribute('description'),
      });
    }

    for (const { element, slot } of this.steps) {
      if ((element.parentElement !== this.host || element.hidden) && element.slot === slot) {
        element.removeAttribute('slot');
      }
    }
    this.steps = steps;
  }

  private stepLabel(state: KiStepState): string {
    const labels = {
      done: this.doneLabel,
      current: this.currentLabel,
      upcoming: this.upcomingLabel,
      error: this.errorLabel,
    };
    return textOrDefault(labels[state], STATE_LABELS[state]);
  }

  private renderStep(step: Step, index: number) {
    const glyph =
      step.state === 'done' ? 'check' : step.state === 'error' ? 'circle-alert' : undefined;
    const label = [
      <slot name={step.slot} />,
      <span class="visually-hidden">{`, ${this.stepLabel(step.state)}`}</span>,
    ];
    return (
      <li
        key={step.slot}
        part="step"
        data-state={step.state}
        aria-current={step.state === 'current' ? 'step' : undefined}
      >
        <span part="marker" aria-hidden="true">
          {glyph ? <ki-icon name={glyph} /> : <span>{index + 1}</span>}
        </span>
        <span class="content">
          {step.href ? (
            <a part="title" href={step.href}>
              {label}
            </a>
          ) : (
            <span part="title">{label}</span>
          )}
          {step.description && <span part="description">{step.description}</span>}
        </span>
        {index < this.steps.length - 1 && <span part="connector" aria-hidden="true" />}
      </li>
    );
  }

  private onListFocus = (): void => {
    // Keep a focused link visible if the wide layout narrows.
    this.listFocused = true;
  };

  private onListBlur = (): void => {
    this.listFocused = false;
  };

  private toggleList = ({ currentTarget }: MouseEvent): void => {
    const expanded = this.expanded || this.listFocused;
    if (this.listFocused && currentTarget instanceof HTMLElement) {
      currentTarget.focus();
    }
    // Removing a focused step can leave the list without a focusout event.
    this.listFocused = false;
    this.expanded = !expanded;
  };

  render() {
    const horizontal = this.orientation !== 'vertical';
    const summary = formatStepSummary(
      this.steps.findIndex(({ state }) => state === 'current') + 1,
      this.steps.length,
      textOrDefault(this.summaryLabel, SUMMARY_LABEL),
      textOrDefault(this.countLabel, COUNT_LABEL),
    );
    return [
      horizontal && this.steps.length > 0 && (
        <button
          part="summary"
          type="button"
          aria-controls={LIST_ID}
          aria-label={this.label ? `${summary}, ${this.label}` : undefined}
          aria-expanded={this.expanded || this.listFocused ? 'true' : 'false'}
          onClick={this.toggleList}
        >
          {summary}
          <ki-icon name="chevron-down" aria-hidden="true" />
        </button>
      ),
      // eslint-disable-next-line jsx-a11y/no-redundant-roles -- WebKit omits list semantics when CSS hides markers.
      <ol
        class={{ horizontal }}
        part="list"
        id={LIST_ID}
        role="list"
        aria-label={this.label}
        onFocusin={this.onListFocus}
        onFocusout={this.onListBlur}
      >
        {this.steps.map((step, index) => this.renderStep(step, index))}
      </ol>,
    ];
  }
}
