# Supply Chain Risk Audit — Results

> **Note (Kimen vendoring):** this `results-template.md` is a faithful
> RECONSTRUCTION of the section structure the upstream `SKILL.md` requires
> (Executive Summary, High-Risk Dependencies, Counts by Risk Factor,
> Recommendations). The upstream template file could not be fetched at the
> pinned commit via raw.githubusercontent (404 on every guessed path). If the
> real upstream template differs in column wording, prefer the upstream file
> — see LICENSE-NOTICE.md. Do not add sections beyond those below.

## Executive Summary

_Overall supply-chain security posture of the audited project. Summarize how
many direct dependencies were reviewed, how many were flagged, and the dominant
risk factors._

## High-Risk Dependencies

| Dependency | Repository | Risk Factor(s) | Evidence (stars / last release / issues / CVEs) | Suggested Alternative |
|------------|-----------|----------------|-------------------------------------------------|-----------------------|
| _name_ | _github url_ | _e.g. single maintainer; unmaintained_ | _accurate figures via `gh`; ~ notation allowed_ | _more popular / better-maintained drop-in, with short justification_ |

_Only list dependencies with at least one risk factor. The absence of a
dependency from this table indicates it is low- or no-risk._

## Counts by Risk Factor

| Risk Factor | Count |
|-------------|-------|
| Single maintainer / small team | _n_ |
| Unmaintained / deprecated / archived | _n_ |
| Low popularity | _n_ |
| High-risk features (FFI / deserialization / code exec) | _n_ |
| Past high/critical CVEs | _n_ |
| No security contact | _n_ |

## Recommendations

_Prioritized remediation guidance: which dependencies to replace, upgrade,
vendor-and-pin, or monitor. Reference the Suggested Alternatives above._
