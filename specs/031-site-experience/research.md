# Design: publishing the site on Cloudflare Pages at kimen.dev

Date: 2026-08-11. Status: approved by the founder, pending implementation
plan. Scope: where the public site artifact is hosted, under which domain,
and how it is measured. Sources: the OnMars platform notes in the founder's
vault (`plataforma-estudio`, `despliegue-apps-plataforma`,
`costes-y-servicios`, all reviewed 2026-08-11), the observed state of this
repository (`.github/workflows/docs.yml`, `scripts/build-site.sh`,
`site/docs/astro.config.mjs`, `scripts/gates/check-workflows.mjs`), and
Cloudflare's official pricing documentation for Pages.

## D1 — Cloudflare Pages hosts the site; the VPS does not

**Decision**: the assembled `site-dist/` artifact is published to a
Cloudflare Pages project by direct upload from CI, served at `https://kimen.dev`.
The studio's VPS (`marsvps` + Coolify) is not involved.

**Rationale**: the site is a static artifact — 15 MB, no backend, no
database, no secrets at rest. The platform note's own rule is "nothing is
migrated for the sake of migrating: it migrates when it saves money or
removes a risk". Hosting on the VPS saves nothing (both are 0 €) and adds
two risks this repository cannot absorb cheaply:

1. **Production credentials in a public repository.** The fleet's CD pattern
   puts a Coolify token and a Tailscale OAuth client into repository secrets.
   Sapphik, KitGestor and arcadev are private; Kimen is public and accepts
   external contributions. That OAuth client can mint `tag:ci` node keys, so
   a leak would not compromise a documentation site — it would compromise the
   studio's only administration plane.
2. **A Tailscale tunnel under blocked egress.** `check-workflows.mjs`
   requires `egress-policy: block` with a concrete allowlist on every job.
   Bringing up a tailnet node inside that regime is unproven here and adds a
   third-party action to a supply chain that pins everything by SHA.

Cloudflare Pages removes both: the deploy target is a single HTTPS endpoint
(`api.cloudflare.com`), and the only credential is an API token whose blast
radius is "can redeploy the docs site".

**Cost**: 0 €, structurally. Cloudflare's documentation states that static
asset requests are free and unlimited on both plans; only Pages Functions
consume Workers quota, and this site has none. Cloudflare-side build minutes
do not apply either, because CI uploads a prebuilt artifact. The only step
that could ever cost money is Workers Paid (5 $/month per account) if the
site one day needs server-side logic — a trigger, recorded below.

**Alternatives rejected**:

- **Coolify on `marsvps`** (the fleet standard): consistent with Sapphik and
  KitGestor, but see the two risks above; it also adds a container image, a
  GHCR package, a redeploy mechanism and a tenant on a box sized for the app
  fleet, all to serve static files that Cloudflare already caches.
- **GitHub Pages with a custom domain** (the minimal change): zero secrets,
  but no per-PR previews, a ~100 GB/month soft bandwidth limit, and no way to
  set response headers at origin — security headers would have to live as
  Cloudflare Transform Rules clicked into a dashboard instead of as reviewed
  files in the repository.
- **Vercel**: its Hobby plan forbids commercial use (the verified finding that
  moved Sapphik and KitGestor off it), its build pipeline would assemble the
  artifact outside the gate suite, and the studio is actively closing that
  account down.

## D2 — Route base moves from `/kimen/` to `/`

**Decision**: the artifact is served from the domain root. `site/docs`
builds with `site: 'https://kimen.dev'` and `base: '/docs'`; the landing is
`/`, the playground `/playground/`, Storybook `/storybook/`.

**Consequence**: 20 references to `https://kimen-dev.github.io/kimen/` across
14 files, and the `/kimen/` base in the site's own sources, change together.
Generated artifacts (`llms.txt` at the root and in `packages/elements`,
`custom-elements.json`) are regenerated from their sources — never
hand-edited (Art. I). The source of the preamble is
`packages/elements/scripts/llms-preamble.txt`.

## D3 — The behavior contract changes, so it goes through the Art. II gate

**Decision**: `specs/031-site-experience/` is amended in place — the same
S-IDs, new routes — rather than opening a new feature. Publishing is part of
this feature, not a separate one.

**Constraint discovered**: `check-spec-contracts.sh` requires the canonical
Gherkin block inside `spec.md` and the committed `feature.feature` to be
**byte-identical**. Both files change in the same commit, or the gate fails.
`check-traceability.sh` requires every S-ID to stay referenced by a test
carrying the `// @spec:031-site-experience` marker.

Two files assert the old URL and must move with the contract:
`packages/elements/browser-tests/site-experience.browser.spec.ts` (the
`PAGES_BASE_URL` constant and the canonical destinations) and
`scripts/tests/site-contract.test.mjs`. Tests change first: they are the
reproduction of the change.

## D4 — Publication: direct upload from the existing docs workflow

**Decision**: `docs.yml` keeps its `build` job unchanged (it already runs
`nx run-many -t build`, builds Storybook, builds the docs site and calls
`scripts/build-site.sh`). Its `deploy` job stops uploading a Pages artifact
and instead uploads `site-dist/` to the Cloudflare Pages project with
`cloudflare/wrangler-action`, pinned by full commit SHA like every other
action in this repository.

**Permissions become smaller, not larger.** The GitHub Pages deployment
needed `pages: write` and `id-token: write`; the Cloudflare deployment needs
neither, so the job declares `permissions: {}`. Both entries
(`docs.yml:deploy:pages`, `docs.yml:deploy:id-token`) are removed from
`ALLOWED_SCOPED_WRITES` in `scripts/gates/check-workflows.mjs`, and the
gate's own tests are updated to match. No new scoped write is introduced
anywhere.

**Egress allowlist** for the deploy job: `api.cloudflare.com:443` plus the
npm registry needed to materialize the action's dependencies. The build job's
allowlist is untouched.

**Alternative considered**: `pnpm dlx wrangler@<version>` instead of the
action, which would avoid a new third-party action. Rejected because a
version specifier is weaker than a 40-character SHA, and the workflow gate
exists precisely to demand the latter. Adding wrangler as a devDependency was
also rejected: it is a large dependency tree entering a workspace whose
policy (`minimumReleaseAge` 7d, `no-downgrade`, `blockExoticSubdeps`) makes
every new package a recurring review cost, for a tool only CI ever runs.

**Amended 2026-08-11.** The first implementation pinned the action by SHA and
then passed `wranglerVersion: '4'` — a floating range — so the tool that holds
the API token and performs the deploy was resolved fresh from npm on every run.
That is exactly the weakness this decision rejected, reintroduced one line
below the pin: the strongest link was protecting the weakest one. It ships as
an exact version, chosen as the newest wrangler 4.x that has cleared the same
7-day `minimumReleaseAge` this workspace applies to every other package, and
bumped deliberately in a reviewed commit. Wrangler's telemetry
(`sparrow.cloudflare.com`) is switched off rather than allowlisted, because an
egress annotation that fires on every run teaches reviewers to ignore
harden-runner.

## D5 — Headers and redirects live in the repository

**Decision**: Cloudflare Pages reads `_headers` and `_redirects` from the
artifact root. Both files are authored under `site/` and copied by
`scripts/build-site.sh`, so response headers are reviewed in pull requests
and covered by the site contract test, instead of being dashboard state.

Initial content: HSTS, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Content-Security-Policy`
introduced in report-only mode first (Starlight and the landing both ship
inline scripts, so an enforcing policy is tuned, not guessed), long immutable
caching for content-addressed assets and short, revalidating caching for
everything whose filename is stable.

**Amended 2026-08-11, after the whole-branch review.** Three things in the
paragraph above were wrong as first written, and the shipped `site/_headers`
diverges from them deliberately.

**Framing.** The first draft paired `X-Frame-Options: DENY` with
`frame-ancestors 'none'`. DENY blocks *same-origin* framing too, and the
Storybook workshop published at `/storybook/` renders every story and every
docs preview inside a same-origin `<iframe src="./iframe.html?id=…">`. Shipping
it would have served the manager chrome with permanently blank canvases. The
artifact ships `SAMEORIGIN` and `frame-ancestors 'self'`: a policy the site
itself breaks is not a security control, it is an outage.

**Caching.** The first draft used one `/assets/*` rule carrying
`max-age=31536000, immutable`. Cloudflare matches `*` greedily across `/`, so
that single rule also covered `/assets/tokens/tokens.css` and
`/assets/elements/kimen/kimen.esm.js` — filenames every deploy overwrites in
place. `immutable` tells a browser not to revalidate even on an explicit
reload, and no later deploy can recall it, so a visitor would have kept a
year-old token bundle and element runtime with no way back. Only
content-addressed paths (`/assets/elements/kimen/p-*`, `/assets/fonts/*`,
`/docs/_astro/*`) are cached immutably; each stable filename carries its own
short `must-revalidate` rule; and `/*` sets no `Cache-Control` at all, because
Cloudflare applies every matching rule and comma-joins repeated header names.

**The report-only policy is a placeholder, and says so.** No report collector
is deployed — there is no `report-to` or `report-uri` endpoint anywhere in this
deployment — so the only signal the policy produces is a console message for
whoever happens to open devtools. It must not be promoted to an enforcing
`Content-Security-Policy` until a collector exists, the policy names it, and at
least one production deploy's worth of real reports has been reviewed.

One violation is already known and is **not** fixed by the policy as written:
Starlight's documentation search is Pagefind, which instantiates WebAssembly
from `/docs/pagefind/wasm.en.pagefind` through
`/docs/pagefind/pagefind-worker.js`. `script-src 'self'` without
`'wasm-unsafe-eval'` makes Chromium reject `WebAssembly.instantiate`, so
enforcing this policy today would break documentation search. Anyone enforcing
it resolves that first. All of the above is recorded in the comment header of
`site/_headers` itself, and asserted by `scripts/tests/site-publication.test.mjs`
so the notes cannot be deleted while the placeholder is still shipping.

## D6 — Per-PR previews, with an honest limit

**Decision**: preview deployments are enabled for pull requests raised from
branches in this repository. The preview URL is posted on the pull request.

**Limit, stated up front**: GitHub does not expose repository secrets to
workflows triggered by pull requests from forks, so external contributions
get no preview. This is correct behavior, not a defect — a fork preview would
mean handing a deploy credential to arbitrary contributors. Maintainers who
need a preview of a fork's work push the branch to the repository.

## D7 — Domain and DNS

**Decision**: `kimen.dev` (already owned, already on Cloudflare) is attached
to the Pages project as a custom domain, with `www` redirecting to the apex.
Cloudflare issues and renews the certificate; there is no HTTP-validation
sequencing problem because origin and edge are the same provider — the one
operational trap that GitHub Pages would have introduced.

## D8 — Measurement, monitoring, and the privacy page

**Decision**: Umami (already deployed at `umami.onmars.tech`) gets a website
entry for `kimen.dev`; the script tag carries `data-domains="kimen.dev"`.

**The analytics gate is a build gate, not a runtime one.** Static pages are
prerendered, so any runtime heuristic decides at the wrong moment. The tag is
emitted only when an explicit `KIMEN_ANALYTICS=1` marker is set, and that
marker is set only in the publishing workflow — never locally, never in
Storybook, never in the browser tests. This is the lesson recorded in the
platform runbook after KitGestor, and it is what keeps the test suite from
polluting production analytics.

Uptime Kuma (on `marslab`) gets monitors for the landing, `/docs/` and
`/storybook/`, alerting through the existing Slack webhook.

**Blocking prerequisite**: the site has no privacy page. Umami is cookieless,
so no consent banner is required, but the measurement still has to be
declared. A minimal privacy page ships before measurement is switched on.

**Amended 2026-08-11.** "Minimal" turned out to be the wrong target. The
declaration is verified against the running instance's own `session` table
schema — browser, operating system, device, screen size, language, country,
region, city, and no IP address column anywhere — and it names every one of
those categories, because a privacy page that under-reports what is stored
fails at the only job it has. It is linked from every measured page, including
each `/docs/*` page through a Starlight `Footer` override, since that is the
largest measured surface. Both properties are the behavior contract's S8; the
build gate above is S9. Neither existed as a scenario when this design was
approved, which is the gap the founder closed on 2026-08-11.

## D9 — The old URL keeps working

**Decision**: `kimen-dev.github.io/kimen/` is not deleted. It is left serving
a minimal redirect artifact that preserves the path and declares
`rel="canonical"` to the new location, because the old URL is already spread
through npm READMEs, docs and external links.

Mechanically it uses **no workflow at all**: the GitHub Pages source switches
from "GitHub Actions" to "deploy from a branch", pointing at a two-file
`pages-redirect` branch (`index.html` and `404.html`, the latter doing the
path-preserving redirect). A branch-served Pages site needs no job, no token
and no permission, which is what lets the two Pages-scoped writes genuinely
leave `ALLOWED_SCOPED_WRITES` as D4 states instead of merely moving to
another workflow. GitHub Pages is switched off entirely once its residual
traffic is zero.

## Failure modes

| Failure | Behavior | Response |
|---|---|---|
| Deploy fails (bad token, API down) | The previous deployment stays live; Pages deployments are immutable | Fix and rerun; nothing is half-published |
| Bad content reaches production | Previous deployment is still addressable | Roll back by promoting it, then fix forward |
| Analytics marker leaks into a non-production build | Test traffic pollutes Umami | Prevented by D8's build gate and asserted by a test |
| Artifact grows past direct-upload limits (20 000 files, 25 MiB per file) | Upload rejected | Current build: 160 files, largest 796 KB — two orders of magnitude of headroom; the site contract test records the limit |
| API token leaked | An attacker can redeploy the docs site | Token scoped to Pages edit on one account, nothing else; rotate and redeploy |

## Testing

- `scripts/tests/site-contract.test.mjs`: the artifact contains `_headers`,
  `_redirects` and the expected route layout at the new base.
- `packages/elements/browser-tests/site-experience.browser.spec.ts`: the
  031 scenarios against the new base, same S-IDs.
- A test asserting the analytics tag is absent unless the build marker is set.
  It **runs** both builders rather than grepping them: `scripts/build-site.sh`
  into a scratch `KIMEN_SITE_OUT`, and the docs site with
  `pnpm --filter @kimen/docs exec astro build --outDir <mkdtemp>`, once with
  the marker and once without. Source-level assertions stay green against a
  gate whose false branch has been changed to return the same tag array, which
  is precisely the mistake that would ship unconditional analytics.
- `scripts/tests/` coverage of `check-workflows.mjs` updated for the smaller
  `ALLOWED_SCOPED_WRITES`.
- The whole change is gated by `bash scripts/gates/gates-suite.sh`.

## Out of scope

npm publication (`release.yml`), the quality gate suite, CI runners, the
GitHub organization, the Art. XI sandbox, Neon, R2, Better Auth and Sentry.
The site has no server-side error surface worth the client bundle cost that
the platform runbook warns about.

## Triggers to revisit

Move to the VPS — the plan for which is already written in the founder's
vault — when the site needs something with a server: authenticated endpoints,
a catalog registry, rewrites Cloudflare rules cannot express, or opt-in
telemetry. Move to Workers Paid (5 $/month per account) when a Pages Function
becomes necessary.

## Doctrine this establishes for the studio

Open-source projects with no state stay where their code lives, and take the
platform's edge, identity and measurement. The VPS is for what holds data and
secrets. This is recorded back into the vault (`plataforma-estudio`) as part
of the work.
