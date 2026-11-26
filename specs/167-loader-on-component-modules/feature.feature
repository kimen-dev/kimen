Feature: The lazy loader registers each component from its own module
  `@kimen/elements/loader` registers a ki-* component the first time a page
  shows it, from the module its `@kimen/elements/<tag>` subpath publishes,
  and downloads nothing for the components the page never shows. It keeps
  every export it had. What changes is when a tag becomes defined: on first
  use, not when the loader starts. The loader searches the page and the
  shadow roots of the Kimen components on it; a shadow root the application
  owns is searched once the application hands it to the loader.

  Rule: The loader defines a component the first time the page shows it

    # S1
    Scenario: A component already on the page renders once the loader starts
      Given a page that shows a ki-button labeled "Continue"
      When the application starts the loader
      Then the ki-button renders a button named "Continue"

    # S2
    Scenario: A component added later renders when it reaches the page
      Given a page whose application started the loader
      When the application appends a ki-card to the page
      Then the ki-card renders

    # S3
    Scenario Outline: A bundled page downloads only the components it shows
      Given an application that starts the loader, bundled with <bundler>
      And a page that shows one ki-button
      When the page loads
      Then the ki-button renders from its own chunk
      And the page requests no chunk of a component it does not show

      Examples:
        | bundler |
        | esbuild |
        | Vite    |

    # S4
    Scenario: A component the page has not shown yet is not defined
      Given a page whose application started the loader and shows no ki-dialog
      When the application asks whether ki-dialog is defined
      Then ki-dialog is not defined

    # S5
    Scenario: Waiting for a component's definition ends when the page first shows it
      Given a page whose application started the loader and waits for ki-dialog to be defined
      When the application appends a ki-dialog to the page
      Then the wait ends
      And the ki-dialog opens when the application calls its show method

    # S6
    Scenario: An excluded component stays undefined
      Given a page whose application started the loader without ki-card
      When the application appends a ki-card to the page
      Then ki-card stays undefined

  Rule: The loader searches the shadow roots of Kimen components and of the roots it is handed

    # S7
    Scenario: A component a Kimen component draws inside its own shadow root renders
      Given a page whose application started the loader and shows no ki-code-block
      When the application appends a ki-markdown whose text holds a fenced code block
      Then the markdown shows that code in a ki-code-block that renders

    # S8
    Scenario: A component inside an application's own shadow root is not found by default
      Given a page whose application started the loader and shows no other ki-button
      When the application renders a ki-button inside the shadow root of its own element
      Then ki-button stays undefined

    # S9
    Scenario: A shadow root handed to the loader has its components defined
      Given a page whose application started the loader and handed it the shadow root of its own element
      When the application renders a ki-button inside that shadow root
      Then the ki-button renders

  Rule: The loader's elements are the per-component elements

    # S10
    Scenario: A form control from the loader reports its validity without waiting
      Given a page whose application started the loader and shows a required, empty ki-input
      When the application checks the input's validity
      Then the check reports the input invalid at once

    # S11
    Scenario: The deprecated root export is the component's own class
      Given an application that imports KiButton from the package root
      When it compares that class with KiButton from @kimen/elements/ki-button
      Then the two are the same class
