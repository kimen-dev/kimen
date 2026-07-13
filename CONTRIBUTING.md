# Contributing to Kimen

Thanks for your interest. Kimen is a one-person, AI-First operation with a
small high-signal quality core; external contributions are welcome and pass
the same bar as agent-written code.

## The short version

1. **Read `AGENTS.md` and the constitution digest**
   (`.specify/memory/constitution.md`). They govern every contribution. PRs
   that conflict with them are declined with a pointer to the relevant
   article.
2. **Behavior contracts where they pay** (Art. II): public component
   behavior/API, new interaction patterns and security boundaries need concise
   Gherkin first. Bug fixes need a failing regression test; refactors, tooling,
   dependencies and docs do not need a spec.
3. **One fast quality result defines ordinary PR readiness** (Art. III/X):
   format, lint, strict types, boundaries, build, tests in Chromium, axe and
   relevant API/token/budget integrity. Mutation runs daily; packaging and the
   three-browser matrix run before release.
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
- The founder is the only merge gate. Independent review is optional and
  advisory for changes whose risk justifies it.
