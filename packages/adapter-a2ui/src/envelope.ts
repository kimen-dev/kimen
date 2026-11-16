/**
 * Envelope validation, by version (spec 029, spec 039 FR-001): the untrusted
 * message is read for its `version` first, routed to the validator of that
 * version family, and checked against that family's shapes before any other
 * field is used. A 0.9.1 envelope follows `v0_9_1/json/server_to_client.json`;
 * a 1.0 envelope follows `v1_0/json/agent_to_renderer.json`. Both apply the
 * schemas' `additionalProperties: false` at every level, so a message cannot
 * carry the other version's vocabulary (spec 039 S4, S5, S6). Validation
 * never throws: a malformed payload becomes an inert diagnostic.
 */
import type { A2uiProtocol } from './coverage.js';
import { protocolFor, SUPPORTED_A2UI_VERSIONS } from './coverage.js';
import { isPlainObject, REMOVE } from './data-model.js';
import type { A2uiComponent } from './protocol.js';
import type { A2uiDiagnostic } from './translate.js';

interface Envelope {
  readonly protocol: A2uiProtocol;
  /** The envelope `version` exactly as received. */
  readonly version: string;
}

export type Classified =
  | (Envelope & {
      readonly kind: 'createSurface';
      readonly surfaceId: string;
      /** Required in 0.9.1; in 1.0 the optional surface default catalog. */
      readonly catalogId: string | undefined;
      readonly sendDataModel: boolean;
      /** 1.0 only: components carried by the creation itself. */
      readonly components: readonly A2uiComponent[] | undefined;
      /** 1.0 only: the initial data model. */
      readonly dataModel: Record<string, unknown> | undefined;
    })
  | (Envelope & {
      readonly kind: 'updateComponents';
      readonly surfaceId: string;
      readonly components: readonly A2uiComponent[];
    })
  | (Envelope & {
      readonly kind: 'updateDataModel';
      readonly surfaceId: string;
      readonly path: string;
      readonly value: unknown;
    })
  | (Envelope & { readonly kind: 'deleteSurface'; readonly surfaceId: string })
  | (Envelope & {
      readonly kind: 'callRendererFunction';
      readonly functionCallId: string;
      readonly name: string;
    })
  | (Envelope & { readonly kind: 'agentFunctionResponse' })
  | {
      readonly kind: 'error';
      readonly diagnostic: A2uiDiagnostic;
      readonly surfaceId?: string;
    };

const V09_KINDS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];
const V1_KINDS = [...V09_KINDS, 'callRendererFunction', 'agentFunctionResponse'];

const malformed = (path: string, message: string, surfaceId?: string): Classified => ({
  diagnostic: { message, path, rule: 'malformed-message' },
  kind: 'error',
  ...(surfaceId === undefined ? {} : { surfaceId }),
});

const onlyKeys = (
  record: Record<string, unknown>,
  allowed: readonly string[],
): string | undefined => Object.keys(record).find((key) => !allowed.includes(key));

/** A non-empty list of components, each with a string id and type, or the diagnostic. */
function componentList(
  components: unknown,
  path: string,
  surfaceId: string,
): A2uiComponent[] | Classified {
  if (!Array.isArray(components) || components.length === 0) {
    return malformed(path, 'components must be a non-empty list', surfaceId);
  }
  const instances: A2uiComponent[] = [];
  for (const [index, element] of components.entries()) {
    if (
      !isPlainObject(element) ||
      typeof element['id'] !== 'string' ||
      typeof element['component'] !== 'string'
    ) {
      return malformed(
        `${path}/${String(index)}`,
        'each component needs a string id and a string component type',
        surfaceId,
      );
    }
    instances.push(element as A2uiComponent);
  }
  return instances;
}

/** An `updateDataModel` path: absent, `/` or an absolute JSON Pointer. */
function dataPath(raw: unknown, surfaceId: string): string | Classified {
  const path = raw ?? '/';
  if (typeof path !== 'string') {
    return malformed('/updateDataModel/path', 'updateDataModel path must be a string', surfaceId);
  }
  if (path !== '' && path !== '/' && !path.startsWith('/')) {
    return malformed(
      '/updateDataModel/path',
      'updateDataModel path must be an absolute JSON Pointer',
      surfaceId,
    );
  }
  return path;
}

/** The single message key of an envelope, or the diagnostic. */
function messageKind(
  record: Record<string, unknown>,
  kinds: readonly string[],
): string | Classified {
  const present = Object.keys(record).filter((key) => key !== 'version');
  const kind = present[0];
  if (present.length !== 1 || kind === undefined || !kinds.includes(kind)) {
    return malformed(
      '/',
      `an A2UI message carries "version" and exactly one of ${kinds.join(', ')}`,
    );
  }
  return kind;
}

/** The 0.9.1 envelope (`server_to_client.json`), unchanged from spec 029. */
function classifyV09(record: Record<string, unknown>, envelope: Envelope): Classified {
  const kind = messageKind(record, V09_KINDS);
  if (typeof kind !== 'string') {
    return kind;
  }
  const payload = record[kind];
  if (!isPlainObject(payload) || typeof payload['surfaceId'] !== 'string') {
    return malformed(
      `/${kind}/surfaceId`,
      `${kind} needs an object payload with a string surfaceId`,
    );
  }
  const surfaceId = payload['surfaceId'];

  if (kind === 'createSurface') {
    const extra = onlyKeys(payload, ['surfaceId', 'catalogId', 'theme', 'sendDataModel']);
    if (extra !== undefined) {
      return malformed(
        `/createSurface/${extra}`,
        `createSurface does not declare "${extra}"`,
        surfaceId,
      );
    }
    const { catalogId, sendDataModel, theme } = payload;
    if (typeof catalogId !== 'string') {
      return malformed(
        '/createSurface/catalogId',
        'createSurface needs a string catalogId',
        surfaceId,
      );
    }
    if (sendDataModel !== undefined && typeof sendDataModel !== 'boolean') {
      return malformed(
        '/createSurface/sendDataModel',
        'sendDataModel must be a boolean',
        surfaceId,
      );
    }
    if (theme !== undefined && !isPlainObject(theme)) {
      return malformed('/createSurface/theme', 'theme must be an object', surfaceId);
    }
    return {
      ...envelope,
      catalogId,
      components: undefined,
      dataModel: undefined,
      kind,
      sendDataModel: sendDataModel === true,
      surfaceId,
    };
  }

  if (kind === 'updateComponents') {
    const extra = onlyKeys(payload, ['surfaceId', 'components']);
    if (extra !== undefined) {
      return malformed(
        `/updateComponents/${extra}`,
        `updateComponents does not declare "${extra}"`,
        surfaceId,
      );
    }
    const components = componentList(
      payload['components'],
      '/updateComponents/components',
      surfaceId,
    );
    return Array.isArray(components) ? { ...envelope, components, kind, surfaceId } : components;
  }

  if (kind === 'updateDataModel') {
    const extra = onlyKeys(payload, ['surfaceId', 'path', 'value']);
    if (extra !== undefined) {
      return malformed(
        `/updateDataModel/${extra}`,
        `updateDataModel does not declare "${extra}"`,
        surfaceId,
      );
    }
    const path = dataPath(payload['path'], surfaceId);
    if (typeof path !== 'string') {
      return path;
    }
    return {
      ...envelope,
      kind,
      path,
      surfaceId,
      // 0.9.1: an absent `value` removes the key at `path`.
      value: Object.hasOwn(payload, 'value') ? payload['value'] : REMOVE,
    };
  }

  const extra = onlyKeys(payload, ['surfaceId']);
  if (extra !== undefined) {
    return malformed(
      `/deleteSurface/${extra}`,
      `deleteSurface does not declare "${extra}"`,
      surfaceId,
    );
  }
  return { ...envelope, kind: 'deleteSurface', surfaceId };
}

/** The 1.0 `surfaceId` of a payload, or the diagnostic. */
function surfaceIdOf(payload: Record<string, unknown>, kind: string): string | Classified {
  const surfaceId = payload['surfaceId'];
  return typeof surfaceId === 'string'
    ? surfaceId
    : malformed(`/${kind}/surfaceId`, `${kind} needs a string surfaceId`);
}

function createSurfaceV1(payload: Record<string, unknown>, envelope: Envelope): Classified {
  const surfaceId = surfaceIdOf(payload, 'createSurface');
  if (typeof surfaceId !== 'string') {
    return surfaceId;
  }
  const extra = onlyKeys(payload, [
    'surfaceId',
    'catalogId',
    'sendDataModel',
    'components',
    'dataModel',
    'metadata',
  ]);
  if (extra !== undefined) {
    // `theme` lands here: 1.0 removed it (evolution guide §2.7).
    return malformed(
      `/createSurface/${extra}`,
      `createSurface does not declare "${extra}" in A2UI 1.0`,
      surfaceId,
    );
  }
  const { catalogId, dataModel, metadata, sendDataModel } = payload;
  if (catalogId !== undefined && typeof catalogId !== 'string') {
    return malformed('/createSurface/catalogId', 'catalogId must be a string', surfaceId);
  }
  if (sendDataModel !== undefined && typeof sendDataModel !== 'boolean') {
    return malformed('/createSurface/sendDataModel', 'sendDataModel must be a boolean', surfaceId);
  }
  if (dataModel !== undefined && !isPlainObject(dataModel)) {
    return malformed('/createSurface/dataModel', 'dataModel must be an object', surfaceId);
  }
  if (
    metadata !== undefined &&
    (!isPlainObject(metadata) ||
      onlyKeys(metadata, ['extensions']) !== undefined ||
      (metadata['extensions'] !== undefined && !isPlainObject(metadata['extensions'])))
  ) {
    return malformed(
      '/createSurface/metadata',
      'metadata may carry only an extensions object',
      surfaceId,
    );
  }
  let components: A2uiComponent[] | undefined;
  if (payload['components'] !== undefined) {
    const list = componentList(payload['components'], '/createSurface/components', surfaceId);
    if (!Array.isArray(list)) {
      return list;
    }
    components = list;
  }
  return {
    ...envelope,
    catalogId,
    components,
    dataModel,
    kind: 'createSurface',
    sendDataModel: sendDataModel === true,
    surfaceId,
  };
}

function callRendererFunctionV1(payload: Record<string, unknown>, envelope: Envelope): Classified {
  const extra = onlyKeys(payload, ['surfaceId', 'functionCallId', 'callFunction']);
  if (extra !== undefined) {
    return malformed(
      `/callRendererFunction/${extra}`,
      `callRendererFunction does not declare "${extra}"`,
    );
  }
  const { callFunction, functionCallId, surfaceId } = payload;
  if (surfaceId !== undefined && typeof surfaceId !== 'string') {
    return malformed('/callRendererFunction/surfaceId', 'surfaceId must be a string');
  }
  if (typeof functionCallId !== 'string') {
    return malformed(
      '/callRendererFunction/functionCallId',
      'callRendererFunction needs a string functionCallId',
    );
  }
  if (
    !isPlainObject(callFunction) ||
    typeof callFunction['@call'] !== 'string' ||
    typeof callFunction['catalogId'] !== 'string' ||
    onlyKeys(callFunction, ['@call', 'args', 'catalogId']) !== undefined ||
    (callFunction['args'] !== undefined && !isPlainObject(callFunction['args']))
  ) {
    return malformed(
      '/callRendererFunction/callFunction',
      'callFunction needs a string @call, a string catalogId and object args',
    );
  }
  return {
    ...envelope,
    functionCallId,
    kind: 'callRendererFunction',
    name: callFunction['@call'],
  };
}

/** The 1.0 envelope (`agent_to_renderer.json`). */
function classifyV1(record: Record<string, unknown>, envelope: Envelope): Classified {
  const kind = messageKind(record, V1_KINDS);
  if (typeof kind !== 'string') {
    return kind;
  }
  const payload = record[kind];
  if (!isPlainObject(payload)) {
    return malformed(`/${kind}`, `${kind} needs an object payload`);
  }
  switch (kind) {
    case 'createSurface':
      return createSurfaceV1(payload, envelope);
    case 'callRendererFunction':
      return callRendererFunctionV1(payload, envelope);
    case 'agentFunctionResponse':
      return { ...envelope, kind };
    default:
      break;
  }
  const surfaceId = surfaceIdOf(payload, kind);
  if (typeof surfaceId !== 'string') {
    return surfaceId;
  }
  if (kind === 'updateComponents') {
    const extra = onlyKeys(payload, ['surfaceId', 'components']);
    if (extra !== undefined) {
      return malformed(
        `/updateComponents/${extra}`,
        `updateComponents does not declare "${extra}"`,
        surfaceId,
      );
    }
    const components = componentList(
      payload['components'],
      '/updateComponents/components',
      surfaceId,
    );
    return Array.isArray(components) ? { ...envelope, components, kind, surfaceId } : components;
  }
  if (kind === 'updateDataModel') {
    const extra = onlyKeys(payload, ['surfaceId', 'path', 'value']);
    if (extra !== undefined) {
      return malformed(
        `/updateDataModel/${extra}`,
        `updateDataModel does not declare "${extra}"`,
        surfaceId,
      );
    }
    if (!Object.hasOwn(payload, 'value')) {
      return malformed(
        '/updateDataModel/value',
        'an A2UI 1.0 updateDataModel needs a value (null removes the key)',
        surfaceId,
      );
    }
    const path = dataPath(payload['path'], surfaceId);
    if (typeof path !== 'string') {
      return path;
    }
    const value = payload['value'];
    return { ...envelope, kind, path, surfaceId, value: value === null ? REMOVE : value };
  }
  const extra = onlyKeys(payload, ['surfaceId']);
  if (extra !== undefined) {
    return malformed(
      `/deleteSurface/${extra}`,
      `deleteSurface does not declare "${extra}"`,
      surfaceId,
    );
  }
  return { ...envelope, kind: 'deleteSurface', surfaceId };
}

/**
 * Validates the untrusted envelope against the shapes of the version it
 * declares and narrows it. Only `version` is read before the version family
 * is known.
 */
export function classify(record: Record<string, unknown>): Classified {
  const version = record['version'];
  if (typeof version !== 'string') {
    return malformed('/version', 'an A2UI message needs a string "version"');
  }
  const protocol = protocolFor(version);
  if (protocol === undefined) {
    return {
      diagnostic: {
        message: `A2UI protocol version "${version}" is outside the supported set (${SUPPORTED_A2UI_VERSIONS.join(', ')})`,
        path: '/version',
        rule: 'unsupported-version',
        value: version,
      },
      kind: 'error',
    };
  }
  const envelope: Envelope = { protocol, version };
  return protocol.family === '1.0' ? classifyV1(record, envelope) : classifyV09(record, envelope);
}
