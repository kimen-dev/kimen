// @spec:027-runtime-catalog
// The boundary parses with zod/mini (src/zod-defaults.ts): its functional API
// leaves a host bundle about a quarter of classic zod. The move must change
// nothing a caller sees. The oracle is the classic schemas the catalog used
// before, verbatim: for any input, the public entry points must accept and
// reject exactly what classic zod accepts and rejects, with the same issues,
// paths and messages.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as zc from 'zod';
import * as zm from 'zod/mini';

import { createCatalog, createLiveSurface, validateUiSpec } from '../src/index.js';
import { batchShape } from '../src/live.js';
import { baseShape, definitionShape } from '../src/register.js';
import { toPlainData, uiSpecShape } from '../src/validate.js';

// ── The classic schemas, as validate.ts, live.ts and register.ts declared them.
const classicNode: zc.ZodType = zc.lazy(() =>
  zc.strictObject({
    id: zc.string().optional(),
    component: zc.string(),
    props: zc.record(zc.string(), zc.union([zc.boolean(), zc.number(), zc.string()])).optional(),
    action: zc.union([zc.string(), zc.record(zc.string(), zc.string())]).optional(),
    collect: zc.record(zc.string(), zc.string()).optional(),
    slots: zc.record(zc.string(), zc.array(zc.union([zc.string(), classicNode]))).optional(),
  }),
);
const classicSpec = zc.strictObject({
  version: zc.literal(1),
  actions: zc.array(zc.string().min(1)).optional(),
  root: classicNode,
});
const idRef = zc.string();
const classicBatch = zc.strictObject({
  focus: idRef.optional(),
  ifRevision: zc.number().int().nonnegative().optional(),
  ops: zc.array(
    zc.discriminatedUnion('op', [
      zc.strictObject({
        op: zc.literal('insert'),
        parent: idRef.optional(),
        slot: zc.string().optional(),
        before: idRef.optional(),
        node: zc.unknown(),
      }),
      zc.strictObject({
        op: zc.literal('set'),
        id: idRef,
        props: zc.record(
          zc.string(),
          zc.union([zc.boolean(), zc.number(), zc.string(), zc.null()]),
        ),
        force: zc.boolean().optional(),
      }),
      zc.strictObject({
        op: zc.literal('text'),
        id: idRef,
        slot: zc.string().optional(),
        text: zc.string(),
      }),
      zc.strictObject({ op: zc.literal('remove'), id: idRef, force: zc.boolean().optional() }),
      zc.strictObject({
        op: zc.literal('replace'),
        id: idRef,
        node: zc.unknown(),
        force: zc.boolean().optional(),
      }),
      zc.strictObject({ op: zc.literal('reset'), id: idRef }),
    ]),
  ),
});
const classicConstraint = zc.strictObject({
  allowEmpty: zc.boolean().optional(),
  default: zc.union([zc.boolean(), zc.number(), zc.string()]).optional(),
  deprecatedValues: zc.array(zc.string()).optional(),
  description: zc.string(),
  documentedValues: zc.array(zc.string()).optional(),
  format: zc.enum(['idref', 'text', 'url']).optional(),
  maximum: zc.number().optional(),
  minimum: zc.number().optional(),
  required: zc.boolean().optional(),
  type: zc.enum(['boolean', 'enum', 'number', 'number-or-string', 'string']),
  values: zc.array(zc.string()).optional(),
});
const classicEntry = zc.strictObject({
  activationEvent: zc.string().optional(),
  description: zc.string(),
  events: zc.record(zc.string(), zc.string()),
  props: zc.record(zc.string(), classicConstraint),
  slots: zc.record(zc.string(), zc.string()),
  tag: zc.string(),
  whenNotToUse: zc.string(),
  whenToUse: zc.string(),
});
const classicDefinition = zc.strictObject({
  components: zc.record(zc.string(), classicEntry),
});
const classicBase = zc.record(zc.string(), classicEntry);

// ── Inputs: shapes the schemas accept, each part now and then wrong, missing
// or joined by an unknown key, so both outcomes are well represented.
type Arbitraries = Record<string, fc.Arbitrary<unknown>>;
const noise = fc.jsonValue({ maxDepth: 2 });
/** A valid part, or now and then any JSON value instead. */
const usually = <T>(valid: fc.Arbitrary<T>): fc.Arbitrary<unknown> =>
  fc.oneof({ arbitrary: valid, weight: 12 }, { arbitrary: noise, weight: 1 });
/** An object with its required and optional members; now and then one goes missing or an unknown one joins. */
const object = (required: Arbitraries, optional: Arbitraries = {}): fc.Arbitrary<unknown> => {
  const members = Object.fromEntries(
    Object.entries({ ...required, ...optional }).map(([key, value]) => [key, usually(value)]),
  );
  const whole = fc.record(members, { requiredKeys: Object.keys(required) });
  const keys = Object.keys(required);
  return fc.oneof(
    { arbitrary: whole, weight: 10 },
    {
      arbitrary: fc
        .tuple(whole, fc.nat())
        .map(([value, index]) =>
          Object.fromEntries(
            Object.entries(value).filter(([key]) => key !== keys[index % keys.length]),
          ),
        ),
      weight: 1,
    },
    { arbitrary: fc.tuple(whole, noise).map(([value, extra]) => ({ ...value, extra })), weight: 1 },
    { arbitrary: noise, weight: 1 },
  );
};
const names = fc.oneof(fc.constantFrom('', 'a', 'id-1', 'ki-button', 'start'), fc.string());
const scalar = fc.oneof(fc.boolean(), fc.integer(), fc.double(), fc.string());
const record = (value: fc.Arbitrary<unknown>) => fc.dictionary(names, value, { maxKeys: 3 });
const list = (value: fc.Arbitrary<unknown>) => fc.array(value, { maxLength: 3 });

const { node } = fc.letrec<{ node: unknown }>((tie) => ({
  node: object(
    { component: names },
    {
      action: fc.oneof(names, record(usually(names))),
      collect: record(usually(names)),
      id: names,
      props: record(usually(scalar)),
      slots: record(list(fc.oneof({ depthSize: 'small' }, names, tie('node')))),
    },
  ),
}));
const spec = object({ root: node, version: fc.constant(1) }, { actions: list(usually(names)) });

const op = fc.oneof(
  object({ node, op: fc.constant('insert') }, { before: names, parent: names, slot: names }),
  object(
    { id: names, op: fc.constant('set'), props: record(fc.oneof(scalar, fc.constant(null))) },
    { force: fc.boolean() },
  ),
  object({ id: names, op: fc.constant('text'), text: names }, { slot: names }),
  object({ id: names, op: fc.constant('remove') }, { force: fc.boolean() }),
  object({ id: names, node, op: fc.constant('replace') }, { force: fc.boolean() }),
  object({ id: names, op: fc.constantFrom('reset', 'move') }),
);
const batch = object(
  { ops: list(usually(op)) },
  { focus: names, ifRevision: fc.oneof(fc.integer({ max: 5, min: -2 }), fc.double()) },
);

const constraint = object(
  {
    description: names,
    type: fc.constantFrom('boolean', 'enum', 'number', 'number-or-string', 'string', 'date'),
  },
  {
    allowEmpty: fc.boolean(),
    default: scalar,
    deprecatedValues: list(names),
    documentedValues: list(names),
    format: fc.constantFrom('idref', 'text', 'url', 'uri'),
    maximum: fc.double(),
    minimum: fc.double(),
    required: fc.boolean(),
    values: list(names),
  },
);
const entry = object(
  {
    description: names,
    events: record(names),
    props: record(constraint),
    slots: record(names),
    tag: names,
    whenNotToUse: names,
    whenToUse: names,
  },
  { activationEvent: names },
);
const definition = object({ components: record(entry) });

/**
 * The outcome of one parse, as a caller sees it: acceptance with the parsed
 * value, or the issues (code, path, message and the rest zod reports).
 */
const outcome = (parsed: unknown) => {
  const result = parsed as { success: boolean; data?: unknown; error?: { issues: unknown } };
  return result.success
    ? { data: result.data, success: true }
    : { issues: result.error?.issues, success: false };
};

/** What a schema receives: the purity wall's copy of an input it lets through. */
const walled = (input: unknown): unknown => {
  const wall = toPlainData(input);
  fc.pre(wall.issues.length === 0);
  return wall.data;
};
const RUNS = { numRuns: 1000 };

describe('the zod/mini boundary against the classic zod schemas', () => {
  it.each([
    ['a UI spec', spec, uiSpecShape, classicSpec],
    ['a live batch', batch, batchShape, classicBatch],
    ['a catalog definition', definition, definitionShape, classicDefinition],
    [
      'an extended catalog',
      definition.map((value) =>
        value !== null && typeof value === 'object' && !Array.isArray(value)
          ? (value as { components?: unknown }).components
          : value,
      ),
      baseShape,
      classicBase,
    ],
  ] as const)('parses %s exactly as classic zod did', (_, inputs, mini, classic) => {
    fc.assert(
      fc.property(inputs, (input) => {
        const data = walled(input);
        expect(outcome(mini.safeParse(data))).toEqual(outcome(classic.safeParse(data)));
      }),
      RUNS,
    );
  });

  it('carries classic zod messages through the public entry points', () => {
    expect(
      validateUiSpec({ actions: [''], root: { component: 'p', extra: 1 }, version: 1 }).issues,
    ).toEqual([
      {
        code: 'malformed-spec',
        message: 'Too small: expected string to have >=1 characters',
        path: 'spec.actions.0',
      },
      { code: 'malformed-spec', message: 'Unrecognized key: "extra"', path: 'spec.root' },
    ]);
    const live = createLiveSurface({ surface: document.createElement('div') });
    expect(live.apply({ ifRevision: -1, ops: [] }).diagnostics).toEqual([
      {
        message: 'Too small: expected number to be >=0',
        path: 'batch.ifRevision',
        rule: 'malformed-batch',
      },
    ]);
    const created = createCatalog({ components: { 'acme-x': { tag: 'acme-x' } } });
    expect(created.issues.map(({ code, path }) => `${code} ${path}`)).toContain(
      'malformed-definition definition.components.acme-x.events',
    );
  });
});

describe('the zod defaults the boundary sets', () => {
  const config = zm.config();
  const saved = { localeError: config.localeError, memoizer: config.memoizer };
  afterEach(() => {
    zm.config(saved);
    vi.resetModules();
  });

  it('gives English messages and the memoizer classic zod gives, when the host chose none', async () => {
    delete config.localeError;
    delete config.memoizer;
    vi.resetModules();
    const fresh = await import('../src/index.js');
    expect(zm.config().localeError).toBeTypeOf('function');
    expect(zm.config().memoizer).toBe(zm.memoizer());
    expect(fresh.validateUiSpec({ root: { component: 'p' }, version: 2 }).issues).toEqual([
      { code: 'malformed-spec', message: 'Invalid input: expected 1', path: 'spec.version' },
    ]);
  });

  it('leaves a locale the host configured in place', async () => {
    const hostLocale = () => 'host message';
    zm.config({ localeError: hostLocale });
    vi.resetModules();
    const fresh = await import('../src/index.js');
    expect(zm.config().localeError).toBe(hostLocale);
    expect(fresh.validateUiSpec({ root: { component: 'p' }, version: 2 }).issues).toEqual([
      { code: 'malformed-spec', message: 'host message', path: 'spec.version' },
    ]);
  });
});
