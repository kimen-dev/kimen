// @spec:034-framework-wrappers
// Typed-surface proof (S4): the manifest's enum unions flow through the
// wrapper — a correct usage compiles and an out-of-union prop value fails
// the type-check naming the prop. Runs the REAL compiler over the fixture
// pair so the assertion can never drift from tsc behavior.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const packageRoot = join(__dirname, '..');

function typecheck(project: string): { ok: boolean; output: string } {
  try {
    execFileSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', project], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: '' };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

describe('react wrapper types', () => {
  it('S4 fails the type-check on an out-of-union enum prop, naming the prop', () => {
    const good = typecheck('tests/fixtures/tsconfig.good.json');
    expect(good.output).toBe('');
    expect(good.ok).toBe(true);

    const bad = typecheck('tests/fixtures/tsconfig.bad.json');
    expect(bad.ok).toBe(false);
    // tsc names the offending literal and the prop's manifest union type.
    expect(bad.output).toContain('sparkly');
    expect(bad.output).toContain('KiButtonVariant');
  });
});
