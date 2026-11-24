/**
 * The action-rate budget of one rendered surface (spec 162, amending spec 028
 * FR-006): the surface delivers at most a burst of actions at once, then one
 * more per refill interval, whatever makes its components fire their bound
 * events. An action beyond the budget is held, not queued: each binding (a
 * node and the action it reports) keeps only its latest report, and held
 * reports are delivered in the order their bindings were first held. A held
 * report whose node left the surface, or whose surface left the document, is
 * discarded when its turn comes. The first hold is diagnosed once. Nothing is
 * scheduled while nothing is held.
 */
import type { RenderBudgets, RenderDiagnostic } from './render.js';

/** The package default burst: a person's quickest bursts fit in it. */
export const DEFAULT_ACTION_BURST = 10;
/** The package default refill interval, in milliseconds. */
export const DEFAULT_ACTION_REFILL_MS = 500;

/** One report a bound node offers to the host. */
export interface ActionReport {
  /** The bound element; with `action`, the binding a held report belongs to. */
  readonly element: Element;
  /** The declared action the binding reports. */
  readonly action: string;
  /** The node's path when it reported, named by the diagnostic. */
  readonly path: string;
  /** Whether the node is still shown by the surface. */
  readonly present: () => boolean;
  /** Hands the report to the host. */
  readonly deliver: () => void;
}

export interface ActionGate {
  /** Delivers the report now if the budget allows it, or holds it. */
  offer(report: ActionReport): void;
}

/**
 * A gate for one surface. `budgets` are the host's, trusted like the other
 * render budgets: a burst below 1 delivers nothing, and a refill interval
 * that is not positive refills at once.
 */
export function createActionGate(
  budgets: Pick<RenderBudgets, 'actionRefillMs' | 'maxActionBurst'>,
  onDiagnostic: ((diagnostic: RenderDiagnostic) => void) | undefined,
): ActionGate {
  const burst = budgets.maxActionBurst ?? DEFAULT_ACTION_BURST;
  const refill = budgets.actionRefillMs ?? DEFAULT_ACTION_REFILL_MS;
  const held = new Map<string, ActionReport>();
  const bindingIds = new WeakMap<Element, number>();
  let nextBindingId = 0;
  let tokens = burst;
  let stamp = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let diagnosed = false;

  const bindingOf = (report: ActionReport): string => {
    let id = bindingIds.get(report.element);
    if (id === undefined) {
      id = nextBindingId;
      nextBindingId += 1;
      bindingIds.set(report.element, id);
    }
    return JSON.stringify([id, report.action]);
  };

  /** Adds the tokens earned since the last refill. A full bucket restarts the interval. */
  const refillTokens = (): void => {
    const now = performance.now();
    if (tokens >= burst || !(refill > 0)) {
      tokens = Math.max(tokens, burst);
      stamp = now;
      return;
    }
    const earned = Math.floor((now - stamp) / refill);
    if (earned < 1) {
      return;
    }
    tokens = Math.min(burst, tokens + earned);
    stamp = tokens >= burst ? now : stamp + earned * refill;
  };

  const diagnose = (report: ActionReport): void => {
    if (diagnosed) {
      return;
    }
    diagnosed = true;
    onDiagnostic?.({
      message:
        `an action beyond the surface's action-rate budget (${String(burst)} at once, then one ` +
        `every ${String(refill)} ms) is held; each binding delivers only its latest report`,
      path: report.path,
      rule: 'action-rate-budget',
      value: report.action,
    });
  };

  const drain = (): void => {
    timer = undefined;
    try {
      refillTokens();
      // A delivery may offer again: a binding held during the drain joins the back of the line.
      for (const [binding, report] of held) {
        if (tokens < 1) {
          break;
        }
        held.delete(binding);
        if (report.present()) {
          tokens -= 1;
          report.deliver();
        }
      }
    } finally {
      schedule();
    }
  };

  function schedule(): void {
    if (timer !== undefined || held.size === 0 || !(burst >= 1)) {
      return;
    }
    const wait = Math.max(0, refill - (performance.now() - stamp));
    // An endless interval never refills: what is held stays held.
    if (Number.isFinite(wait)) {
      timer = setTimeout(drain, wait);
    }
  }

  return {
    offer(report: ActionReport): void {
      refillTokens();
      if (held.size === 0 && tokens >= 1) {
        tokens -= 1;
        report.deliver();
        return;
      }
      if (burst >= 1) {
        // A newer report of a held binding replaces it and keeps its place in line.
        held.set(bindingOf(report), report);
        schedule();
      }
      diagnose(report);
    },
  };
}
