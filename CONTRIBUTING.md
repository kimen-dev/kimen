# Contributing to Kimen

Thanks for your interest. Kimen is a one-person, AI-First operation with
strict automated gates; external contributions are welcome and pass exactly
the same bar as agent-written code.

## The short version

1. **Read `AGENTS.md` and the constitution digest**
   (`.specify/memory/constitution.md`). They govern every contribution. PRs
   that conflict with them are declined with a pointer to the relevant
   article.
2. **Specs before code** (Art. II): new behavior needs an approved Gherkin
   `.feature` first. Open an issue or draft spec before writing code; typos,
   dependency bumps, mechanical refactors and docs are exempt.
3. **Gates define done** (Art. III/X): your PR must exit 0 on the full
   deterministic suite (format, lint, typecheck, boundaries, tests in a real
   browser, mutation score on core logic, axe, budgets). Style is formatted,
   not reviewed; no PR comment will ever be about formatting.
4. **DCO sign-off, no CLA**: every commit is signed off
   (`git commit -s`), certifying the
   [Developer Certificate of Origin](https://developercertificate.org/).
   Contributions are accepted under Apache-2.0 (see LICENSE).
5. **Security issues**: never as public issues; see SECURITY.md.

## Practical notes

- Components are scaffolded with Nx generators, never by hand.
- Every public API member carries complete JSDoc (description, default,
  when-to-use/when-NOT-to-use); an undocumented member fails the build.
- Generated artifacts (manifests, catalog, llms.txt, wrappers) are regenerated,
  never hand-edited.
- Review is asynchronous and batched; the founder is the only human gate.
  Expect honest, article-referenced feedback.
