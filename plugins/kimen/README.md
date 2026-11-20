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
- `evals/`: behaviour tests for the skills, run with `claude plugin eval`
  (see [Evals](#evals)).

The plugin bundles no MCP server yet: `kimen-mcp` is not on npm, so each
client starts the locally built binary (see the guide).

## Evals

`evals/` holds four cases for
[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals):

| Case | Skill | What it checks |
| --- | --- | --- |
| `signup-form-page` | `kimen-components` | a form page that reads the contracts at kimen.dev, uses only real `ki-*` tags and attributes, loads the tokens and registers the components |
| `dark-mode-toggle` | `kimen-components` | a theme switch through `data-ki-color-scheme`, with the page painted by tokens: no hard-coded colours, no `!important` |
| `address-confirmation-spec` | `kimen-genui` | a UI spec with catalog components only, attribute-name props, declared and bound actions, no markup or styling |
| `unrelated-request` | neither | a Python task loads no Kimen skill |

Every grader is deterministic (file, regex and tool-call checks), so the
only model calls are the runs themselves. The allow-lists of tags,
attributes and catalog components are copied from the generated contracts;
refresh them when a component changes. From the repository root:

```sh
claude plugin eval plugins/kimen --allow-tools Write "WebFetch(domain:kimen.dev)"
```

Each case runs three times with the plugin and three times without it. For a
quick check, add `--runs 1 --ablation none`; in CI, add `--trust-plugin`,
`--json results.json`, a pinned `--model` and `--max-cost-usd`.
<!-- CI scope probe: this line never lands. -->
