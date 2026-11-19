import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// The OSV scan in .github/workflows/security.yml filters each lockfile with
// the osv-scanner.toml in that lockfile's own directory (the root one for
// pnpm-lock.yaml, .semgrep/osv-scanner.toml for the Semgrep engine's lock).
// Every ignore is meant to be temporary: it names why the advisory does not
// apply and the date the scan starts reporting it again. Both depend on the
// scanner reading the field the entry uses. OSV-Scanner 2 renamed
// `ignoreUntil` to `effectiveUntil` and only warns about the old name; once
// it stops reading it, an entry still spelled that way loses its expiry and
// the ignore becomes permanent without anything turning red.
const repositoryRoot = new URL('../../', import.meta.url);
const configPaths = execFileSync(
  'git',
  ['ls-files', '--', 'osv-scanner.toml', '*/osv-scanner.toml'],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
)
  .split('\n')
  .filter(Boolean);

function readIgnoredVulns(source) {
  const uncommented = source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  return uncommented
    .split(/^\[\[IgnoredVulns\]\]\s*$/mu)
    .slice(1)
    .map((block) => {
      const fields = {};
      for (const match of block.matchAll(/^([A-Za-z]+)\s*=\s*(.+?)\s*$/gmu)) {
        fields[match[1]] = match[2];
      }
      return fields;
    });
}

test('the OSV configs the scan applies are tracked: the root one and the Semgrep engine one', () => {
  assert.deepEqual(configPaths.toSorted(), ['.semgrep/osv-scanner.toml', 'osv-scanner.toml']);
});

test('every OSV ignore names an advisory, a reason and an expiry the scanner reads', async () => {
  for (const path of configPaths) {
    const entries = readIgnoredVulns(await readFile(new URL(path, repositoryRoot), 'utf8'));
    assert.ok(entries.length > 0, `${path} declares no [[IgnoredVulns]] entries`);

    const ids = entries.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate ignore ids: ${ids.join(', ')}`);

    for (const entry of entries) {
      const label = `${path} ${entry.id ?? JSON.stringify(entry)}`;
      assert.match(
        entry.id ?? '',
        /^"[A-Z]+-[A-Za-z0-9-]+"$/u,
        `${label}: id must name one advisory`,
      );
      assert.equal(
        entry.ignoreUntil,
        undefined,
        `${label}: ignoreUntil is deprecated, use effectiveUntil`,
      );
      assert.match(
        entry.effectiveUntil ?? '',
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u,
        `${label}: effectiveUntil must be a UTC date-time, so the ignore expires`,
      );
      assert.match(
        entry.reason ?? '',
        /^".{40,}"$/u,
        `${label}: reason must say why the advisory does not apply`,
      );
    }
  }
});
