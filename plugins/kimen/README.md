# Kimen agent plugin

Two [Agent Skills](https://agentskills.io/) for coding agents that build
with Kimen:

- [`kimen-components`](./skills/kimen-components/SKILL.md): ordinary pages
  and apps with the `ki-*` web components and `--ki-*` design tokens.
- [`kimen-genui`](./skills/kimen-genui/SKILL.md): the generative UI layer,
  from the `kimen-mcp` server to MCP Apps, A2UI and the guarded renderer.

The skills point agents at Kimen's generated contracts (`llms.txt`, the
catalog, the MCP tools) instead of restating them, so they stay correct as
the library changes.

## Install

| Client | Command |
| --- | --- |
| Claude Code | `claude plugin marketplace add kimen-dev/kimen` then `claude plugin install kimen@kimen` |
| Codex | `codex plugin marketplace add kimen-dev/kimen` then `codex plugin add kimen@kimen` |
| Antigravity | `agy plugin install ./plugins/kimen` from a clone of the repository |
| OpenCode, Gemini CLI, GitHub Copilot, Cursor | copy `skills/kimen-components` and `skills/kimen-genui` into `.agents/skills/` |

Full setup, including the `kimen-mcp` server for each client:
<https://kimen.dev/docs/guides/connect-agents/>.

## Layout

- `skills/`: the skills, canonical here. The repository's own skill catalog
  links to them from `.agents/skills/`.
- `.claude-plugin/plugin.json`: the manifest Claude Code and Codex read; the
  marketplace is `.claude-plugin/marketplace.json` at the repository root.
- `.antigravity-plugin/plugin.json`: the Antigravity manifest.

The plugin bundles no MCP server yet: `kimen-mcp` is not on npm, so each
client starts the locally built binary (see the guide).
