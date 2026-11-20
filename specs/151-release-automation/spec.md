# Feature Specification: Release automation

- **Feature branch** `chore/506-release-automation`
- **Issue** #506

## Behavior contract

```gherkin
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
    Given the release pull request for v0.2.0 declares that version in all three release packages
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
  Scenario: A release pull request versions only the publication scope
    Given the workspace includes private packages outside the publication scope
    When release preparation proposes a version
    Then only @kimen/elements, @kimen/tokens and @kimen/mcp-server receive that version and become publishable
    And none of the published packages has a workspace protocol in a consumer dependency

  # S7
  Scenario: The packed MCP server serves Kimen tools over stdio
    Given a candidate includes the @kimen/mcp-server tarball for its release version
    When candidate verification installs and starts kimen-mcp in a clean consumer
    Then the initialize handshake reports server name kimen and the candidate version
    And tools/list lists the Kimen tools

  # S8
  Scenario: The packed MCP server carries its bundled dependency notices
    Given the kimen-mcp bundle includes code from third-party npm packages
    When packaging verifies the bundle against the package NOTICE
    Then each bundled third-party package has its own notice section in the tarball
```

## Acceptance notes

- Release preparation uses conventional commits since the last reachable release tag. The first release uses the package version baseline and includes the existing Unreleased notes.
- Features raise the minor version and fixes raise the patch version. Before 1.0.0, breaking changes raise the minor version. From 1.0.0 onward, breaking changes raise the major version.
- The release pull request goes through the normal required checks. The existing tag-triggered workflow validates and publishes the immutable candidate.
- The dedicated GitHub App owns branch, pull request, tag and GitHub Release writes. The automation never pushes to `main`.
