/**
 * The surface-side bridge (spec 030): the boundary where untrusted MCP Apps
 * protocol traffic meets the guarded renderer. It owns no render path of its
 * own — every surface mutation is a call to the injected guarded renderer
 * (default `renderUiSpec`), so a test can substitute a double and prove the
 * guarantee. Inbound traffic is validated against the JSON-RPC envelope before
 * it can affect rendering (a non-envelope message is ignored with no state
 * change); outbound traffic is limited to the surface's declared actions,
 * mediated by the host (FR-003/FR-004).
 */
import type { ActionEvent, RenderBudgets, RenderOptions, RenderResult } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import type { ActionMessage } from './protocol.js';
import {
  JSONRPC_VERSION,
  MCP_APPS_PROTOCOL_VERSIONS,
  METHOD_ACTION,
  METHOD_TOOL_RESULT,
  parseEnvelope,
} from './protocol.js';

/** The guarded-renderer contract the bridge depends on (injection seam, S4/S5). */
export type GuardedRender = (input: unknown, options: RenderOptions) => RenderResult;

/** A machine-readable, observable refusal (FR-003/FR-004): named, inert data. */
export interface BridgeRefusal {
  readonly reason: string;
  readonly detail: string;
  readonly value?: string | undefined;
}

export interface ReceiveResult {
  /** False when the message was not protocol traffic and was ignored (S7). */
  readonly handled: boolean;
  readonly ok: boolean;
  readonly refusals: readonly BridgeRefusal[];
}

export interface DispatchResult {
  readonly sent: boolean;
  readonly refusal?: BridgeRefusal | undefined;
}

export interface SurfaceBridge {
  /** Handles one inbound host message: render a tool result, or ignore non-envelope traffic. */
  receive(message: unknown): ReceiveResult;
  /** Attempts to send one action to the host; only declared actions leave (S6). */
  dispatch(
    action: string,
    data?: Readonly<Record<string, boolean | number | string>>,
  ): DispatchResult;
}

export interface SurfaceBridgeOptions {
  readonly surface: Element;
  /** Sends an action message to the host (the postMessage/JSON-RPC channel). */
  readonly send: (message: ActionMessage) => void;
  /** Guarded renderer; defaults to `renderUiSpec`. The bridge mutates the DOM only through it. */
  readonly render?: GuardedRender;
  /** Receives every refusal (unknown component, undeclared prop or action, version skew). */
  readonly onRefusal?: (refusal: BridgeRefusal) => void;
  readonly supportedVersions?: readonly string[];
  readonly budgets?: Partial<RenderBudgets>;
  readonly catalogSchemaVersion?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The declared action set the surface spec commits to (the outbound allowlist). */
function declaredActionsOf(spec: unknown): ReadonlySet<string> {
  if (isObject(spec) && Array.isArray(spec['actions'])) {
    return new Set(
      spec['actions'].filter((action): action is string => typeof action === 'string'),
    );
  }
  return new Set();
}

/**
 * Negotiates a host-announced MCP Apps protocol version against the adapter's
 * matrix (S8): an undeclared version is refused, naming the supported set — no
 * surface renders under a version the adapter did not declare.
 */
export function negotiateProtocolVersion(
  announced: string,
  supportedVersions: readonly string[] = MCP_APPS_PROTOCOL_VERSIONS,
): {
  readonly ok: boolean;
  readonly supportedVersions: readonly string[];
  readonly refusal?: BridgeRefusal;
} {
  if (supportedVersions.includes(announced)) {
    return { ok: true, supportedVersions };
  }
  return {
    ok: false,
    refusal: {
      detail: `MCP Apps protocol version "${announced}" is not supported; this adapter supports ${supportedVersions.join(', ')}`,
      reason: 'unsupported-version',
      value: announced,
    },
    supportedVersions,
  };
}

export function createSurfaceBridge(options: SurfaceBridgeOptions): SurfaceBridge {
  const render: GuardedRender = options.render ?? renderUiSpec;
  const supported = options.supportedVersions ?? MCP_APPS_PROTOCOL_VERSIONS;
  let declaredActions: ReadonlySet<string> = new Set();

  const report = (refusal: BridgeRefusal): void => {
    options.onRefusal?.(refusal);
  };

  const dispatch = (
    action: string,
    data: Readonly<Record<string, boolean | number | string>> = {},
  ): DispatchResult => {
    if (!declaredActions.has(action)) {
      // Only declared actions leave the surface (FR-004, S6): an undeclared
      // action is refused and reported, and no message reaches the host.
      const refusal: BridgeRefusal = {
        detail: `action "${action}" is not declared by the rendered surface`,
        reason: 'undeclared-action',
        value: action,
      };
      report(refusal);
      return { refusal, sent: false };
    }
    options.send({ jsonrpc: JSONRPC_VERSION, method: METHOD_ACTION, params: { action, data } });
    return { sent: true };
  };

  const onAction = (event: ActionEvent): void => {
    dispatch(event.action, event.data);
  };

  const receive = (message: unknown): ReceiveResult => {
    const envelope = parseEnvelope(message);
    if (envelope?.method !== METHOD_TOOL_RESULT) {
      // Not a render message: ignore it entirely — rendered state is unchanged
      // (FR-004, S7). A raw string never becomes surface state.
      return { handled: false, ok: false, refusals: [] };
    }

    const declaredVersion = envelope.params['protocolVersion'];
    if (typeof declaredVersion === 'string' && !supported.includes(declaredVersion)) {
      const refusal: BridgeRefusal = {
        detail: `tool result declares unsupported protocol version "${declaredVersion}"; this adapter supports ${supported.join(', ')}`,
        reason: 'unsupported-version',
        value: declaredVersion,
      };
      report(refusal);
      return { handled: true, ok: false, refusals: [refusal] };
    }

    const surface = envelope.params['surface'];
    const spec = isObject(surface) ? surface['spec'] : undefined;

    const renderOptions: RenderOptions = {
      onAction,
      surface: options.surface,
      ...(options.budgets !== undefined ? { budgets: options.budgets } : {}),
      ...(options.catalogSchemaVersion !== undefined
        ? { catalogSchemaVersion: options.catalogSchemaVersion }
        : {}),
    };

    const result = render(spec, renderOptions);
    if (!result.ok) {
      // The guardrail refused hostile content (unknown component, undeclared
      // prop, version skew, budget) fail-closed and atomic: nothing rendered,
      // so every component that DID render is a catalog component (S4). Each
      // diagnostic is an observable, inert refusal.
      const refusals = result.diagnostics.map((diagnostic) => ({
        detail: diagnostic.message,
        reason: diagnostic.rule,
        value: diagnostic.value,
      }));
      refusals.forEach(report);
      return { handled: true, ok: false, refusals };
    }

    // On success the accepted spec's declared actions become the outbound
    // allowlist; a later dispatch outside it is refused (S6).
    declaredActions = declaredActionsOf(spec);
    return { handled: true, ok: true, refusals: [] };
  };

  return { dispatch, receive };
}
