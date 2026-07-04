# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `mcp-builder`
- **Source**: https://github.com/anthropics/skills — path `skills/mcp-builder/`
- **Pinned commit**: `9d2f1ae187231d8199c64b5b762e1bdf2244733d` (branch `main`, last upstream commit 2026-07-01; fetched 2026-07-05)
- **Upstream author**: Anthropic, PBC
- **License**: Apache-2.0 (matches the Kimen repo license; excerpt below)

## Supply-chain audit (Kimen constitution Art. X / XI)

Reviewed in full on 2026-07-05 before vendoring (SKILL.md + all four
`reference/*.md`). Markdown-only guidance for building MCP servers. One item
flagged and handled:

- The upstream skill bundles an executable evaluation harness
  (`scripts/evaluation.py`, `scripts/requirements.txt`) that imports the
  `anthropic` SDK and runs against the Anthropic API using `ANTHROPIC_API_KEY`.
  Per the audit rule "do not vendor bundled executable scripts unless trivially
  auditable", **`scripts/` was NOT vendored**. The evaluation guidance in
  `reference/evaluation.md` is retained (with a note) so evals authored here
  still match the upstream harness, which must be run from the upstream repo in
  a credential-free sandbox.

No remote code fetch/execution beyond documented `npm install` / WebFetch of
SDK READMEs, no credential access, no telemetry, no destructive commands, no
hidden instructions detected in the vendored markdown.

## Local modifications

- Added a "Kimen note (local adaptation)" blockquote to `SKILL.md`: prefer the
  TypeScript path, use pnpm, apply the supply-chain gate, and note that the eval
  scripts are omitted.
- Added "Kimen note" blockquotes to `reference/evaluation.md`,
  `reference/node_mcp_server.md`, and `reference/python_mcp_server.md` (pnpm +
  pinning; scripts omitted).
- Changed the SKILL.md frontmatter `license:` pointer from `LICENSE.txt` to this
  `LICENSE-NOTICE.md`.

## Omitted from upstream (intentionally)

- `scripts/evaluation.py` and `scripts/requirements.txt` (executable harness,
  see audit note above).
- The standalone `LICENSE.txt` (its Apache-2.0 content is excerpted below and is
  identical to the Kimen root `LICENSE`).

## Upstream Apache-2.0 notice (excerpt)

```
Copyright 2026 Anthropic, PBC.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

Full Apache-2.0 text is available at the Kimen repo root `LICENSE`.
