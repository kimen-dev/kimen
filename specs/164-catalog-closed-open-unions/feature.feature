Feature: The built-in catalog accepts only the documented values of its open unions
  Three component props accept any string in markup: ki-alert tone, ki-toast
  tone and ki-toaster placement. A spec written by a model may use only their
  documented values, so an invented value is rejected and repaired instead of
  rendering as a neutral, unannounced message.

  Rule: A spec checked against the built-in catalog uses only documented values

    # S1
    Scenario: A spec whose alert has an undocumented tone is rejected with the allowed tones
      Given a spec whose root is a ki-alert with tone "error"
      When the spec is validated against the built-in catalog
      Then the spec is rejected at "root.props.tone"
      And the issue lists the tones "danger", "info", "neutral", "success" and "warning"

    # S2
    Scenario Outline: Every documented value of an open union is accepted
      Given a spec whose root is a <component> with <prop> "<value>"
      When the spec is validated against the built-in catalog
      Then the spec is accepted

      Examples:
        | component  | prop      | value         |
        | ki-alert   | tone      | danger        |
        | ki-alert   | tone      | neutral       |
        | ki-toast   | tone      | warning       |
        | ki-toast   | tone      | success       |
        | ki-toaster | placement | top-center    |
        | ki-toaster | placement | bottom-end    |

    # S3
    Scenario: The repair prompt for an undocumented toast tone names the allowed tones
      Given a validation report that rejects a ki-toast whose tone is "critical"
      When the repair prompt is built from that report
      Then the prompt names the toast's tone and lists its five allowed tones

    # S4
    Scenario: The spec JSON Schema offers a model only the documented placements
      Given the spec JSON Schema generated from the built-in catalog
      When a schema validator checks a ki-toaster whose placement is "middle"
      Then the schema rejects the placement and lists "bottom-center", "bottom-end", "top-center" and "top-end"

  Rule: Markup and consumer catalogs keep their open values

    # S5
    Scenario: Hand-written markup with an unknown alert tone still renders as a neutral status
      Given a page whose markup holds a ki-alert with tone "error" and the message "Save failed"
      When the page renders the alert
      Then the alert shows the neutral appearance and exposes role status

    # S6
    Scenario: A consumer definition may still declare an open string with documented values
      Given a consumer definition whose acme-kpi-card tone is an open string documenting "up" and "down"
      When a spec giving that card the tone "flat" is validated against the extended catalog
      Then the spec is accepted
