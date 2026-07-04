# Security Policy

## Reporting a vulnerability

Report vulnerabilities privately to **marcelagotta@gmail.com** (interim
channel until security@kimen.dev is live) or via GitHub private vulnerability
reporting on this repository. Please do not open public issues for security
reports.

What to expect (per the Kimen constitution, Emergency and Incident Procedure):

- **Acknowledgment within 72 hours.**
- **Coordinated disclosure**: the report stays embargoed until a patch ships.
- **CVE requested** when applicable.
- Broken releases roll forward: the bad version is deprecated on npm (never
  silently unpublished), a patched release is published, and a post-mortem is
  written within a week.
- Every incident produces at least one new deterministic gate or test that
  would have caught it.

## Scope

Of particular interest, per the constitution's audited security surfaces
(Art. VIII):

1. **The guardrail boundary**: any way to make the renderer render components
   outside the catalog, dispatch undeclared actions, accept unknown props, or
   reach a code-execution path from spec data.
2. **The supply chain**: lockfile, provenance, or publishing integrity issues.

## Supported versions

Only the **latest MAJOR** receives security patches (Art. IX). Older MAJORs
get a documented migration path.
