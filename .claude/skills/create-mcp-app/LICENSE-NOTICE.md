# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `create-mcp-app`
- **Source**: https://github.com/modelcontextprotocol/ext-apps — path `plugins/mcp-apps/skills/create-mcp-app/`
- **Pinned commit**: `fa1274490873f869c9a084e1abb9cf3031d288c7` (branch `main`, last upstream commit 2026-06-17; fetched 2026-07-05)
- **Upstream author**: Model Context Protocol (a Series of LF Projects, LLC)
- **License**: The ext-apps repo is transitioning MIT → Apache-2.0. New code and
  specification contributions are Apache-2.0; documentation (excluding specs) is
  CC-BY-4.0; unrelicensed MIT contributions remain MIT. This vendored `SKILL.md`
  is documentation. Treat as **Apache-2.0 OR CC-BY-4.0** (both compatible with
  the Kimen Apache-2.0 repo). See repo LICENSE for the full transition text.

## Supply-chain audit (Kimen constitution Art. X / XI)

Reviewed in full on 2026-07-05 before vendoring. Markdown-only guidance for
building MCP Apps. Two items flagged and accepted with a header note:

1. **Remote code clone:** the "Getting Reference Code" step runs
   `git clone … modelcontextprotocol/ext-apps … /tmp/mcp-ext-apps`, pinned to the
   published npm version tag (`v$(npm view @modelcontextprotocol/ext-apps version)`).
   This is reference material from the official MCP org, not executed as code by
   the skill. Kimen header note requires this run only in a credential-free
   sandbox (Art. XI).
2. **`npm install` steps:** the skill installs SDK deps. Kimen header note
   redirects to `pnpm add` + the audit-and-pin gate for any Kimen integration,
   and confines installs to a sandbox.

No credential access, no telemetry/egress beyond the declared clone/install,
no destructive commands, no hidden instructions detected.

## Local modifications

- Added a top "Kimen note (local adaptation, Art. XI)" blockquote: run the
  clone/install steps only in a credential-free sandbox.
- Added two inline "Kimen note" blockquotes: use pnpm + pinning for Kimen
  integration; treat new runtime deps as gated by the supply-chain gate.
- No content changes to the MCP Apps guidance itself.

## Omitted from upstream (intentionally)

- Plugin packaging (`.claude-plugin/`, plugin.json) and the rest of the
  ext-apps monorepo (SDK source, examples). The skill intentionally references
  those via the pinned clone rather than bundling them. Only `SKILL.md` is
  vendored.
