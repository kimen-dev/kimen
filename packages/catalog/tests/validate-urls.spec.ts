// @spec:027-runtime-catalog
// URL policy at the validation boundary (FR-015, FR-018): the validator and
// every render path share one implementation, a prop is URL-typed by its
// catalog constraint, and a host may restrict URL props to declared origins.
import { describe, expect, it } from 'vitest';

import { createCatalog, validateUiSpec } from '../src/index.js';

const avatar = (src: string) => ({
  version: 1,
  root: { component: 'ki-avatar', props: { label: 'Ana García', src } },
});

const CDN = 'https://cdn.example.com';

describe('validateUiSpec — URL schemes', () => {
  it.each([
    ['javascript:alert(1)', 'javascript'],
    ['data:image/svg+xml,<svg/>', 'data'],
    [' java\tscript:alert(1)', 'javascript'],
    ['JaVaScRiPt:alert(1)', 'javascript'],
    ['vbscript:msgbox(1)', 'vbscript'],
    ['blob:https://cdn.example.com/1', 'blob'],
  ])('S20 rejects the URL value %j naming the prop and the scheme', (value, scheme) => {
    const report = validateUiSpec(avatar(value));
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    const issue = report.issues[0];
    expect(issue?.code).toBe('url-scheme');
    expect(issue?.path).toBe('root.props.src');
    expect(issue?.value).toBe(value);
    expect(issue?.message).toContain('ki-avatar');
    expect(issue?.message).toContain('"src"');
    expect(issue?.message).toContain(`"${scheme}"`);
  });

  it.each([
    'https://cdn.example.com/ana.png',
    'http://cdn.example.com/ana.png',
    '/avatars/ana.png',
    'ana.png',
    '',
  ])('S20 accepts the http(s) or relative URL value %j by default', (value) => {
    expect(validateUiSpec(avatar(value)).issues).toEqual([]);
  });
});

describe('validateUiSpec — allowed URL origins', () => {
  const restricted = (src: string, origins: readonly string[] = [CDN]) =>
    validateUiSpec(avatar(src), { allowedUrlOrigins: origins });

  it.each([
    'https://cdn.example.com/ana.png',
    'https://cdn.example.com',
    'HTTPS://CDN.EXAMPLE.COM/ana.png',
    'https://cdn.example.com:443/ana.png?size=64#top',
    '  https://cdn.example.com/ana.png  ',
  ])('S21 accepts %j, a URL of the allowed origin', (value) => {
    expect(restricted(value).issues).toEqual([]);
  });

  it.each([
    ['https://tracker.example.net/p.gif', 'https://tracker.example.net'],
    ['http://cdn.example.com/ana.png', 'http://cdn.example.com'],
    ['https://cdn.example.com:8443/ana.png', 'https://cdn.example.com:8443'],
    ['https://cdn.example.com.evil.example/ana.png', 'https://cdn.example.com.evil.example'],
    ['https://cdn.example.com@evil.example/ana.png', 'https://evil.example'],
    ['https://evil.example\\@cdn.example.com/ana.png', 'https://evil.example'],
  ])('S21 rejects %j naming the prop and the foreign origin %s', (value, origin) => {
    const report = restricted(value);
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    const issue = report.issues[0];
    expect(issue?.code).toBe('url-origin');
    expect(issue?.path).toBe('root.props.src');
    expect(issue?.value).toBe(value);
    expect(issue?.message).toContain('"src"');
    expect(issue?.message).toContain(`"${origin}"`);
  });

  it.each([
    '/avatars/ana.png',
    'ana.png',
    '',
    '//tracker.example.net/p.gif',
    '\\\\tracker.example.net\\p.gif',
    'https:cdn.example.com/ana.png',
    'https:/cdn.example.com/ana.png',
    'https:\\\\cdn.example.com/ana.png',
    'https://cdn.example.com/a.png 1x, https://tracker.example.net/b.png 2x',
    'https://cdn.example.com/a.png\n,https://tracker.example.net/b.png',
    'https://',
  ])('S21 rejects %j as not an absolute http(s) URL', (value) => {
    const report = restricted(value);
    expect(report.issues.map((issue) => issue.code)).toEqual(['url-origin']);
    expect(report.issues[0]?.message).toContain('"src"');
    expect(report.issues[0]?.message).toContain('absolute');
  });

  it('S21 still names an executable scheme as a scheme violation under allowed origins', () => {
    expect(restricted('javascript:alert(1)').issues.map((issue) => issue.code)).toEqual([
      'url-scheme',
    ]);
  });

  it('S21 rejects every URL under an empty list, and matches an origin only as URL.origin prints it', () => {
    expect(restricted('https://cdn.example.com/ana.png', []).ok).toBe(false);
    for (const loose of [
      'cdn.example.com',
      'https://cdn.example.com/',
      'https://CDN.example.com',
    ]) {
      expect(restricted('https://cdn.example.com/ana.png', [loose]).ok, loose).toBe(false);
    }
    expect(restricted('https://b.example/x', [CDN, 'https://b.example']).ok).toBe(true);
  });

  it('S21 allows no origin when the option is not a list, instead of matching by substring or throwing', () => {
    for (const misuse of ['https://cdn.example.com', null, { 0: CDN, length: 1 }]) {
      const report = validateUiSpec(avatar('https://cdn.example.com/ana.png'), {
        allowedUrlOrigins: misuse as unknown as readonly string[],
      });
      expect(report.issues.map((issue) => issue.code)).toEqual(['url-origin']);
    }
    // The substring case a bare string would otherwise accept.
    const report = validateUiSpec(avatar('https://cdn.example/ana.png'), {
      allowedUrlOrigins: 'https://cdn.example.com' as unknown as readonly string[],
    });
    expect(report.ok).toBe(false);
  });

  it('S21 leaves a node without URL props untouched by the restriction', () => {
    const report = validateUiSpec(
      { version: 1, root: { component: 'ki-badge', slots: { '': ['3 items'] } } },
      { allowedUrlOrigins: [] },
    );
    expect(report.issues).toEqual([]);
  });

  it('S22 treats a ki-qr value as data: no scheme or origin rule applies to it', () => {
    for (const value of [
      'https://other.example.org/menu',
      'WIFI:T:WPA;S:cafe;P:secret;;',
      'javascript:1',
    ]) {
      const report = validateUiSpec(
        { version: 1, root: { component: 'ki-qr', props: { label: 'Open the menu', value } } },
        { allowedUrlOrigins: [CDN] },
      );
      expect(report.issues, value).toEqual([]);
    }
  });
});

describe('validateUiSpec — URL-typed props come from the catalog constraint', () => {
  const catalogWith = (props: Record<string, unknown>) => {
    const created = createCatalog({
      components: {
        'acme-logo': {
          description: 'A partner logo.',
          events: {},
          props,
          slots: {},
          tag: 'acme-logo',
          whenNotToUse: 'Decoration.',
          whenToUse: 'Show a partner brand.',
        },
      },
    });
    if (!created.ok) {
      throw new Error(`fixture catalog must register: ${created.issues[0]?.message ?? ''}`);
    }
    return created.catalog;
  };
  const logo = (props: Record<string, string>) => ({
    version: 1,
    root: { component: 'acme-logo', props },
  });

  it('S20 applies the policy to a prop declared with the url format, whatever its name', () => {
    const catalog = catalogWith({
      caption: { description: 'Caption.', type: 'string' },
      source: { description: 'Logo image.', format: 'url', type: 'string' },
    });
    const rejected = validateUiSpec(logo({ source: 'javascript:alert(1)' }), { catalog });
    expect(rejected.issues.map((issue) => [issue.code, issue.path])).toEqual([
      ['url-scheme', 'root.props.source'],
    ]);
    const foreign = validateUiSpec(logo({ source: 'https://tracker.example.net/p.gif' }), {
      allowedUrlOrigins: [CDN],
      catalog,
    });
    expect(foreign.issues.map((issue) => issue.code)).toEqual(['url-origin']);
    // A plain string prop is text: a colon in it is not a scheme.
    expect(validateUiSpec(logo({ caption: 'Note: see javascript:void' }), { catalog }).ok).toBe(
      true,
    );
  });

  it('S20 keeps the fetchable attribute names URL-typed for a catalog that declares no format', () => {
    const catalog = catalogWith({ href: { description: 'Target.', type: 'string' } });
    expect(validateUiSpec(logo({ href: 'javascript:alert(1)' }), { catalog }).issues[0]?.code).toBe(
      'url-scheme',
    );
  });
});
