# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `nx-generate`
- **Source**: https://github.com/nrwl/nx-ai-agents-config — path `skills/nx-generate/`
- **Pinned commit**: `9609810013040356b2d93c0688a50d9078cdc35a` (branch `main`, last upstream commit 2026-05-19; fetched 2026-07-05)
- **Upstream author**: Narwhal Technologies Inc. (Nx team)
- **License**: MIT (full text below)

## Supply-chain audit (Kimen constitution Art. X)

Reviewed in full on 2026-07-05 before vendoring. Markdown-only generator
workflow guidance (discover → dry-run → generate → verify). No remote code
fetch/execution, no credential access, no telemetry/egress, no destructive
commands, no hidden instructions detected. The frontmatter fields
`subagent: general-purpose` and `context: fork` are upstream metadata hints
for agent runtimes and are inert otherwise.

## Local modifications

- Added a "Kimen note (local adaptation)" blockquote after the title: pnpm
  invocation, `ki-*` components scaffolded via generators only (Art. I /
  repo conventions), and a note that the `nx_docs` MCP tool referenced in the
  upstream description is not installed in Kimen.

## Omitted from upstream (intentionally)

- The `nx configure-ai-agents` installer flow, `.mcp.json` MCP-server
  registration, CLAUDE.md/AGENTS.md modification steps, `agents/`, `scripts/`,
  and the Nx Cloud `monitor-ci` skill. Only the skill markdown is vendored.

## Upstream MIT license text

```
(The MIT License)

Copyright (c) 2017-2026 Narwhal Technologies Inc.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
