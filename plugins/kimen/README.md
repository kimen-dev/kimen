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
| OpenCode, Gemini CLI, GitHub Copilot, Cursor and other agents | `npx skills add kimen-dev/kimen --skill kimen-components --skill kimen-genui` |

The last row uses the open [`skills` CLI](https://skills.sh/) (Node 22.20 or
later). It asks which agents to install for and puts the skills in each one's
skills folder, `.agents/skills/` for most; add `-g` to install them for every
project. Name both skills: the repository also holds the skills Kimen's
maintainers use, and the CLI lists those too. Copying the two folders into
`.agents/skills/` by hand works as well.

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
