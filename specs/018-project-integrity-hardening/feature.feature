Feature: Project integrity is enforced from approval to publication
  Project policy is machine-enforced at every boundary so approved contracts,
  merge evidence, releases, package guidance and public claims describe
  exactly what Kimen can prove.

  Rule: Approved behavior remains one synchronized contract

    # S1
    Scenario: Changing either approved contract file invalidates approval
      Given the specification and extracted feature match and founder approval covers both hashes
      When either approved contract file changes
      Then the recorded approval becomes invalid
      And planning and implementation remain blocked until the matching pair is reapproved

  Rule: Main accepts only fully verified revisions

    # S2
    Scenario Outline: Missing merge evidence keeps the current revision out of main
      Given a change targets main and <evidence> does not cover its current revision
      When the founder attempts to merge the change
      Then merge remains unavailable
      And the repository identifies <requirement> as missing

      Examples:
        | evidence                                      | requirement             |
        | the required deterministic gates are failing  | green required checks   |
        | the clean-context review covers an older hash | current-revision review |

    # S3
    Scenario Outline: Changed core code respects the mutation threshold
      Given changed core code achieves a mutation score of <score> percent
      When the deterministic gates evaluate the change
      Then the mutation gate reports <decision>

      Examples:
        | score | decision |
        | 69    | blocked  |
        | 70    | passed   |

  Rule: Unattended execution remains contained and recoverable

    # S4
    Scenario: The unattended loop cannot read durable or publishing credentials
      Given an unattended loop has a dedicated short-lived model identity
      When the loop installs dependencies and executes its task
      Then no production, publishing or long-lived credential is readable
      And HTTPS and DNS traffic outside the declared destinations is denied

    # S5
    Scenario: Every unsuccessful unattended attempt leaves a red snapshot
      Given an unattended attempt changed its clone and reached no green gate verdict
      When the attempt terminates after an agent interruption or a gate failure
      Then the loop returns a red non-zero verdict
      And a fetchable snapshot records the changes and available exit evidence

  Rule: Release authority follows verified release state

    # S6
    Scenario: Failure in any supported browser blocks prerelease
      Given browser checks pass in Chromium and Firefox but fail in WebKit
      When prerelease validation evaluates the candidate
      Then the candidate is blocked from publication
      And the report records outcomes for Chromium, Firefox and WebKit

    # S7
    Scenario: Release phases receive only the authority they require
      Given a release candidate is awaiting validation
      When the release workflow evaluates the candidate
      Then validation has read-only source access and no publishing identity
      And publication accepts only the immutable artifact that passed validation
      And the publisher receives only short-lived OIDC authority scoped to the release

  Rule: Shipped machine contracts work for external consumers

    # S8
    Scenario: Every language-model example works from public package exports
      Given a clean consumer installs packed @kimen/elements and @kimen/tokens packages
      When the consumer follows every installation import and theming example in llms.txt
      Then the consumer build succeeds using only exported package paths
      And ki-button renders with the documented theme

    # S9
    Scenario: The packaged manifest completely describes a public component
      Given the packed elements package contains ki-dialog and its public contract
      When a consumer inspects the shipped custom-elements manifest
      Then every public facet and CSS custom property has a non-empty description
      And every referenced module and source path resolves inside the package

    # S10
    Scenario Outline: Public API compatibility determines the release class
      Given a candidate contains <change> relative to the previous public package
      When the compatibility gate evaluates the candidate
      Then it reports <release-class>
      And an undeclared breaking change is blocked

      Examples:
        | change                         | release-class |
        | a new optional public property | minor         |
        | a removed public property      | major         |

  Rule: Closed tokens and scaffolding are complete by construction

    # S11
    Scenario Outline: Invalid visual values fail closed-token validation
      Given a component stylesheet contains <violation>
      When closed-token validation evaluates the stylesheet
      Then validation fails and reports <offending-value>

      Examples:
        | violation                                               | offending-value           |
        | a reference to an undeclared token                       | the undeclared token name |
        | the literal transition duration 120ms                    | 120ms                     |
        | a primitive token consumed directly by component styles | the primitive token name  |

    # S12
    Scenario: A generated component is discovered by every required surface
      Given an approved component feature is ready for implementation
      When a contributor scaffolds ki-avatar
      Then source tests exports budgets token layers and machine surfaces are registered
      And clean build packaging and browser runs discover them without hand edits

  Rule: Public status never outruns verified capability

    # S13
    Scenario: Unimplemented GenUI capabilities are presented as planned
      Given the neutral catalog renderer guardrails and protocol adapters lack passing evidence
      When Kimen public status surfaces are produced
      Then the available product is described as a machine-readable Web Components foundation
      And absent capabilities are labelled planned rather than available
      And quality claims appear only when their corresponding evidence is green
