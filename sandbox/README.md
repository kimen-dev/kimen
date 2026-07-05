# Kimen loop sandbox

Disposable, credential-free container where unattended agent loops run
(constitution digest, Art. XI): no npm or GitHub credentials inside, egress
restricted to an allowlist (npm registry, GitHub, Playwright CDN, Anthropic
API) by `init-firewall.sh`. Permission-bypass agent execution is allowed only
here, because there is nothing to exfiltrate.

## Usage

```bash
# dedicated worktree for the feature branch (single writer per feature)
git worktree add ../kimen-<feature> <feature-branch>

ANTHROPIC_API_KEY=<low-privilege-key> bash sandbox/run.sh ../kimen-<feature>
```

Inside: `pnpm install --frozen-lockfile`, run the loop, verify with
`bash scripts/gates/gates-suite.sh`.

## Notes

- The allowlist resolves domains to IPs at start; if a CDN rotates mid-loop,
  re-run `sudo /usr/local/bin/init-firewall.sh`.
- Requires `--cap-add=NET_ADMIN` (set by `run.sh`). The primary defense is
  the absence of credentials; the firewall reduces the exfiltration surface.
- `ANTHROPIC_API_KEY` is the only secret present: use a dedicated, rotatable,
  low-privilege key.
