# LICENSE-NOTICE — vendored third-party skill

- **Skill**: `design-tokens`
- **Source**: https://github.com/ilikescience/design-tokens-skill
- **Pinned commit**: `787f9724ecc171715d132cdde2215a7ab88d8b0d` (branch `main`, last upstream commit 2026-06-17; fetched 2026-07-05)
- **Upstream author**: Matt Ström-Awn
- **License**: MIT (full text below)

## Supply-chain audit (Kimen constitution Art. X)

Reviewed in full on 2026-07-05 before vendoring (SKILL.md + reference/format.md,
color.md, resolver.md, tools.md + examples/use-cases.md). Markdown-only DTCG
guidance with example `jq`/build snippets. No remote code fetch/execution, no
credential access, no telemetry/egress, no destructive commands, no hidden
instructions detected. (Upstream also ships `fixtures/` and `evaluations/`;
those are not vendored — see omissions.)

## Local modifications (significant — this skill was ADAPTED, not just vendored)

1. **SKILL.md**: rewrote the theming/tooling framing from Terrazzo to
   **Style Dictionary 5**; added a top "Kimen adaptation" blockquote encoding
   Kimen conventions (`ki` prefix, primitive → semantic layers, `css/variables`
   format with `outputReferences: true`, source/config/output paths under
   `packages/tokens/`, tokens-only rule Art. VI, WCAG 2.2 AA Art. V). Reworked
   the "Getting Started" and workflow sections around the Kimen pipeline and the
   repo's actual hex-string / rem-string token style, noting the spec-preferred
   structured form as the long-term target.
2. **reference/tools.md**: **replaced the entire Terrazzo section** with a
   "Style Dictionary 5 (Kimen build tool)" section — the exact Kimen
   `style-dictionary.config.mjs`, the `outputReferences`/prefix explanation, the
   emitted `dist/css/tokens.css`, multi-file/theme strategies (Style Dictionary
   has no resolver support), and Style-Dictionary-specific troubleshooting.
   Kept the `jq`, JSONata, and Figma-export subsections faithful (adjusted one
   Figma restructure example to nest under `ki`).
3. **reference/resolver.md**: added a top note that Style Dictionary does not
   consume resolver files; otherwise faithful to the DTCG spec.
4. **examples/use-cases.md**: added a top note pointing builds at Style
   Dictionary and a Kimen build-equivalent note in the theming example;
   token shapes kept faithful.
5. **reference/format.md**, **reference/color.md**: vendored faithfully
   (spec documentation, tool-agnostic).

## Omitted from upstream (intentionally)

- `fixtures/` (example token files) and `evaluations/` (skill self-tests) — not
  needed for use in Kimen and would duplicate/conflict with the real
  `packages/tokens/tokens/*`. The skill's SKILL.md no longer references them.
- Upstream `README.md` (install instructions for the skills marketplace).

## Upstream MIT license text

```
MIT License

Copyright (c) 2026 Matt Ström-Awn

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
