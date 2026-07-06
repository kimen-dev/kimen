# Kimen loop sandbox

Disposable, credential-free container where unattended agent loops run
(constitution digest, Art. XI). Vendor-agnostic: Claude Code and Codex CLI
are baked into the image; use whichever model fits the task. No npm or
GitHub credentials inside; egress restricted to an allowlist (npm registry,
GitHub, Playwright CDN, Anthropic + OpenAI APIs) by `init-firewall.sh`.
Permission-bypass agent execution is allowed only here, because there is
nothing to exfiltrate.

## Usage: two commands, total

```bash
# ONCE: sign Codex in with your ChatGPT subscription (persists in a volume)
bash sandbox/login.sh

# PER LOOP: branch + task. Everything else is automatic (disposable clone,
# firewall, install, Codex under the loop contract, gates verdict).
bash sandbox/loop.sh <feature-branch> "the task"
```

When it finishes it prints the verdict and the exact commands to review the
diff, keep the result (`git fetch`) or discard the clone. Whoever writes,
the reviewer should be a strong model from a DIFFERENT vendor (constitution
Workflow), and the gates are the only definition of done.

For interactive debugging there is also `sandbox/run.sh <clone-path>`, which
drops you in a shell inside the same containment (pass ANTHROPIC_API_KEY or
OPENAI_API_KEY if you want an agent available by API instead of the
subscription volume).

## Notes

- The allowlist resolves domains to IPs at start; if a CDN rotates mid-loop,
  re-run `sudo /usr/local/bin/init-firewall.sh`.
- Requires `--cap-add=NET_ADMIN` (set by `run.sh`). The primary defense is
  the absence of credentials; the firewall reduces the exfiltration surface.
- `ANTHROPIC_API_KEY` is the only secret present: use a dedicated, rotatable,
  low-privilege key.
