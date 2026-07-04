---
name: zod
description: >
  Zod v4 best practices, patterns, and API guidance for schema validation,
  parsing, error handling, and type inference in TypeScript applications.
  Covers safeParse, object composition, refinements, transforms, codecs,
  branded types, and v3→v4 migration. Baseline: zod ^4.0.0.
  Triggers on: zod imports, z.object, z.string, z.infer, safeParse,
  mentions of "zod", "schema validation", "zod v4", or "z.enum".
license: MIT
user-invocable: false
agentic: false
compatibility: "TypeScript ^5.5 projects using zod ^4.0.0"
metadata:
  author: Anivar Aravind
  author_url: https://anivar.net
  version: 1.0.0
  tags: zod, validation, schema, typescript, parsing, type-inference, forms, api
---

# Zod

> **Kimen note (local adaptation):** Kimen uses Zod for its schema-constrained
> **catalog** (the neutral, protocol-agnostic UI catalog) — validating catalog
> entries and adapter inputs at boundaries (constitution Art. VIII). Kimen is
> TypeScript-strict (Art. IV). The `arch-boundary-parsing` rule below maps
> directly: parse untrusted input (adapter payloads, external data) at the
> boundary, pass typed data into the catalog/domain. This vendored copy
> consolidates the upstream granular `rules/` + `references/` trees into the
> single compiled guide `AGENTS.md` (see LICENSE-NOTICE.md) — read that file for
> the full rule text rather than the per-rule paths referenced below.

**IMPORTANT:** Your training data about `zod` may be outdated or incorrect — Zod v4 introduces breaking changes to string formats, enums, error handling, and recursive types. Always rely on this skill's compiled guide (`AGENTS.md`) and the project's actual source code as the source of truth. Do not fall back on memorized v3 patterns when they conflict with the retrieved reference.

## When to Use Zod

Zod is for **runtime type validation** — parsing untrusted data at system boundaries (API input, form data, env vars, external services). For compile-time-only types, plain TypeScript is sufficient.

| Need | Recommended Tool |
|------|-----------------|
| API input/output validation | **Zod** |
| Form validation (React, Vue) | **Zod** (with react-hook-form, formik, etc.) |
| Env var parsing | **Zod** (with t3-env or manual) |
| Compile-time types only | Plain TypeScript |
| Smaller bundle (~1kb) | Valibot |
| Maximum type inference | ArkType |

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Parsing & Type Safety | CRITICAL | `parse-` |
| 2 | Schema Design | CRITICAL | `schema-` |
| 3 | Refinements & Transforms | HIGH | `refine-` |
| 4 | Error Handling | HIGH | `error-` |
| 5 | Performance & Composition | MEDIUM | `perf-` |
| 6 | v4 Migration | MEDIUM | `migrate-` |
| 7 | Advanced Patterns | MEDIUM | `pattern-` |
| 8 | Architecture & Boundaries | CRITICAL/HIGH | `arch-` |
| 9 | Observability | HIGH/MEDIUM | `observe-` |

## Quick Reference

### 1. Parsing & Type Safety (CRITICAL)

- `parse-use-safeParse` — Use `safeParse()` for user input instead of `parse()` which throws
- `parse-async-required` — Must use `parseAsync()`/`safeParseAsync()` when schema has async refinements
- `parse-infer-types` — Use `z.infer<typeof Schema>` for output types; never manually duplicate types

### 2. Schema Design (CRITICAL)

- `schema-object-unknowns` — `z.object()` strips unknown keys; use `strictObject` or `looseObject`
- `schema-union-discriminated` — Use `z.discriminatedUnion()` for tagged unions, not `z.union()`
- `schema-coercion-pitfalls` — `z.coerce.boolean()` makes `"false"` → `true`; use `z.stringbool()`
- `schema-recursive-types` — Use getter pattern for recursive schemas; `z.lazy()` is removed in v4

### 3. Refinements & Transforms (HIGH)

- `refine-never-throw` — Never throw inside `.refine()` or `.transform()`; use `ctx.addIssue()`
- `refine-vs-transform` — `.refine()` for validation, `.transform()` for conversion, `.pipe()` for staging
- `refine-cross-field` — `.superRefine()` on parent object for cross-field validation with `path`

### 4. Error Handling (HIGH)

- `error-custom-messages` — Use v4 `error` parameter; `required_error`/`invalid_type_error` are removed
- `error-formatting` — `z.flattenError()` for forms, `z.treeifyError()` for nested; `formatError` deprecated
- `error-input-security` — Never use `reportInput: true` in production; leaks sensitive data

### 5. Performance & Composition (MEDIUM)

- `perf-extend-spread` — Use `{ ...Schema.shape }` spread over chained `.extend()` for large schemas
- `perf-reuse-schemas` — Define once, derive with `.pick()`, `.omit()`, `.partial()`
- `perf-zod-mini` — Use `zod/v4/mini` (1.88kb) for bundle-critical client apps

### 6. v4 Migration (MEDIUM)

- `migrate-string-formats` — Use `z.email()`, `z.uuid()`, `z.url()` not `z.string().email()`
- `migrate-native-enum` — Use unified `z.enum()` for TS enums; `z.nativeEnum()` is removed
- `migrate-error-api` — Use `error` parameter everywhere; `message`, `errorMap` are removed

### 7. Advanced Patterns (MEDIUM)

- `pattern-branded-types` — `.brand<"Name">()` for nominal typing (USD vs EUR)
- `pattern-codecs` — `z.codec()` for bidirectional transforms (parse + serialize)
- `pattern-pipe` — `.pipe()` for staged parsing (string → number → validate range)

### 8. Architecture & Boundaries (CRITICAL/HIGH)

- `arch-boundary-parsing` — Parse at system boundaries (API handler, env, form, fetch); pass typed data to domain logic
- `arch-schema-organization` — Co-locate schemas with their boundary layer; domain types use `z.infer`
- `arch-schema-versioning` — Additive changes only for non-breaking evolution; new fields use `.optional()`

### 9. Observability (HIGH/MEDIUM)

- `observe-structured-errors` — Use `z.flattenError()` for compact structured logs with request correlation IDs
- `observe-error-metrics` — `trackedSafeParse()` wrapper to increment counters per schema and field on failure

## Schema Types Quick Reference

| Type | Syntax |
|------|--------|
| String | `z.string()` |
| Number | `z.number()`, `z.int()`, `z.float()` |
| Boolean | `z.boolean()` |
| BigInt | `z.bigint()` |
| Date | `z.date()` |
| Undefined | `z.undefined()` |
| Null | `z.null()` |
| Void | `z.void()` |
| Any | `z.any()` |
| Unknown | `z.unknown()` |
| Never | `z.never()` |
| Literal | `z.literal("foo")`, `z.literal(42)` |
| Enum | `z.enum(["a", "b"])`, `z.enum(TSEnum)` |
| Email | `z.email()` |
| URL | `z.url()` |
| UUID | `z.uuid()` |
| String→Bool | `z.stringbool()` |
| ISO DateTime | `z.iso.datetime()` |
| File | `z.file()` |
| JSON | `z.json()` |
| Array | `z.array(schema)` |
| Tuple | `z.tuple([a, b])` |
| Object | `z.object({})` |
| Strict Object | `z.strictObject({})` |
| Loose Object | `z.looseObject({})` |
| Record | `z.record(keySchema, valueSchema)` |
| Map | `z.map(keySchema, valueSchema)` |
| Set | `z.set(schema)` |
| Union | `z.union([a, b])` |
| Disc. Union | `z.discriminatedUnion("key", [...])` |
| Intersection | `z.intersection(a, b)` |

## How to Use

> **Kimen note:** upstream ships one file per rule under `rules/` and per-topic
> deep dives under `references/`. Those were **consolidated into `AGENTS.md`**
> when vendoring (the compiled guide contains every rule's incorrect→correct
> examples and the reference material). Read `AGENTS.md` for the full detail
> instead of the `rules/…` / `references/…` paths named below.

Each rule (in `AGENTS.md`) contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and decision tables

## Full Compiled Document

For the complete guide with all rules expanded: **`AGENTS.md`** (bundled in this
skill directory).
