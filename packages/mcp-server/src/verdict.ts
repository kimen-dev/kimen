/**
 * The server's verdict on an untrusted UI spec (spec 038 D3, D5, D7):
 * `preflightUiSpec` — the guarded renderer's own preparation, without a DOM
 * — under the server's URL policy, so "valid" here means exactly "the
 * surface will paint it". The report is bounded before it reaches a model.
 */
import {
  preflightUiSpec,
  type RenderDiagnostic,
  type UiSpec,
  VALIDATION_MAX_BYTES,
  validateUiSpec,
} from '@kimen/catalog';

import { MAX_REPORTED_ISSUES, MAX_VALUE_CHARS } from './limits.js';

/**
 * D5: no URL origin is admitted, so every URL property is refused. The
 * surface document declares no network origin — it can load nothing remote —
 * and a navigable URL would lead the host's frame away from the guarded
 * renderer.
 */
const ALLOWED_URL_ORIGINS: readonly string[] = [];

/** One correctable defect: the violated rule, where, why, and the offender. */
interface SpecIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly value?: string;
}

/** A bounded validation report: the first issues and how many there are in all. */
export interface SpecReport {
  readonly ok: boolean;
  readonly issueCount: number;
  readonly issues: readonly SpecIssue[];
}

export type SpecVerdict =
  | { readonly ok: true; readonly spec: UiSpec; readonly report: SpecReport }
  | { readonly ok: false; readonly report: SpecReport };

/** `value` cut to `MAX_VALUE_CHARS` UTF-16 units, never splitting a surrogate pair. */
function cut(value: string): string {
  if (value.length <= MAX_VALUE_CHARS) {
    return value;
  }
  const last = value.charCodeAt(MAX_VALUE_CHARS - 1);
  const end = last >= 0xd800 && last <= 0xdbff ? MAX_VALUE_CHARS - 1 : MAX_VALUE_CHARS;
  return `${value.slice(0, end)}…`;
}

function toIssue(diagnostic: RenderDiagnostic): SpecIssue {
  const issue = {
    code: diagnostic.rule,
    message: cut(diagnostic.message),
    path: cut(diagnostic.path),
  };
  return diagnostic.value === undefined ? issue : { ...issue, value: cut(diagnostic.value) };
}

/**
 * The spec argument as the catalog boundary expects it: JSON text is
 * measured against the byte budget and parsed by the catalog itself, any
 * other value crosses its purity wall.
 */
export function judgeSpec(input: unknown): SpecVerdict {
  // S8: JSON text over the byte budget is refused before it is parsed, by
  // the catalog's own string pre-check (the renderer's preparation parses
  // first and measures the parsed payload).
  const diagnostics =
    typeof input === 'string' && Buffer.byteLength(input, 'utf8') > VALIDATION_MAX_BYTES
      ? validateUiSpec(input).issues.map((issue) => ({ ...issue, rule: issue.code }))
      : preflightUiSpec(input, { allowedUrlOrigins: ALLOWED_URL_ORIGINS }).diagnostics;
  if (diagnostics.length > 0) {
    return {
      ok: false,
      report: {
        issueCount: diagnostics.length,
        issues: diagnostics.slice(0, MAX_REPORTED_ISSUES).map(toIssue),
        ok: false,
      },
    };
  }
  // The preflight accepted it, so it is plain, catalog-valid data: parse the
  // JSON text form once more to hand the surface the spec itself.
  const spec = (typeof input === 'string' ? JSON.parse(input) : input) as UiSpec;
  return { ok: true, report: { issueCount: 0, issues: [], ok: true }, spec };
}
