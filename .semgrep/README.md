# Vendored Semgrep ruleset

`p-default.vendored.yml` is the Semgrep registry ruleset `p/default`, pinned
into the repository.

## Why it is vendored

The PR gate has to be deterministic (Art. X). `--config p/default` resolves
against the registry at scan time, so the rule set changes underneath us
server-side: a rule added upstream can turn a pull request red that changed
nothing, and a rule withdrawn upstream can quietly stop enforcing something.
Neither is acceptable in a required check.

Pinned here, the scan is a pure function of the tree. It also stops needing
`semgrep.dev` at scan time, so the gate has one fewer external dependency.

`.github/workflows/security.yml` deliberately keeps using the live registry on
its scheduled run. That division is the point: **the pinned set blocks, the
live set explores.** When the scheduled scan finds something the pinned set
does not carry, that is the signal to refresh this file.

## What is in it

271 of the registry's 1073 rules, filtered twice.

**By language.** Only rules whose `languages` include something this repository
contains: `javascript`, `typescript`, `js`, `ts`, `json`, `yaml`, `generic`,
`regex`, `bash`, `sh`, `html`, `dockerfile`. The rest target C, C#, Go, Java,
Kotlin, Lua, OCaml, PHP, Python, Ruby, Rust, Scala, Solidity, Swift and
Terraform, none of which appear here. This costs nothing: Semgrep already
selects rules by target language, so those rules never ran anyway.

**By category.** The 44 `*.secrets.*` rules are dropped, and this one is not
free — it is forced. They carry credential-shaped placeholders as rule data
(the Slack rule's `pattern-not` excludes Slack's documentation example
verbatim), and GitHub push protection blocks any push containing them. This
file cannot exist with them in it; the first attempt to commit it was rejected.

What that costs is covered three times over, which is why it is acceptable:

- **GitHub push protection** stops a real credential before it reaches the
  remote at all — demonstrated by it stopping this very file.
- **`security.yml`'s `secrets` job** runs gitleaks over the full history plus
  TruffleHog on verified findings.
- **The scheduled registry scan** still carries all 44.

So the gate runs **231 rules** where the registry run selects 275. The
44-rule difference is entirely secret detection. No SAST rule was dropped.

## Refreshing it

```sh
curl -sSL https://semgrep.dev/c/p/default -o /tmp/p-default.yml
node scripts/gates/vendor-semgrep-rules.mjs /tmp/p-default.yml
bash scripts/gates/semgrep-scan.sh
```

Review the diff as you would any dependency bump: new rules can introduce new
findings, and a finding that appears without a code change is a rule change,
not a regression.

## Note on scanning this directory

The scan excludes `.semgrep/`. Rule files carry code patterns as data, and
other rules match them — scanning the ruleset with itself produced 8 findings
that were all rule content, not repository code.

## Licence

The rules are Semgrep Rules License v1.0 (see the `license` field on each
rule); each carries its `source` and `shortlink` back to semgrep.dev.

## The engine

`requirements.txt` is the engine's lock: Semgrep at the version
`scripts/gates/semgrep-scan.sh` pins, and every package it depends on, each
with the hashes of its files. The workflows install from it through
`scripts/gates/install-semgrep.sh`, which checks every file against its hash,
resolves no dependency and builds nothing from source. One of those jobs
builds the tarballs a release publishes, so nothing unvouched runs beside
them.

To move to another Semgrep version, change `SEMGREP_VERSION` in
`scripts/gates/semgrep-scan.sh` and in the command below, regenerate the lock
keeping its header comment, and run the scan:

```sh
printf 'semgrep==1.185.0\n' >/tmp/semgrep.in
uv pip compile /tmp/semgrep.in --universal --generate-hashes \
  --python-version 3.10 --no-header --no-annotate \
  --exclude-newer 2026-11-12T00:00:00Z -o /tmp/semgrep.lock
bash scripts/gates/semgrep-scan.sh
```

`--exclude-newer` is the date seven days before you regenerate: the release age
Renovate waits for everywhere else (Art. X), applied here to Semgrep and to
every package it pulls in. Without it, uv takes whatever was published that
morning. The 1.185.0 lock was generated on 2026-11-19, when that would have
been a pydantic released the same day.

The cutoff can also move a package back from the previous lock, if that lock
took a release that was not a week old yet. That is the rule working, not a
regression. The 1.168.0 lock was resolved without a cutoff, so the 1.185.0 one
moved four packages to the release before: click-option-group 0.5.10 → 0.5.9
on every Python, and on Python ≥ 3.11 bracex 3.2.3 → 3.2.2, pydantic-settings
2.16.3 → 2.16.2 and python-multipart 0.0.34 → 0.0.33. Those newer versions
came out between 2026-11-13 and 2026-11-16. Semgrep constrains none of them.

Review the lock's diff as a dependency bump: it is the full list of what runs
in the release job. The OSV scan in `.github/workflows/security.yml` reads this
file too, so an advisory in any of these packages turns that scan red until it
is upgraded or ignored with a reason in `.semgrep/osv-scanner.toml`. The scanner
applies the config next to each lockfile, so the root `osv-scanner.toml` does
not cover this one. Renovate leaves this file alone (`renovate.json`): it bumps
one package at a time and never re-resolves the rest, so the lock moves only by
regenerating it.
