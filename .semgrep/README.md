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
