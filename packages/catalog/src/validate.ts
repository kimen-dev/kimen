/**
 * UI-spec validation at the GenUI boundary (spec 027, Art. VIII).
 *
 * A UI spec is data, never code: validation never executes, evaluates or
 * interprets spec content (FR-004). Specs composed only of cataloged
 * components with declared, well-typed props and declared actions are
 * accepted; everything else is rejected with issues naming the offending
 * component, prop, value or action and its location.
 *
 * What this boundary does NOT protect against (FR-015): URL-scheme
 * allowlisting (`javascript:`, `data:` and other executable schemes) and
 * markup inertness are render-path invariants owned by the guarded renderer
 * (spec 028) — the safe-scheme policy is a render decision, and duplicating
 * it here would create two drifting sources for one rule (Art. I). Catalog
 * validation is a schema boundary, never content sanitization; a host that
 * renders outside the guarded renderer is outside the guardrail.
 */
import { z } from 'zod';

import { catalogData } from './generated/catalog.js';

/** One prop constraint, exactly as narrow as the manifest documents. */
export interface CatalogPropConstraint {
  readonly type: 'boolean' | 'enum' | 'number' | 'string';
  /** Closed value set (present exactly when `type` is `enum`). */
  readonly values?: readonly string[];
  /** Documented values of a deliberately open string union (agent guidance). */
  readonly documentedValues?: readonly string[];
  readonly default?: boolean | number | string;
  readonly description: string;
}

/** One published custom element's schema (tag, props, slots, guidance). */
export interface CatalogEntry {
  readonly tag: string;
  readonly description: string;
  readonly whenToUse: string;
  readonly whenNotToUse: string;
  readonly props: Readonly<Record<string, CatalogPropConstraint>>;
  readonly slots: Readonly<Record<string, string>>;
  readonly events: Readonly<Record<string, string>>;
}

// One structural compile-time check: the generated artifact must satisfy the
// published entry contract, so a generator regression fails the build here.
const componentEntries: Readonly<Record<string, CatalogEntry>> = catalogData.components;

/** A node of the neutral UI-spec tree: one cataloged component instance. */
export interface UiSpecNode {
  readonly component: string;
  readonly props?: Readonly<Record<string, boolean | number | string>> | undefined;
  /** Binding to one of the spec's declared actions (dispatch is 028's job). */
  readonly action?: string | undefined;
  /** Children per slot name; `""` is the default slot. Strings are text. */
  readonly slots?: Readonly<Record<string, readonly (UiSpecNode | string)[]>> | undefined;
}

/** The neutral, protocol-free UI-spec document agents emit (data, not code). */
export interface UiSpec {
  readonly version: 1;
  /** Every action a binding may reference MUST be declared here (FR-005). */
  readonly actions?: readonly string[] | undefined;
  readonly root: UiSpecNode;
}

export interface ValidationIssue {
  readonly code:
    | 'forbidden-key'
    | 'invalid-prop-type'
    | 'malformed-spec'
    | 'size-budget'
    | 'undeclared-action'
    | 'unknown-component'
    | 'unknown-prop'
    | 'unknown-slot';
  /** Location in the spec document, e.g. `root.slots.footer[0].props.tone`. */
  readonly path: string;
  readonly message: string;
}

export interface ValidationReport {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

/**
 * The declared validation payload budget in UTF-8 bytes (FR-014): a spec
 * beyond it is rejected before deep traversal, so validation time and memory
 * stay bounded for standalone consumers. A byte budget bounds depth and node
 * count by construction; the finer render-time budgets (depth, node count,
 * accumulated stream) are the guarded renderer's contract (028 FR-006).
 */
export const VALIDATION_MAX_BYTES = 262_144;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * JSON.stringify's lib typing hides the `undefined` it returns for
 * non-serializable roots; the declared return type restores it (a const
 * annotation would be narrowed away by control flow at the use site).
 */
function serializeSafely(value: unknown): string | undefined {
  return JSON.stringify(value);
}

const uiSpecNodeSchema: z.ZodType<UiSpecNode> = z.lazy(() =>
  z.strictObject({
    component: z.string(),
    props: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).optional(),
    action: z.string().optional(),
    slots: z.record(z.string(), z.array(z.union([z.string(), uiSpecNodeSchema]))).optional(),
  }),
);

const uiSpecSchema = z.strictObject({
  version: z.literal(1),
  actions: z.array(z.string().min(1)).optional(),
  root: uiSpecNodeSchema,
});

/**
 * Rejects any own `__proto__`/`constructor`/`prototype` key anywhere in the
 * document (FR-013), naming the forbidden key. Purely observational: the
 * walk never mutates the spec and never touches objects outside it.
 */
function collectForbiddenKeys(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectForbiddenKeys(item, `${path}[${String(index)}]`, issues);
    });
    return;
  }
  if (typeof value !== 'object' || value === null) {
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      continue;
    }
    if (FORBIDDEN_KEYS.has(key)) {
      issues.push({
        code: 'forbidden-key',
        message: `forbidden key "${key}" is not allowed in a UI spec`,
        path: `${path}.${key}`,
      });
      continue;
    }
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && 'value' in descriptor) {
      collectForbiddenKeys(descriptor.value, `${path}.${key}`, issues);
    }
  }
}

function checkProp(
  component: string,
  name: string,
  value: boolean | number | string,
  constraint: CatalogPropConstraint,
  path: string,
  issues: ValidationIssue[],
): void {
  switch (constraint.type) {
    case 'boolean':
    case 'number':
    case 'string': {
      if (typeof value !== constraint.type) {
        issues.push({
          code: 'invalid-prop-type',
          message: `${component} prop "${name}" expects a ${constraint.type} value`,
          path,
        });
      }
      return;
    }
    case 'enum': {
      const values = constraint.values ?? [];
      if (typeof value !== 'string' || !values.includes(value)) {
        issues.push({
          code: 'invalid-prop-type',
          message: `${component} prop "${name}" expects one of ${values
            .map((allowed) => `"${allowed}"`)
            .join(', ')}`,
          path,
        });
      }
      return;
    }
  }
}

function checkNode(
  node: UiSpecNode,
  path: string,
  declaredActions: ReadonlySet<string>,
  issues: ValidationIssue[],
): void {
  const entry = componentEntries[node.component];
  if (entry === undefined) {
    issues.push({
      code: 'unknown-component',
      message: `component "${node.component}" is outside the catalog`,
      path: `${path}.component`,
    });
  }
  for (const [name, value] of Object.entries(node.props ?? {})) {
    const constraint = entry?.props[name];
    if (entry !== undefined && constraint === undefined) {
      issues.push({
        code: 'unknown-prop',
        message: `${node.component} declares no prop "${name}"`,
        path: `${path}.props.${name}`,
      });
      continue;
    }
    if (constraint !== undefined) {
      checkProp(node.component, name, value, constraint, `${path}.props.${name}`, issues);
    }
  }
  if (node.action !== undefined && !declaredActions.has(node.action)) {
    issues.push({
      code: 'undeclared-action',
      message: `action "${node.action}" is not declared in the spec's action list`,
      path: `${path}.action`,
    });
  }
  for (const [slotName, children] of Object.entries(node.slots ?? {})) {
    if (entry !== undefined && !(slotName in entry.slots)) {
      issues.push({
        code: 'unknown-slot',
        message: `${node.component} declares no slot "${slotName}"`,
        path: `${path}.slots.${slotName}`,
      });
    }
    children.forEach((child, index) => {
      if (typeof child !== 'string') {
        checkNode(child, `${path}.slots.${slotName}[${String(index)}]`, declaredActions, issues);
      }
    });
  }
}

/**
 * Validates an agent-emitted UI spec against the generated catalog (FR-004).
 * Pure data processing over `input`: nothing is executed, nothing outside
 * the spec is ever mutated, and every rejection names its offender. The
 * size budget (FR-014) runs first, before any deep traversal.
 */
export function validateUiSpec(
  input: unknown,
  options: { readonly maxBytes?: number } = {},
): ValidationReport {
  const maxBytes = options.maxBytes ?? VALIDATION_MAX_BYTES;
  let serialized: string;
  try {
    serialized = typeof input === 'string' ? input : (serializeSafely(input) ?? '');
  } catch {
    return {
      issues: [
        {
          code: 'malformed-spec',
          message: 'the spec is not serializable data (cycles or exotic values)',
          path: '',
        },
      ],
      ok: false,
    };
  }
  const byteLength = new TextEncoder().encode(serialized).length;
  if (byteLength > maxBytes) {
    return {
      issues: [
        {
          code: 'size-budget',
          message: `spec payload of ${String(byteLength)} bytes exceeds the ${String(maxBytes)}-byte validation budget`,
          path: '',
        },
      ],
      ok: false,
    };
  }
  let document: unknown = input;
  if (typeof input === 'string') {
    try {
      document = JSON.parse(input);
    } catch {
      return {
        issues: [{ code: 'malformed-spec', message: 'the spec is not valid JSON', path: '' }],
        ok: false,
      };
    }
  }

  const forbidden: ValidationIssue[] = [];
  collectForbiddenKeys(document, 'spec', forbidden);
  if (forbidden.length > 0) {
    return { issues: forbidden, ok: false };
  }

  const parsed = uiSpecSchema.safeParse(document);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => ({
        code: 'malformed-spec',
        message: issue.message,
        path: ['spec', ...issue.path.map(String)].join('.'),
      })),
      ok: false,
    };
  }

  const issues: ValidationIssue[] = [];
  const declaredActions = new Set(parsed.data.actions ?? []);
  checkNode(parsed.data.root, 'root', declaredActions, issues);
  return { issues, ok: issues.length === 0 };
}
