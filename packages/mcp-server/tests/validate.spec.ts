// @spec:038-mcp-server
// Validation answers with errors a model can correct (S5-S8) and URL
// properties are refused (S15). "Valid" means the guarded renderer will
// paint it: the verdict is the renderer's own (D7).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type Connection, connect, INVENTORY_SPEC, textOf } from './harness.js';

interface Issue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly value?: string;
}

interface Report {
  readonly ok: boolean;
  readonly issueCount: number;
  readonly issues: readonly Issue[];
}

let server: Connection;

beforeAll(async () => {
  server = await connect();
});

afterAll(async () => {
  await server.close();
});

async function validate(
  spec: unknown,
): Promise<{ report: Report; text: string; isError: boolean }> {
  const result = await server.client.callTool({ arguments: { spec }, name: 'kimen_validate_spec' });
  return {
    isError: result.isError === true,
    report: result.structuredContent as Report,
    text: textOf(result),
  };
}

/** `levels` cards, each holding the next in its default slot. */
function nested(levels: number): unknown {
  let node: Record<string, unknown> = { component: 'ki-card', slots: { '': ['leaf'] } };
  for (let level = 1; level < levels; level += 1) {
    node = { component: 'ki-card', slots: { '': [node] } };
  }
  return { root: node, version: 1 };
}

/** One list holding `count - 1` items: `count` components in all. */
function wide(count: number): unknown {
  const items = Array.from({ length: count - 1 }, (_, index) => ({
    component: 'ki-list-item',
    slots: { '': [`item ${String(index)}`] },
  }));
  return { root: { component: 'ki-list', slots: { '': items } }, version: 1 };
}

describe('Kimen MCP server: validation (038 S5-S8, S15)', () => {
  it('S5: a spec composed only of catalog components validates', async () => {
    const spec = {
      actions: ['save'],
      root: {
        component: 'ki-card',
        slots: { '': [{ action: 'save', component: 'ki-button', slots: { '': ['Save'] } }] },
      },
      version: 1,
    };
    const { report, isError, text } = await validate(spec);
    expect(isError).toBe(false);
    expect(report).toEqual({ issueCount: 0, issues: [], ok: true });
    expect(text).toContain('valid');
  });

  it('S5: a spec sent as JSON text is judged exactly like the object', async () => {
    const { report } = await validate(JSON.stringify(INVENTORY_SPEC));
    expect(report).toEqual({ issueCount: 0, issues: [], ok: true });
  });

  it.each([
    {
      code: 'unknown-component',
      defect: 'the component "ki-carousel"',
      offender: 'ki-carousel',
      path: 'root.component',
      spec: { root: { component: 'ki-carousel' }, version: 1 },
    },
    {
      code: 'undeclared-action',
      defect: 'a "ki-button" bound to the undeclared action "delete"',
      offender: 'delete',
      path: 'root.action',
      spec: {
        root: { action: 'delete', component: 'ki-button', slots: { '': ['Delete'] } },
        version: 1,
      },
    },
    {
      code: 'invalid-prop-type',
      defect: 'a "ki-badge" whose prop "tone" is "loud"',
      offender: 'loud',
      path: 'root.props.tone',
      spec: { root: { component: 'ki-badge', props: { tone: 'loud' } }, version: 1 },
    },
    {
      code: 'forbidden-key',
      defect: 'a "ki-button" with the key "__proto__"',
      offender: '__proto__',
      path: 'spec.root.__proto__',
      // JSON.parse makes "__proto__" an own key, exactly as it arrives on the wire.
      spec: JSON.parse(
        '{"version":1,"root":{"component":"ki-button","__proto__":{"x":1}}}',
      ) as unknown,
    },
  ])(
    'S6: $defect is reported with its code, location and offender',
    async ({ code, offender, path, spec }) => {
      const { report, isError, text } = await validate(spec);
      expect(isError).toBe(false);
      expect(report.ok).toBe(false);
      expect(report.issues).toContainEqual(
        expect.objectContaining({ code, path, value: offender }),
      );
      expect(text).toContain(code);
      expect(text).toContain(path);
    },
  );

  it.each([
    { exceeds: 'nests 33 levels deep', rule: 'depth-budget', spec: nested(33) },
    { exceeds: 'holds 513 components', rule: 'node-count-budget', spec: wide(513) },
  ])(
    'S7: a spec that $exceeds is refused with the "$rule" issue the guarded renderer enforces',
    async ({ rule, spec }) => {
      const { report } = await validate(spec);
      expect(report.ok).toBe(false);
      expect(report.issues.map((issue) => issue.code)).toEqual([rule]);
    },
  );

  it('S7: specs exactly at the renderer budgets validate', async () => {
    expect((await validate(nested(32))).report.ok).toBe(true);
    expect((await validate(wide(512))).report.ok).toBe(true);
  });

  it('S8: an oversized spec is refused with the size budget alone, before catalog validation runs', async () => {
    // Over budget AND outside the catalog: only the budget is reported, so
    // the catalog checks never ran.
    const spec = {
      root: { component: 'ki-carousel', slots: { '': ['x'.repeat(300 * 1024)] } },
      version: 1,
    };
    const { report } = await validate(spec);
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.code).toBe('size-budget');
    expect(report.issues[0]?.message).toContain('262144-byte budget');
  });

  it('S8: an oversized spec sent as JSON text is refused the same way', async () => {
    const spec = JSON.stringify({
      root: { component: 'ki-card', slots: { '': ['x'.repeat(300 * 1024)] } },
      version: 1,
    });
    const { report } = await validate(spec);
    expect(report.issues.map((issue) => issue.code)).toEqual(['size-budget']);
  });

  it('bounds the report: at most 50 issues, with the total, and offending values cut to 256 characters', async () => {
    const children = Array.from({ length: 60 }, (_, index) => ({
      component: `ki-unknown-${String(index)}`,
    }));
    const many = await validate({
      root: { component: 'ki-card', slots: { '': children } },
      version: 1,
    });
    expect(many.report.issueCount).toBe(60);
    expect(many.report.issues).toHaveLength(50);
    expect(many.text).toContain('60');

    const long = await validate({ root: { component: `ki-${'a'.repeat(1000)}` }, version: 1 });
    const value = long.report.issues[0]?.value ?? '';
    expect(value.length).toBeLessThanOrEqual(257);
    expect(value.endsWith('…')).toBe(true);
  });

  it('answers a call without a spec with an error naming the missing argument', async () => {
    const result = await server.client.callTool({ arguments: {}, name: 'kimen_validate_spec' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('spec');
  });

  it('answers JSON text that does not parse with a malformed-spec issue', async () => {
    const { report } = await validate('{"version": 1, "root": ');
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe('malformed-spec');
  });

  it.each([
    { code: 'url-origin', url: 'https://tracker.example/p.gif' },
    { code: 'url-origin', url: '/avatar.png' },
    { code: 'url-scheme', url: 'javascript:alert(1)' },
  ])(
    'S15: a "ki-avatar" whose source is "$url" is refused with "$code", by validation and by render',
    async ({ code, url }) => {
      const spec = { root: { component: 'ki-avatar', props: { src: url } }, version: 1 };
      const { report } = await validate(spec);
      expect(report.ok).toBe(false);
      expect(report.issues).toContainEqual(
        expect.objectContaining({ code, path: 'root.props.src' }),
      );

      const rendered = await server.client.callTool({
        arguments: { spec },
        name: 'kimen_render_spec',
      });
      expect(rendered.isError).toBe(true);
      expect((rendered.structuredContent as Report).issues).toEqual(report.issues);
    },
  );
});
