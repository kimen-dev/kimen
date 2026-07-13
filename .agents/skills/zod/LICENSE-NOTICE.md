# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `zod`
- **Source**: https://github.com/anivar/zod-skill
- **Pinned commit**: `6c0d75bd9773d5c83c1af0e5063b9aa72d87faf1` (branch `main`, last upstream commit 2026-02-24; fetched 2026-07-05)
- **Upstream author**: Anivar Aravind (https://anivar.net)
- **License**: MIT (full text below)

## Supply-chain audit (Kimen constitution Art. X)

Reviewed on 2026-07-05 before vendoring (SKILL.md + AGENTS.md compiled guide;
spot-checked the rule/reference structure via the upstream README and the
compiled AGENTS.md, which reproduces every rule). Markdown-only Zod v4 guidance.
No remote code fetch/execution, no credential access, no telemetry/egress, no
destructive commands, no hidden instructions detected. The frontmatter fields
`user-invocable: false` / `agentic: false` are upstream metadata hints and are
inert.

## Local modifications

- **SKILL.md**: added a "Kimen note (local adaptation)" blockquote tying the
  skill to Kimen's Zod-based catalog and boundary parsing (Art. VIII / IV), and
  a note that the granular `rules/` + `references/` trees were consolidated into
  `AGENTS.md`. Repointed the "How to Use" / "Full Compiled Document" sections at
  the bundled `AGENTS.md` instead of the per-rule paths.
- **AGENTS.md**: added a top Kimen note; added one inline Kimen note on the
  `arch-boundary-parsing` rule (adapter payloads / catalog input as the
  boundary). Content otherwise faithful to upstream.

## Omitted from upstream (intentionally)

- The per-rule `rules/*.md` files and per-topic `references/*.md` deep dives.
  Their content is fully contained in the vendored `AGENTS.md` compiled guide,
  which the upstream repo generates from them. Consolidating avoids ~40 tiny
  files while preserving all rule text; SKILL.md points readers at `AGENTS.md`.
- Upstream `README.md` (marketplace install instructions and ecosystem
  cross-links).

## Upstream MIT license text

```
MIT License

Copyright (c) 2026 Anivar Aravind

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
