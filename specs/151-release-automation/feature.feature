Feature: Kimen prepares and tags releases through a pull request
  The protected main branch and the immutable npm publisher retain their existing gates.

  # S1
  Scenario: A push without release-worthy changes needs no release pull request
    Given main has only maintenance commits since the last release
    When release preparation runs
    Then it succeeds without writing a branch or pull request

  # S2
  Scenario: Release preparation opens or updates one pull request
    Given main has a feature commit after v0.1.0
    When release preparation runs
    Then release/next proposes v0.2.0 with a dated changelog entry
    And there is exactly one open release pull request titled "chore(release): v0.2.0"

  # S3
  Scenario: Merging the release pull request tags its merge commit
    Given the release pull request for v0.2.0 declares that version in both packages
    When the release pull request merges into main
    Then the annotated tag v0.2.0 points to the merge commit
    And the GitHub Release contains the changelog entry for 0.2.0

  # S4
  Scenario: Missing GitHub App credentials prevent release writes
    Given a release operation needs the dedicated GitHub App
    When the operation runs without either required secret
    Then the operation fails with a missing credentials message
    And it makes no repository write

  # S5
  Scenario: An existing release tag keeps its original target
    Given the tag v0.2.0 already exists
    When release tagging runs for v0.2.0
    Then it preserves the existing tag and its target

  # S6
  Scenario: A release pull request versions only elements and tokens
    Given the workspace includes private packages outside the publication scope
    When release preparation proposes a version
    Then only @kimen/elements and @kimen/tokens receive that version and become publishable
    And neither published package has a workspace protocol in a consumer dependency
