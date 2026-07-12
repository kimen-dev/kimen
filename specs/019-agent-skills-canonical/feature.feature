Feature: Repository skills have one vendor-neutral source of truth
  Every supported coding agent discovers the same versioned skills while
  vendor compatibility remains available without duplicated content.

  Rule: Skills are discoverable without vendor knowledge

    # S1
    Scenario: A generic agent discovers every repository skill canonically
      Given a fresh clone contains the versioned repository skill catalog
      When a generic coding agent discovers repository-owned skills
      Then every skill is available from the vendor-neutral agent catalog
      And no vendor-specific directory is required for discovery

    # S2
    Scenario: Claude discovers the canonical skill catalog through its conventional path
      Given a fresh clone contains the canonical repository skill catalog
      When Claude discovers repository-owned skills through its conventional path
      Then Claude sees the same skill names and content as a generic agent
      And no second writable skill copy exists

    # S3
    Scenario: One canonical edit reaches every supported agent
      Given a repository skill is available to generic agents and Claude
      When a maintainer updates that skill in the canonical catalog
      Then both discovery paths expose the updated bytes
      And no vendor-specific copy requires an edit

  Rule: Migration preserves validated repository knowledge

    # S4
    Scenario: A copied compatibility catalog fails the single-source invariant
      Given the vendor compatibility path is an independent directory
      When deterministic agent-surface validation evaluates the repository
      Then validation fails before merge
      And the report identifies the compatibility path as a duplicate source

    # S5
    Scenario: Migration accounts for every existing skill artifact
      Given the existing catalogs contain shared unique and conflicting skill files
      When the catalogs are migrated to one canonical source
      Then every skill helper reference asset and license is accounted for
      And each conflict retains the currently validated committed behavior unless explicitly approved otherwise

  Rule: The compatibility boundary fails closed

    # S6
    Scenario Outline: An unsafe compatibility target is rejected
      Given the vendor compatibility path is <condition>
      When deterministic agent-surface validation evaluates the repository
      Then validation fails and reports <reason>

      Examples:
        | condition                              | reason                    |
        | missing                                | missing compatibility     |
        | a broken link                          | unresolved target          |
        | a link outside the repository          | escaping target            |
        | part of a link cycle                   | cyclic target              |
        | linked to a non-canonical skill folder | incorrect canonical target |

    # S7
    Scenario: A fresh clone exposes both supported discovery paths
      Given no user-level skill installation exists
      When a contributor clones the repository on a supported environment
      Then generic agents and Claude resolve every versioned repository skill
      And neither discovery path is broken

  Rule: Future tooling respects the canonical catalog

    # S8
    Scenario: Repository tooling writes new skills only to the canonical catalog
      Given repository tooling is asked to add a repository-owned skill
      When the tool persists the new skill
      Then the skill is versioned in the vendor-neutral catalog
      And Claude discovers it without a vendor-specific copy

    # S9
    Scenario: Repository guidance names the canonical and compatibility roles
      Given an agent reads the repository's generated operating guidance
      When the agent looks for the skill source of truth
      Then the vendor-neutral catalog is identified as canonical
      And the Claude path is identified only as a compatibility view
