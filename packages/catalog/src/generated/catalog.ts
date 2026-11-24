// GENERATED FILE (spec 027, Art. I) — never edit by hand.
// Sources: packages/elements/generated/custom-elements.json and component.json opt-ins.
// Generator: packages/catalog/scripts/generate-catalog.mjs. The catalog-sync gate
// fails any drift between this artifact and a fresh regeneration.
export const catalogData = {
  "catalogSchemaVersion": "1.9.0",
  "components": {
    "caption": {
      "description": "The native caption of a table (`<caption>`): its title, which names the table for assistive technology.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "caption",
      "whenNotToUse": "Do not use it outside a table, after its thead or tbody, or twice in one table. Never bind an action.",
      "whenToUse": "Title every table, as its first child, so the table has an accessible name."
    },
    "div": {
      "description": "A native layout container (`<div>`) that lays its children out as a flex column or row, separated by a spacing token. It has no visual identity of its own: no background, border or padding.",
      "events": {},
      "props": {
        "align": {
          "default": "stretch",
          "description": "Cross-axis alignment of the children (flow-relative: `start` follows the writing direction).",
          "type": "enum",
          "values": [
            "start",
            "center",
            "end",
            "stretch"
          ]
        },
        "direction": {
          "default": "column",
          "description": "Main axis: `column` stacks the children in the block direction, `row` lines them up in the inline direction.",
          "type": "enum",
          "values": [
            "column",
            "row"
          ]
        },
        "gap": {
          "default": "md",
          "description": "Space between the children, one of the spacing token steps (`--ki-space-<step>`): zero, xs, sm, md, lg, xl, 3xl or 7xl.",
          "type": "enum",
          "values": [
            "zero",
            "xs",
            "sm",
            "md",
            "lg",
            "xl",
            "3xl",
            "7xl"
          ]
        },
        "justify": {
          "default": "start",
          "description": "Main-axis distribution of the children (flow-relative).",
          "type": "enum",
          "values": [
            "start",
            "center",
            "end",
            "space-between"
          ]
        },
        "wrap": {
          "default": false,
          "description": "Whether the children wrap onto further lines when they do not fit.",
          "type": "boolean"
        }
      },
      "slots": {
        "": "The children, laid out in order: text, native primitives and catalog components."
      },
      "tag": "div",
      "whenNotToUse": "Do not use it as a card, a panel with a surface, a list or a clickable area (use ki-card, ki-list or ki-button). Never bind an action.",
      "whenToUse": "Group content into a column or a row: the root of a generated panel, a toolbar of buttons, a figure next to its caption."
    },
    "em": {
      "description": "Native stress emphasis (`<em>`) inside a heading, a paragraph or another emphasis element.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "em",
      "whenNotToUse": "Do not use it for whole paragraphs, for headings or merely to italicize. Never bind an action.",
      "whenToUse": "Stress one word or phrase so a sentence reads with its intended emphasis."
    },
    "h2": {
      "description": "A native level-2 heading (`<h2>`) that takes the host page's typography.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "h2",
      "whenNotToUse": "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.",
      "whenToUse": "Title a generated panel or one of its main sections; use h3 and h4 for subsections, in order."
    },
    "h3": {
      "description": "A native level-3 heading (`<h3>`) that takes the host page's typography.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "h3",
      "whenNotToUse": "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.",
      "whenToUse": "Title a subsection under an h2, such as the heading of one card or group."
    },
    "h4": {
      "description": "A native level-4 heading (`<h4>`) that takes the host page's typography.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "h4",
      "whenNotToUse": "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.",
      "whenToUse": "Title a subsection under an h3, the deepest level a generated panel may use."
    },
    "img": {
      "description": "A native image (`<img>`) loaded from a URL that passes the URL policy. It is sent without a referrer and never grows wider than its container.",
      "events": {},
      "props": {
        "alt": {
          "allowEmpty": true,
          "description": "The text alternative: what the image shows, for people who cannot see it. Exactly \"\" marks a decorative image that assistive technology skips; white space alone is rejected.",
          "required": true,
          "type": "string"
        },
        "height": {
          "description": "Intrinsic height in CSS pixels, a hint that reserves the aspect ratio before the image loads.",
          "maximum": 4096,
          "minimum": 1,
          "type": "number"
        },
        "src": {
          "description": "The image URL: http(s) or a relative reference, and an allowed origin when the host declares origins. javascript:, data: and blob: URLs are rejected.",
          "format": "url",
          "required": true,
          "type": "string"
        },
        "width": {
          "description": "Intrinsic width in CSS pixels, a hint that reserves the aspect ratio before the image loads; the image still shrinks to fit its container.",
          "maximum": 4096,
          "minimum": 1,
          "type": "number"
        }
      },
      "slots": {},
      "tag": "img",
      "whenNotToUse": "Do not use it for avatars (ki-avatar), for icons inside controls, for text set as an image, or as a button. Never bind an action.",
      "whenToUse": "Show a chart, a photo or an illustration that carries content (describe it in alt) or decoration (alt \"\")."
    },
    "ki-accordion": {
      "description": "A set of native disclosure panels with a shared frame.",
      "events": {},
      "props": {
        "exclusive": {
          "type": "boolean",
          "description": "Whether the accordion allows at most one direct member to be open.",
          "default": false
        }
      },
      "slots": {
        "": "Direct ki-details members in reading order."
      },
      "tag": "ki-accordion",
      "whenNotToUse": "switch between views or make the panels advance a workflow.",
      "whenToUse": "group related FAQ answers, settings or expandable sections.\nEnable exclusive when readers benefit from one open section at a time."
    },
    "ki-ai-label": {
      "description": "A compact provenance mark for AI-generated content, with optional details\nand a user-initiated request to restore their original text.",
      "events": {
        "ki-revert": "Bubbles when a person requests their original text. Use this request\nto restore the original from application state."
      },
      "props": {
        "explanation": {
          "type": "string",
          "description": "Plain-text explanation of how the content was generated. Supply a\nnonblank explanation to offer disclosure. Omit it for a static mark."
        },
        "generated-at": {
          "type": "string",
          "description": "Optional generation date or time, displayed as supplied."
        },
        "generated-at-label": {
          "type": "string",
          "description": "Visible prefix for the generation date or time.",
          "default": "Generated"
        },
        "label": {
          "type": "string",
          "description": "Short visible provenance text. Localize it with the trigger name.",
          "default": "AI"
        },
        "model": {
          "type": "string",
          "description": "Optional plain-text model name shown in the explanation."
        },
        "model-label": {
          "type": "string",
          "description": "Visible prefix for the model name.",
          "default": "Model:"
        },
        "popover-label": {
          "type": "string",
          "description": "Accessible name of the non-modal explanation panel.",
          "default": "About this content"
        },
        "revert-label": {
          "type": "string",
          "description": "Visible text and accessible name of the revert action.",
          "default": "Revert to my text"
        },
        "revertible": {
          "type": "boolean",
          "description": "Offer the revert action inside the explanation. Enable it when the\napplication has the original text and handles `ki-revert`.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Size of the painted mark. Unknown values use the small metrics.",
          "default": "sm"
        },
        "trigger-label": {
          "type": "string",
          "description": "Accessible name of the disclosure button. Include the visible label.",
          "default": "AI-generated: about this content"
        }
      },
      "slots": {},
      "tag": "ki-ai-label",
      "whenNotToUse": "Use a status component for active generation or processing,\nand an application action for changes that do not restore the person's text.",
      "whenToUse": "Mark text or a value generated by AI. Include the source in\n`explanation` when people can inspect how it was generated. In a `ki-input`,\nplace the label in the `end` slot to describe the field's provenance."
    },
    "ki-alert": {
      "description": "A persistent inline status message with token-backed tone semantics.",
      "events": {
        "ki-dismiss": "Fired once after the user dismisses the alert — emitted after the alert is\nhidden and focus has been handed to the next control. `detail` is `null`\nand the event is not cancelable (the alert is already gone when it runs).\nWhen to use: record acknowledgement, or advance an application flow after a\nuser closes the alert.\nWhen NOT to use: do not treat it as a veto point, and do not expect it for\nprogrammatic `dismissed` changes — it fires only for user activation."
      },
      "props": {
        "dismiss-label": {
          "type": "string",
          "description": "Accessible name for the dismiss button. Override for localization; the\ndefault English string is the component's only built-in user-visible text.\n\nWhen to use: provide a localized action name whenever the document language\nis not English.\nWhen NOT to use: do not put the alert message here; use the default slot.",
          "default": "Dismiss"
        },
        "dismissed": {
          "type": "boolean",
          "description": "Reflected dismissed state. User dismissal sets it; applications may also\nset or clear it. While true, the host remains in the document but renders no\nalert subtree and leaves the accessibility tree. Clearing it re-shows the\nalert and creates a dynamic live-region appearance.\n\nWhen to use: persist or restore acknowledgement state from application\ndata.\nWhen NOT to use: do not listen for programmatic changes as dismissal\nevents; `ki-dismiss` is only for user activation.",
          "default": false
        },
        "dismissible": {
          "type": "boolean",
          "description": "Renders one native dismiss button when true. The button sits outside the\nlive-region boundary, so its accessible name is not announced as part of\nthe alert message. When false, the alert adds no tab stop.\n\nWhen to use: allow a person to acknowledge and clear a persistent message.\nWhen NOT to use: do not use dismissible for auto-expiring messages; those\nbelong to `ki-toast`.",
          "default": false
        },
        "heading": {
          "type": "string",
          "description": "Optional emphasized text rendered before the message inside the live\nregion. Empty strings render no heading. The heading is a `strong`\nelement, not a document heading, so it never changes page outline.\n\nWhen to use: add a short label when it helps identify the status message.\nWhen NOT to use: do not use heading for page structure; use a real heading\noutside the alert when the document needs one."
        },
        "tone": {
          "type": "string",
          "documentedValues": [
            "danger",
            "info",
            "neutral",
            "success",
            "warning"
          ],
          "description": "Semantic intent for visual styling and live-region urgency. `danger` and\n`warning` expose `role=\"alert\"`; `neutral`, `success`, `info`, absent, and\nunrecognized values expose `role=\"status\"`. Unknown values keep rendering\nand fall back to the neutral token matrix by CSS construction.\n\nWhen to use: choose the tone that describes the page or section state.\nWhen NOT to use: do not use tone for layout, density, or filled-vs-outlined\nstyling; those are token/theme decisions.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Message body. It lives inside the live-region boundary.",
        "actions": "Optional responses to this message, in a row at the bottom\nof the card, outside the live region. Slot `size=\"sm\"` buttons. The alert\nnever activates them and an action does not dismiss the alert; the\napplication does, by setting `dismissed`. When NOT to use: a response the\nperson cannot skip belongs in `ki-dialog`.",
        "icon": "Optional decorative glyph shown in a round frame at the top of\nthe card, in the tone's colors. Hidden from assistive technology: it never\ncarries meaning the heading and message lack. Without one, a non-neutral\nalert draws its tone's default glyph. When to use: replace the default\nglyph, or give a neutral alert one. When NOT to use: never as the only cue\nfor the message."
      },
      "tag": "ki-alert",
      "whenNotToUse": "transient confirmations that expire on their own belong to\n`ki-toast`, raised into a `ki-toaster`; tiny status descriptors attached to\nanother element belong to `ki-badge`; blocking decisions belong to\n`ki-dialog`; inline field-level validation belongs to the form control.\n\nAssistive technology note: alerts that must be announced should be inserted\ndynamically, or re-shown by clearing `dismissed`; alerts present at initial\npage load are exposed with their role but platform announcement is not\nguaranteed.\n\nEvery non-neutral alert draws its tone's glyph in the icon frame (`info`,\n`circle-check`, `triangle-alert`, `octagon-alert`) unless an icon is slotted.",
      "whenToUse": "show a persistent inline message about the state of a page or\nsection, such as a failed save, completed operation, or service notice, that\nremains until the condition is resolved or the person dismisses it. Express\nseverity with `tone`, never custom styling."
    },
    "ki-audio": {
      "description": "A recording player with play, pause, a seek timeline, elapsed and total time,\nplayback speed, mute, and an optional transcript link.",
      "events": {
        "ended": "Forwarded when the recording ends. The catalog can bind a declared action here."
      },
      "props": {
        "error-label": {
          "type": "string",
          "description": "Message shown if playback cannot start or the recording fails to load.",
          "default": "Audio could not be played"
        },
        "mute-label": {
          "type": "string",
          "description": "Accessible name of the mute button.",
          "default": "Mute"
        },
        "pause-label": {
          "type": "string",
          "description": "Accessible name of the pause button.",
          "default": "Pause"
        },
        "play-label": {
          "type": "string",
          "description": "Accessible name of the play button.",
          "default": "Play"
        },
        "rates": {
          "type": "string",
          "description": "Comma-separated playback speeds between 0.25 and 4. Normal speed (1) is always available.",
          "default": "0.75,1,1.25,1.5,2"
        },
        "seek-label": {
          "type": "string",
          "description": "Accessible name of the timeline slider.",
          "default": "Seek"
        },
        "speed-label": {
          "type": "string",
          "description": "Accessible label for the playback-rate picker.",
          "default": "Playback speed"
        },
        "src": {
          "type": "string",
          "description": "Source URL for the recording. Use an HTTP(S) URL or a relative URL.",
          "required": true,
          "format": "url"
        },
        "time-label": {
          "type": "string",
          "description": "Accessible time template. Keep the {elapsed} and {duration} placeholders.",
          "default": "{elapsed} of {duration}"
        },
        "title": {
          "type": "string",
          "description": "Visible title and accessible name of the player.",
          "default": "Audio player"
        },
        "transcript-href": {
          "type": "string",
          "description": "URL for the recording's text transcript. Use an HTTP(S) URL or a relative URL.",
          "format": "url"
        },
        "transcript-label": {
          "type": "string",
          "description": "Text of the transcript link.",
          "default": "Read the transcript"
        },
        "unmute-label": {
          "type": "string",
          "description": "Accessible name of the unmute button.",
          "default": "Unmute"
        }
      },
      "slots": {},
      "tag": "ki-audio",
      "whenNotToUse": "show video (use ki-video), play an ambient loop or start playback automatically, or record audio.",
      "whenToUse": "play a voice note, interview, or other prerecorded audio that a person deliberately starts. Provide a title and the equivalent text transcript URL when available."
    },
    "ki-avatar": {
      "description": "A static identity visual that shows a person or entity at a glance through\na fallback chain: portrait, then initials, then a built-in generic figure.",
      "events": {},
      "props": {
        "initials": {
          "type": "string",
          "description": "Initials rendered verbatim as the second fallback step — never derived\nfrom the label, never truncated (FR-003). Catalog guidance: one to two\ncharacters. With a label present the initials are presentational;\nassistive technology receives the label alone."
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the identity (\"Ana García\"). With a label the avatar\nis exposed as a named non-interactive image (role `img`) in every content\nmode — the portrait never carries a second alternative text of its own.\nWithout a label the avatar is decorative and contributes nothing to the\naccessibility tree; the identity must then live in adjacent visible text\n(FR-002)."
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs",
            "xxs"
          ],
          "description": "Size step over the shared scale; per-size metrics (box, initials font,\nfigure glyph) are per-theme component tokens, never hardcoded (FR-004).\nAn unrecognized value matches no style selector, so the avatar keeps the\ndefault medium metrics (fallback by CSS construction, FR-007).",
          "default": "md"
        },
        "src": {
          "type": "string",
          "description": "Portrait URL, the first step of the fallback chain. When it fails to\nload — initially or at runtime — the avatar silently falls back to the\ninitials (or the generic figure) with no error, no layout change and no\nevent (FR-001). Loading policy follows the platform image defaults.",
          "format": "url"
        }
      },
      "slots": {
        "counter": "Decorative ki-counter. Counts sit at block-start inline-end\nand dots at block-end inline-end. Include its meaning in the avatar label."
      },
      "tag": "ki-avatar",
      "whenNotToUse": "as a clickable control (compose the avatar inside an\ninteractive host such as ki-button), for logos or arbitrary illustrations\n(plain `img`), or unlabeled when no adjacent text names the identity.\nUse the counter slot for a decorative count or presence dot.",
      "whenToUse": "a compact identity visual for a person or entity — a comment\nauthor, a contact list item, a project member. Set `label` whenever the\navatar is the only carrier of the identity (no adjacent visible name);\ncompose several into `ki-avatar-group` for a compact \"who is involved\"\nstack with overflow."
    },
    "ki-avatar-group": {
      "description": "A token-styled companion container that stacks `ki-avatar` children as one\noverlapping row with a configurable visible cap and a static \"+N\" overflow\ncounter.",
      "events": {},
      "props": {
        "max": {
          "type": "number",
          "description": "Visible cap for the member stack. When the member count exceeds it, the\nfirst `max` members render followed by a \"+N\" counter accounting exactly\nfor the hidden rest. Without it — or when it is not a positive whole\nnumber — every member renders and no counter appears; malformed\nagent-generated markup never breaks the page (FR-009, S14, S15)."
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs",
            "xxs"
          ],
          "description": "Size step governing the metrics of every visible member and the counter\n(avatar vocabulary, FR-010). Member-declared sizes are overridden inside\na group so the stack stays uniform (S6). An unrecognized value matches\nno style selector, so the group keeps the default medium metrics\n(FR-007).",
          "default": "md"
        }
      },
      "slots": {
        "": "`ki-avatar` members, stacked in source order. Members beyond the\nvisible cap are neither rendered nor exposed to assistive technology."
      },
      "tag": "ki-avatar-group",
      "whenNotToUse": "as a member picker or expandable overflow (future interactive\ngrouping — the counter is static text, never a button), for a single\nidentity (use `ki-avatar` alone), or with children other than `ki-avatar`\n(foreign markup is unsupported and not repaired, 016 precedent).",
      "whenToUse": "a compact \"who is involved\" stack — the members of a shared\ndocument, project card or event row — where space deserves only the first\nfew identities and an exact \"+N\" counter accounts for the rest."
    },
    "ki-badge": {
      "description": "A static, non-interactive status pill.",
      "events": {},
      "props": {
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm",
            "xs"
          ],
          "description": "Metric scale (`--ki-badge-{size}-*` tokens): 20, 24 or 28px tall in\nonmars, with 12px text at every size. An unrecognized value falls back to\nthe `md` metrics the same way.",
          "default": "md"
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "info",
            "neutral",
            "success",
            "warning"
          ],
          "description": "Semantic intent, never appearance: each tone resolves its colors from\nthe `--ki-badge-{tone}-*` tokens. An unrecognized value matches no\nstyle selector, so the badge keeps the neutral appearance (fallback by\nCSS construction — no validation code).",
          "default": "neutral"
        }
      },
      "slots": {
        "": "The label: short status text, the sole carrier of meaning."
      },
      "tag": "ki-badge",
      "whenNotToUse": "feedback that must be announced (that is\nki-alert's job — the badge has no live region), an interactive\nchip, filter or button, empty content (the label IS the meaning), or a\nnotification-counter overlay (use ki-counter).",
      "whenToUse": "annotate an entity with short status text (a state, a\ncategory) whose meaning is carried by the label itself; the tone color\nonly reinforces the text, it never replaces it."
    },
    "ki-breadcrumb": {
      "description": "A path of ancestor links ending at the current page, with optional overflow.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the navigation landmark.",
          "default": "Breadcrumb"
        },
        "max-items": {
          "type": "number",
          "description": "Optional overflow threshold. Above it, keep the first and last two levels\nvisible. Positive values are rounded down and clamped to four. Omit this\nprop, or pass a non-positive or non-finite value, to show the full trail."
        },
        "more-label": {
          "type": "string",
          "description": "Localizable name of the overflow control. Use {n} for the hidden level count.",
          "default": "Show {n} more levels"
        }
      },
      "slots": {
        "": "Direct ki-breadcrumb-item children in hierarchy order."
      },
      "tag": "ki-breadcrumb",
      "whenNotToUse": "switch between peer routes, toggle peer panels, or display progress through a form.",
      "whenToUse": "show the current page in a deeper hierarchy using direct ki-breadcrumb-item children ordered from root to current."
    },
    "ki-breadcrumb-item": {
      "description": "One declarative level in a breadcrumb path.",
      "events": {},
      "props": {
        "current": {
          "type": "boolean",
          "description": "Explicitly marks the final level as current. The owning breadcrumb treats\nits final level as current by position, including when this marker is omitted.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "Native destination for an ancestor level. Leaves the label as text when omitted.\nThe final level never links away from the current page.",
          "format": "url"
        }
      },
      "slots": {
        "": "Plain-text label mirrored by the owning breadcrumb."
      },
      "tag": "ki-breadcrumb-item",
      "whenNotToUse": "render a standalone link or display an interactive control inside the label.",
      "whenToUse": "declare a direct child of ki-breadcrumb in hierarchy order. Give ancestors an href and use short text labels. The last level is the current page."
    },
    "ki-button": {
      "description": "A token-styled action button with native button semantics.",
      "events": {
        "ki-change": "Emitted after toggle activation with the new selected state."
      },
      "props": {
        "command": {
          "type": "enum",
          "values": [
            "close",
            "request-close",
            "show-modal"
          ],
          "description": "Dialog action to run for `commandfor`. Use `show-modal` to open,\n`close` for direct dismissal, or `request-close` for guarded dismissal.\nChoose a command for local dialog control and omit it for other actions."
        },
        "commandfor": {
          "type": "string",
          "description": "ID of a ki-dialog in the same document or shadow tree as this button.\nSet it together with `command` to connect a dialog declaratively."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the button from keyboard reach, and exposes\nthe unavailable state through the internal native button. Wins over\n`loading` when both are set.\nWhen NOT to use: do not use disabled for pending/loading semantics; use\n`loading`.",
          "default": false
        },
        "loading": {
          "type": "boolean",
          "description": "Pending state of the action this button started (saving, sending).\nWhile set, every activation is blocked (pointer, Enter and Space) and the\nbutton neither submits nor resets its form, but it stays focusable, in\nthe Tab order and at its width: the label stays laid out, transparent,\nand a spinner is drawn in its place. The internal native button is\nexposed with `aria-disabled=\"true\"` and keeps its name, and\n`loadingLabel` is announced as a polite status message. `disabled`, and\na disabled fieldset, win over it. The application sets it when the\naction starts and clears it when the action ends.\nWhen to use: while the work a click on this button started is running,\nso a second activation cannot repeat it.\nWhen NOT to use: for a button the person cannot use yet (use\n`disabled`), or for the progress of a page or region (use ki-progress).",
          "default": false
        },
        "loading-label": {
          "type": "string",
          "description": "Text of the polite status message announced while `loading` is set.\nOverride for localization; the default English string is the button's\nonly built-in user-visible text.\nWhen to use: provide a localized message whenever the document language\nis not English, or a more specific one (\"Saving\").\nWhen NOT to use: do not repeat the button's label here; the person\nalready hears it on focus.",
          "default": "Loading"
        },
        "name": {
          "type": "string",
          "description": "Form-data key contributed when this button submits its form.\nWhen NOT to use: omit when no submitter value should be sent."
        },
        "selected": {
          "type": "boolean",
          "description": "Current press state in toggle mode. Set this to initialize or synchronize\nthe state programmatically without emitting a change.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed button size. Every size keeps at least the minimum pointer\ntarget; choose the size that matches the density of the surrounding UI.\nWhen NOT to use: do not use `ki-button` for icon-only compact controls.",
          "default": "md"
        },
        "toggle": {
          "type": "boolean",
          "description": "Enables persistent press state for an action such as Bold. The native\nbutton exposes `aria-pressed` and each activation switches `selected`.\nUse the same label in both states. A toggle does not submit or reset a form.",
          "default": false
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "success"
          ],
          "description": "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions. Toggle\npalettes are specific to the variant.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.",
          "default": "neutral"
        },
        "type": {
          "type": "enum",
          "values": [
            "button"
          ],
          "description": "Native form action type: `submit` submits the owning form (running\nconstraint validation and contributing `name`/`value` to the form data),\n`reset` restores field defaults, and `button` leaves the form alone.\nToggle mode and configured dialog commands take precedence over form actions.\nCancel a submission from the form's `submit` event (`preventDefault()`);\nunlike a native button, `preventDefault()` on the `click` event does not\ncancel it. During submission `event.submitter` is a transient native\nbutton carrying this element's `name`/`value`, not the `ki-button` host.\nWhen NOT to use: use `button` when the action must never submit a form.",
          "default": "button"
        },
        "value": {
          "type": "string",
          "description": "Form-data value paired with `name` when this button submits its form.\nWhen NOT to use: omit when the default empty submitter value is intended."
        },
        "variant": {
          "type": "enum",
          "values": [
            "ghost",
            "outline",
            "primary",
            "quaternary",
            "secondary"
          ],
          "description": "Visual hierarchy for the action. Use filled `primary` for the single main\naction, outlined `secondary` for supporting actions, `quaternary` for\nneutral text actions, `ghost` for accent text actions and `outline` for\nan unfilled action with a visible boundary.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.",
          "default": "secondary",
          "deprecatedValues": [
            "tertiary"
          ]
        }
      },
      "slots": {
        "": "Label content. This is the accessible name source.",
        "end": "Trailing icon or media. Follows writing direction.",
        "start": "Leading icon or media. Follows writing direction."
      },
      "tag": "ki-button",
      "whenNotToUse": "navigation, icon-only actions, form values, or the\nprogress of a page or region (use ki-progress).",
      "whenToUse": "trigger the single main action of a view, supporting actions\nin descending hierarchy, confirming/destructive actions through tone, or\npersistent actions such as Bold with `toggle`.\nWhile the action a button started is in progress, set `loading` on that\nbutton instead of disabling it."
    },
    "ki-button-group": {
      "description": "Arranges related actions as a spaced group, attached group, or keyboard toolbar.",
      "events": {},
      "props": {
        "attached": {
          "type": "boolean",
          "description": "Joins neighboring actions at their inner edges. Buttons share the first\nbutton's variant and use its size when the group has no explicit size.\nUse for a closely related set of actions or for a split button.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Required accessible name for the group or toolbar (for example, \"Text formatting\").\nProvide a localized name that describes the actions' shared purpose.",
          "required": true
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Applies one token-backed size to each button while it belongs to the group.\nOmit it to keep individual sizes in spaced mode."
        },
        "toolbar": {
          "type": "boolean",
          "description": "Gives the group toolbar semantics, a framed surface and one Tab stop.\nHorizontal arrows, Home and End move between the toolbar's actions.",
          "default": false
        }
      },
      "slots": {
        "": "Related ki-button and ki-icon-button controls, in reading order.\nWrap labeled icon actions in ki-tooltip with the same label to show the\nlabel on focus and hover. A toolbar can also include vertical separators."
      },
      "tag": "ki-button-group",
      "whenNotToUse": "for a single-choice setting, unrelated actions, or navigation.\nUse a segmented control for a single-choice setting and links for navigation.",
      "whenToUse": "place two to five related actions together, present a primary\naction with a menu of alternatives, or give formatting tools one Tab stop."
    },
    "ki-card": {
      "description": "A card surface for grouping related content, with an optional primary link or action.",
      "events": {
        "ki-activate": "Fires once when the user activates an action card by pointer or keyboard."
      },
      "props": {
        "href": {
          "type": "string",
          "description": "Destination for the card's title link. Supply a text heading in the\nheader slot. A nonblank href takes precedence over interactive.",
          "format": "url"
        },
        "interactive": {
          "type": "boolean",
          "description": "Gives a titled card a primary button that emits ki-activate. Use href\nfor navigation. Keep other actions in separate controls in the card.",
          "default": false
        },
        "variant": {
          "type": "enum",
          "values": [
            "default",
            "elevated",
            "filled",
            "outlined"
          ],
          "description": "Surface treatment. Choose elevated for a raised panel, filled for a\ntinted group or outlined for a bordered surface. Use default to follow\nthe theme's existing card treatment.",
          "default": "default"
        }
      },
      "slots": {
        "": "Body region for supporting text or arbitrary composed content.",
        "footer": "Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.",
        "header": "Title region. Supply one nonempty text heading at the surrounding document level for a clickable card.",
        "media": "Leading visual region for an image, video or illustration."
      },
      "tag": "ki-card",
      "whenNotToUse": "as a form field, fieldset, page landmark, section replacement\nor nested card. Use a standalone button or link for a control without\nsupporting content.",
      "whenToUse": "group related media, a title, supporting text and actions into\none scannable surface. Set `href` for navigation or `interactive` for a\ndeclared action. Give a clickable card one text heading in the header\nslot and place secondary controls in the body or footer."
    },
    "ki-carousel": {
      "description": "An ordered, swipeable sequence with previous and next controls and position feedback.",
      "events": {
        "ki-slide-change": "Reports the one-based index when the leading slide changes."
      },
      "props": {
        "autoplay": {
          "type": "number",
          "description": "Rotation interval in milliseconds. Omitting it leaves rotation off.",
          "minimum": 1,
          "maximum": 2147483647
        },
        "carousel-role-description": {
          "type": "string",
          "description": "Accessible role description of the region.",
          "default": "carousel"
        },
        "current": {
          "type": "number",
          "description": "One-based leading slide. Setting it moves the carousel and clamps the index to\nthe available leading positions.",
          "default": 1,
          "minimum": 1
        },
        "label": {
          "type": "string",
          "description": "Required accessible name of the carousel region.",
          "required": true
        },
        "layout": {
          "type": "enum",
          "values": [
            "full-screen",
            "hero",
            "multi-browse",
            "single",
            "uncontained"
          ],
          "description": "Item arrangement. Full-screen uses a vertical, full-viewport slide.",
          "default": "single"
        },
        "loop": {
          "type": "boolean",
          "description": "Whether navigating past one endpoint wraps to the other.",
          "default": false
        },
        "navigation": {
          "type": "boolean",
          "description": "Whether to show the Previous and Next buttons. The viewport stays keyboard-operable.",
          "default": true
        },
        "next-label": {
          "type": "string",
          "description": "Accessible label of the Next button.",
          "default": "Next slide"
        },
        "pagination": {
          "type": "boolean",
          "description": "Whether to show the noninteractive slide position indicator.",
          "default": true
        },
        "pause-label": {
          "type": "string",
          "description": "Visible and accessible label of the Pause button.",
          "default": "Pause"
        },
        "play-label": {
          "type": "string",
          "description": "Visible and accessible label of the Play button.",
          "default": "Play"
        },
        "position-label": {
          "type": "string",
          "description": "Accessible label of the position indicator.",
          "default": "Slide position"
        },
        "previous-label": {
          "type": "string",
          "description": "Accessible label of the Previous button.",
          "default": "Previous slide"
        },
        "slide-label": {
          "type": "string",
          "description": "Spoken slide name and announcement. Use {index} and {count} as placeholders.",
          "default": "{index} of {count}"
        },
        "slide-role-description": {
          "type": "string",
          "description": "Accessible role description of each slide group.",
          "default": "slide"
        },
        "slides-per-move": {
          "type": "number",
          "description": "Number of positions advanced by Previous, Next and automatic rotation.",
          "default": 1,
          "minimum": 1
        },
        "slides-per-view": {
          "type": "number",
          "description": "Number of slides visible together in the single layout. Material 3 layouts\ndetermine their own item widths.",
          "default": 1,
          "minimum": 1
        }
      },
      "slots": {
        "": "Direct ki-carousel-item children in reading order."
      },
      "tag": "ki-carousel",
      "whenNotToUse": "hide essential content behind rotation, replace ordinary page navigation,\nor present slides that readers need to compare side by side at the same time.",
      "whenToUse": "show a short set of related highlights, onboarding steps or media panels.\nGive the carousel a meaningful label and supply one ki-carousel-item per slide."
    },
    "ki-carousel-item": {
      "description": "A slide in an ordered ki-carousel sequence.",
      "events": {},
      "props": {},
      "slots": {
        "": "The full slide content, including any links and controls.",
        "preview": "Decorative, noninteractive media shown when the item is a reduced preview."
      },
      "tag": "ki-carousel-item",
      "whenNotToUse": "present a standalone card or a layout container outside a carousel.",
      "whenToUse": "supply a single slide to a ki-carousel. Put the full slide in the\ndefault slot and optional decorative preview media in the preview slot."
    },
    "ki-checkbox": {
      "description": "A form-associated checkbox for selecting independent options.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired once after a user toggle (pointer, slotted label or Space)\ncommits, composed across the shadow boundary; `checked` is already current\nwhen listeners run. `click()` from a script, or a page `<label>` for the\ncheckbox, toggles it like a native checkbox: one `input`, then one `change`. When to use: react to the committed selection. When NOT\nto use: do not expect it for programmatic `checked` writes, which are silent."
      },
      "props": {
        "checked": {
          "type": "boolean",
          "description": "Live binary selection state. User activation by pointer, slotted label or\nSpace toggles it with native checkbox parity and emits composed `input`\nbefore composed `change`. Boolean presence semantics apply:\n`checked=\"false\"` still renders checked; omit the attribute to express\nunchecked. Programmatic assignment is silent.\nWhen NOT to use: do not treat this reflected attribute as a native\n`defaultChecked`; reset uses the baseline captured at form association.",
          "default": false
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted answer (\"This plan needs a signed contract\"). While it holds\ntext the checkbox is invalid, blocks its form, shows the text in place of\nthe help text at once and is announced as invalid. It stops counting when\nthe person toggles the checkbox, or when the form is reset, so it never\nblocks the corrected answer. It outranks `error-text` and an error set\nwith `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` checkbox left unchecked;\n`error-text` words that. Inside a `ki-checkbox-group`, set it on the\ngroup. Setting the same text again while the prop still holds it shows\nnothing: remove it first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the checkbox from keyboard reach, exposes the\nunavailable state, and excludes it from form data.\nWhen NOT to use: do not use disabled for validation errors or pending\nstate.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message shown in place of the help text once a `required` checkbox is\nleft unchecked, and its `validationMessage`. Say what checking it means\n(\"Accept the terms to continue\"). Without it the browser's own message\nshows, in the browser's language. An error set with `custom-error` or\n`setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those."
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the checkbox, read with it as its description:\nwhat checking it means or commits to.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`."
        },
        "indeterminate": {
          "type": "boolean",
          "description": "Presentation-only mixed state. It renders the dash mark, is forwarded to\nthe internal native input for mixed assistive-technology exposure, and\nnever changes the submitted value. Any user toggle clears it and removes\nthe reflected attribute.\nWhen NOT to use: do not submit or persist `indeterminate` as a third\nvalue; model data remains binary through `checked`.",
          "default": false
        },
        "label-hint": {
          "type": "string",
          "description": "Short text shown after the slotted label and read with it as part of the\ncheckbox name, so people know before submitting whether they must check\nit: \"(required)\" on a consent the form cannot do without, \"(optional)\"\non one it can, in the page's own language. It changes no validation; set\n`required` for that, and keep the two consistent.\nWhen NOT to use: do not put what checking it commits to in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label."
        },
        "name": {
          "type": "string",
          "description": "Form-data key contributed when the checkbox is checked.\nWhen NOT to use: omit when the checkbox should not submit a value."
        },
        "required": {
          "type": "boolean",
          "description": "Requires the checkbox to be checked before form submission can proceed.\nThe invalid appearance appears after a blocked submission attempt or an\ninvalidating user toggle, never on initial render.\nWhen NOT to use: do not use required to express group-level rules; compose\nthose at the form/application layer.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm"
          ],
          "description": "Token-backed size: the box is 18, 20 or 24px in onmars. `sm` also takes\nthe smaller label (13/20, 8px away); `md` and `lg` keep the 15px label.\nThe pointer target never drops under 24px. An unrecognized value matches\nno style rule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Form-data value paired with `name` when checked. If omitted, the submitted\nvalue is `on`, matching native checkbox behavior.\nWhen NOT to use: do not encode the unchecked state here; unchecked\ncheckboxes contribute no form entry."
        }
      },
      "slots": {
        "": "Visible label content. This is the accessible name source and a\nnative activation surface."
      },
      "tag": "ki-checkbox",
      "whenNotToUse": "a single mutually exclusive choice, an immediate on/off\neffect, triggering an action, unlabeled/icon-only usage, or\n`checked=\"false\"` to mean unchecked. Boolean attributes use presence\nsemantics; omit `checked` to express unchecked.",
      "whenToUse": "selecting one or more independent options that a form submits\nlater, including a \"select all\" parent that presents partial selection with\n`indeterminate`. Always provide a visible label in the default slot."
    },
    "ki-checkbox-group": {
      "description": "A form-associated group of independently selectable checkboxes.",
      "events": {
        "ki-change": "Fires once for a committed user toggle with a copy of the current selection."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted selection (\"Pick regions we deliver to\"). While it holds text\nthe group is invalid, blocks its form, shows the text in place of the\nhelp text at once and is announced as invalid. It stops counting when the\nperson toggles an option, or when the form is reset, so it never blocks\nthe corrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for the `min` and `max` limits the group\nenforces itself; `error-text` words those. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain."
        },
        "disabled": {
          "type": "boolean",
          "description": "Makes the group unavailable and excludes it from form submission.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Localized message displayed for a failing selection limit."
        },
        "help-text": {
          "type": "string",
          "description": "One line of guidance displayed under the choices."
        },
        "label": {
          "type": "string",
          "description": "Visible legend and accessible name for these choices.\nWhen NOT to use: do not omit it unless the host's `aria-labelledby` names\nthe group from the page.\n\nNaming from the page: set `aria-labelledby` on the host to the ids of\nelements in the same document or shadow root, such as the heading that\nalready asks the question. The group then takes its name from them,\nfollowed by its own `label` when set. The ids are read when the group\nrenders and whenever the attribute changes.\nWhen to use: the question is written on the page above the options; omit\n`label` so the question is not shown, or read, twice.\nWhen NOT to use: do not reference elements inside another component's\nshadow root, which an id reference cannot reach.",
          "required": true
        },
        "label-hidden": {
          "type": "boolean",
          "description": "Hides the legend from view and from reading order while it stays the\ngroup's accessible name, so a screen reader announces it once, as the\ngroup's name.\nWhen to use: the layout already makes the question obvious to sighted\npeople but the group still needs a name of its own.\nWhen NOT to use: do not hide a legend that repeats a question already on\nthe page; point `aria-labelledby` at that question instead.",
          "default": false
        },
        "max": {
          "type": "number",
          "description": "Maximum number of checked options, as a nonnegative integer."
        },
        "min": {
          "type": "number",
          "description": "Minimum number of checked options, as a nonnegative integer."
        },
        "name": {
          "type": "string",
          "description": "Form-data key repeated for each selected option."
        },
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Lays choices out vertically or in a wrapping horizontal row.",
          "default": "vertical"
        }
      },
      "slots": {
        "": "Direct `ki-checkbox` options, each with its own visible label and value.\nPut form naming and constraints on the group."
      },
      "tag": "ki-checkbox-group",
      "whenNotToUse": "mutually exclusive choices (use `ki-radio-group`) or an\nimmediate on/off setting (use `ki-switch`). Provide a group label.",
      "whenToUse": "people may select several visible options that share a question,\nform field, and optional selection limits."
    },
    "ki-chip": {
      "description": "A compact filter toggle, removable picked value, or contextual action.",
      "events": {
        "ki-activate": "Emitted by an assist chip when its native button is activated.",
        "ki-change": "Emitted after a filter chip changes its pressed state.",
        "ki-remove": "Remove request for an input chip. Cancel it to keep application ownership of the chip."
      },
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removal and moving the chip.",
          "default": false
        },
        "removable": {
          "type": "boolean",
          "description": "Gives an input chip a trailing remove button and keyboard deletion.",
          "default": false
        },
        "remove-label": {
          "type": "string",
          "description": "Localized action prefix in the remove button's accessible name, followed by the chip label.",
          "default": "Remove"
        },
        "selected": {
          "type": "boolean",
          "description": "The pressed state of a filter chip. The user can toggle it in place.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Visual size of the pill, 24 CSS px for sm and 32 CSS px for md at standard text spacing.",
          "default": "md"
        },
        "type": {
          "type": "enum",
          "values": [
            "assist",
            "filter",
            "input"
          ],
          "description": "Chip kind. Inherits the immediate chip group's type when omitted. Standalone chips default to filter."
        },
        "value": {
          "type": "string",
          "description": "Value sent with removal, contextual activation and reorder events.",
          "default": ""
        }
      },
      "slots": {
        "": "The visible text label. Use text or non-interactive markup.",
        "start": "One decorative glyph or extra-extra-small avatar. A filter check\nreplaces it when selected. Do not slot controls."
      },
      "tag": "ki-chip",
      "whenNotToUse": "static status (ki-badge), primary actions (ki-button), suggested\nprompts, or mutually exclusive choices (ki-radio-group).",
      "whenToUse": "apply independent filters, represent values selected in an entry\nfield, or offer a small contextual action alongside content."
    },
    "ki-chip-group": {
      "description": "A named collection of filter, input or assist chips, with optional ordering.",
      "events": {
        "ki-reorder": "Emitted after moving a chip. Indices are zero-based positions in the visible chip collection."
      },
      "props": {
        "focus-target": {
          "type": "string",
          "description": "ID of the entry field in the same document or shadow root for focus after the last chip.",
          "format": "idref"
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the group or list.",
          "default": ""
        },
        "reorder-announcement": {
          "type": "string",
          "description": "Localized polite message using {label}, {position} and {total}. Position is one-based.",
          "default": "{label} moved to position {position} of {total}."
        },
        "reorderable": {
          "type": "boolean",
          "description": "Enables dragging, pointer pick-and-place and Alt+Left/Right to move chips.",
          "default": false
        },
        "type": {
          "type": "enum",
          "values": [
            "assist",
            "filter",
            "input"
          ],
          "description": "Shared chip kind and collection semantics. Input chips are presented as a list.",
          "default": "filter"
        }
      },
      "slots": {
        "": "Direct ki-chip children in reading order."
      },
      "tag": "ki-chip-group",
      "whenNotToUse": "choose exactly one option or submit a form value.",
      "whenToUse": "label related chips or let people change their reading order."
    },
    "ki-citation": {
      "description": "A numbered inline link from an answer to a source card.",
      "events": {},
      "props": {
        "label-template": {
          "type": "string",
          "description": "Localized link name with `{number}` and `{title}` placeholders.",
          "default": "Source {number}: {title}"
        },
        "ref": {
          "type": "string",
          "description": "ID or source-id of the source. Use the `ref` attribute in HTML and\n`citationRef` in JSX so framework refs remain available.",
          "required": true
        }
      },
      "slots": {},
      "tag": "ki-citation",
      "whenNotToUse": "To cite a source outside this tree or replace a standalone\nlink. Use `ki-link` for direct navigation.",
      "whenToUse": "Next to a claim supported by a `ki-source` in the same document\nor shadow root. Repeat the same reference for subsequent mentions."
    },
    "ki-code-block": {
      "description": "Presents source code with a named header, syntax colors, line controls and\nclipboard feedback.",
      "events": {
        "ki-copy": "CopyButton reports a successful write with the original source text."
      },
      "props": {
        "copied-label": {
          "type": "string",
          "description": "Polite announcement after a successful clipboard write.",
          "default": "Copied"
        },
        "copy-error-label": {
          "type": "string",
          "description": "Polite announcement after a failed clipboard write.",
          "default": "Couldn't copy"
        },
        "copy-label": {
          "type": "string",
          "description": "Accessible name of the copy button.",
          "default": "Copy code"
        },
        "copyable": {
          "type": "boolean",
          "description": "Show the copy control. Set `copyable=\"false\"` in HTML to hide it.",
          "default": true
        },
        "filename": {
          "type": "string",
          "description": "File name shown in the header beside the language."
        },
        "highlight": {
          "type": "string",
          "description": "Comma-separated lines or inclusive ranges, for example `\"3,5-7\"`."
        },
        "highlight-label": {
          "type": "string",
          "description": "Localizable prefix for the accessible description of highlighted lines.",
          "default": "Highlighted lines"
        },
        "label": {
          "type": "string",
          "description": "Figure and scroll area label when there is no language or filename.",
          "default": "Code"
        },
        "language": {
          "type": "string",
          "description": "Visible language label and syntax grammar. Supports JavaScript, TypeScript and JSON."
        },
        "line-numbers": {
          "type": "boolean",
          "description": "Show decorative one-based line numbers.",
          "default": false
        },
        "wrap": {
          "type": "boolean",
          "description": "Soft-wrap long lines within the available width.",
          "default": false
        }
      },
      "slots": {
        "": "Literal source text. Escape markup in HTML or supply a text node."
      },
      "tag": "ki-code-block",
      "whenNotToUse": "when the reader should edit the source or when the code belongs\ninline in a sentence. Use an editor or a native inline code element.",
      "whenToUse": "display a multiline example, generated code or a tool result that\nreaders should be able to inspect and copy."
    },
    "ki-code-input": {
      "description": "A form-associated verification field with one native text input and a visual box per character.",
      "events": {
        "ki-complete": "Emitted after the input event when the edited code fills all the cells.",
        "ki-input": "Emitted when a user edit changes the code."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted code (\"This code has expired\"). While it holds text the field\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit of the code, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for an incomplete code, which the field\nreports itself; `error-text` words that. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disable editing, sequential focus and form participation.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message for a failing code constraint. Omit to use the browser's message. A `custom-error` outranks it."
        },
        "help-text": {
          "type": "string",
          "description": "Instructions saying where the code was sent and how long it is valid."
        },
        "label": {
          "type": "string",
          "description": "Visible accessible name. Supply a label in the language of the form.",
          "required": true
        },
        "length": {
          "type": "number",
          "description": "Number of cells and maximum code length. Unsupported lengths fall back to six.",
          "default": 6,
          "minimum": 4,
          "maximum": 8
        },
        "name": {
          "type": "string",
          "description": "Key for the single value submitted to the enclosing form."
        },
        "required": {
          "type": "boolean",
          "description": "Require a complete code before submitting. An optional field may be empty.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Medium or small cells. The form region's density adjusts both sizes.",
          "default": "md"
        },
        "type": {
          "type": "enum",
          "values": [
            "alphanumeric",
            "numeric"
          ],
          "description": "Allowed characters and keyboard hint. Alphanumeric mode preserves ASCII letter case.",
          "default": "numeric"
        },
        "value": {
          "type": "string",
          "description": "The current code, including leading zeros. Use the attribute to declare\nthe reset value. Programmatic assignments are normalized and silent.",
          "default": ""
        }
      },
      "slots": {},
      "tag": "ki-code-input",
      "whenNotToUse": "Use ki-input for passwords, long codes or free text.",
      "whenToUse": "Collect a one-time code of four to eight characters for sign-in or verification."
    },
    "ki-combobox": {
      "description": "An editable, form-associated combobox with local or remote filtering,\nsingle or multiple selection, and optional free entry.",
      "activationEvent": "change",
      "events": {
        "change": "Composed event after a user changes the committed selection.\nRead the committed value from the host.",
        "ki-input": "Reports a raw text edit in `detail.value`. Listen to it to request remote results."
      },
      "props": {
        "add-label": {
          "type": "string",
          "description": "Localizable free-entry offer. {text} is replaced by the trimmed query.",
          "default": "Add “{text}”"
        },
        "allow-custom": {
          "type": "boolean",
          "description": "Offers to add trimmed query text when no known or selected choice already matches it.",
          "default": false
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"Ana is on leave this week\"). While it holds text the\nfield is invalid, blocks its form, shows the text in place of the help\ntext at once and is announced as invalid. It stops counting when the\nperson commits another selection (choosing, removing or clearing a\nchoice; typing filter text is not a change), or when the form is reset,\nso it never blocks the corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` field left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables editing, navigation and form submission.",
          "default": false
        },
        "empty-label": {
          "type": "string",
          "description": "Localizable status when there are no choices to display.",
          "default": "No results"
        },
        "error-text": {
          "type": "string",
          "description": "Message used when a required selection is missing, in place of the browser's message. A `custom-error` outranks it."
        },
        "filter": {
          "type": "enum",
          "values": [
            "contains",
            "none",
            "starts-with"
          ],
          "description": "Filters by label. Set to none when the application provides results from a remote search.",
          "default": "contains"
        },
        "help-text": {
          "type": "string",
          "description": "Guidance shown below the field and read as its description."
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible name. Supply it even when placeholder text is also set.",
          "required": true
        },
        "loading": {
          "type": "boolean",
          "description": "Replaces visible options with a loading indicator while a search is pending.",
          "default": false
        },
        "loading-label": {
          "type": "string",
          "description": "Localizable status while waiting for a result set.",
          "default": "Loading results"
        },
        "multiple": {
          "type": "boolean",
          "description": "Enables ordered multiple selection and renders selected values as tags.",
          "default": false
        },
        "name": {
          "type": "string",
          "description": "Form-data key. Multiple choices contribute one entry each under this name."
        },
        "placeholder": {
          "type": "string",
          "description": "Hint shown in the text input when it is empty.",
          "default": ""
        },
        "remove-label": {
          "type": "string",
          "description": "Localizable removal button label. {label} is replaced by the selected label.",
          "default": "Remove {label}"
        },
        "required": {
          "type": "boolean",
          "description": "Requires a committed choice to submit the form.",
          "default": false
        },
        "result-count-label": {
          "type": "string",
          "description": "Localizable status for several choices. {count} is replaced by the result count.",
          "default": "{count} results"
        },
        "result-one-label": {
          "type": "string",
          "description": "Localizable status for one available choice.",
          "default": "1 result"
        },
        "value": {
          "type": "string",
          "description": "Committed value. Use a string for single selection and an array of strings\nfor multiple selection. In HTML and catalog specs, encode multiple values\nas a JSON array string in the value attribute, or supply one literal value.\nAssign a new array to change multiple selections programmatically.",
          "default": ""
        }
      },
      "slots": {
        "": "Declarative ki-option children. Supply unique values and a human-readable label."
      },
      "tag": "ki-combobox",
      "whenNotToUse": "use a select-only control for a short closed set or a plain\ntext field for unrestricted input with no choices.",
      "whenToUse": "choose from a long list of options, let people search an option\nsource, or allow multiple selections that remain visible as tags."
    },
    "ki-confirmation": {
      "description": "An inline prompt for a decision about a proposed assistant action.",
      "events": {
        "ki-approve": "Explicit approval, with the conversation preference at the time of the decision.",
        "ki-deny": "Explicit refusal of the pending request."
      },
      "props": {
        "action": {
          "type": "string",
          "description": "Tool identifier shown to the person and available for reporting by the host.",
          "required": true,
          "format": "text"
        },
        "approve-label": {
          "type": "string",
          "description": "Verb or short phrase that describes what approval does, such as \"Send email\".",
          "required": true
        },
        "approved-label": {
          "type": "string",
          "description": "Localized outcome text when the host marks the request approved.",
          "default": "Approved"
        },
        "consequence": {
          "type": "string",
          "description": "Cost or irreversible effect to read before deciding, displayed as a warning note."
        },
        "denied-label": {
          "type": "string",
          "description": "Localized outcome text when the host marks the request denied.",
          "default": "Denied"
        },
        "deny-label": {
          "type": "string",
          "description": "Verb or short phrase for refusal, such as \"Keep draft\".",
          "required": true
        },
        "expired-label": {
          "type": "string",
          "description": "Localized outcome text when the host marks the request expired.",
          "default": "Expired"
        },
        "heading": {
          "type": "string",
          "description": "Question naming the proposed action. Provide it before asking for a decision.",
          "required": true
        },
        "remember": {
          "type": "boolean",
          "description": "Offers an unchecked preference limited to this action in the current conversation.",
          "default": false
        },
        "remember-label": {
          "type": "string",
          "description": "Localized conversation permission label. Name the specific permission when possible.",
          "default": "Allow this action for the rest of this conversation"
        },
        "resolved-at": {
          "type": "string",
          "description": "Display-ready, localized resolution time from the host, if known."
        },
        "resolved-by": {
          "type": "string",
          "description": "Display-ready name of the person or service that resolved the request, if known."
        },
        "state": {
          "type": "enum",
          "values": [
            "approved",
            "denied",
            "expired",
            "pending"
          ],
          "description": "Host-controlled outcome. Resolve after recording a decision or expiring the request.",
          "default": "pending"
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral"
          ],
          "description": "Use danger when approval is destructive. Unknown values use neutral.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Details the person needs to make the decision. Use readable text or\nsemantic markup such as a description list."
      },
      "tag": "ki-confirmation",
      "whenNotToUse": "Report a completed action without a preceding request, or\nblock the rest of the interface with a modal decision (use ki-dialog).\nThe displayed action identifier is text and carries no execution authority.",
      "whenToUse": "Show the exact action and the details a person needs before\ngranting permission. A trusted host maps the two decision events to its\ndeclared actions and records the outcome in state."
    },
    "ki-conversation": {
      "description": "An accessible chat transcript with optional following as messages arrive.",
      "events": {},
      "props": {
        "jump-label": {
          "type": "string",
          "description": "Visible and accessible label for the control that resumes following.",
          "default": "Jump to latest"
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the transcript. Supply a distinct label when several logs share a page.",
          "default": "Conversation"
        },
        "stick-to-bottom": {
          "type": "boolean",
          "description": "Follow new or growing messages until the reader scrolls away from the end.",
          "default": false
        }
      },
      "slots": {
        "": "The chronological transcript, normally ki-message elements."
      },
      "tag": "ki-conversation",
      "whenNotToUse": "Collect input, send messages or present a static sequence of\ncards. Place the composer outside the transcript.",
      "whenToUse": "Display chronological user, assistant and event messages. Give\nthe host a block-size constraint to keep scrolling within the transcript."
    },
    "ki-copy-button": {
      "description": "Copies text to the clipboard and confirms the result in the same button.",
      "events": {
        "ki-copy": "Fired after a successful clipboard write. The detail carries the exact text copied."
      },
      "props": {
        "copied-label": {
          "type": "string",
          "description": "Polite announcement after a successful write. Override for localized interfaces.",
          "default": "Copied"
        },
        "copy-error-label": {
          "type": "string",
          "description": "Polite announcement after a failed write or missing source. Override for localized interfaces.",
          "default": "Couldn't copy"
        },
        "feedback-duration": {
          "type": "number",
          "description": "Milliseconds to show feedback after a write settles. Zero keeps the\noutcome visible until the next result. Invalid values use 1500 ms.",
          "default": 1500,
          "minimum": 0
        },
        "from": {
          "type": "string",
          "description": "ID of a source in this button's document or shadow root. A nonempty ID\ntakes precedence over `value`. The source's current string value or\nits text content is read on activation.",
          "format": "idref"
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the icon-only control. Visible slot text supplies the name when present.",
          "default": "Copy"
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed button size. Match the size of adjacent controls.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Exact clipboard text, including whitespace. Supply it when the text is known directly."
        },
        "variant": {
          "type": "enum",
          "values": [
            "ghost",
            "outline",
            "primary",
            "quaternary",
            "secondary"
          ],
          "description": "Button emphasis. Use ghost for compact actions and secondary for a visible supporting action.",
          "default": "ghost"
        }
      },
      "slots": {
        "": "Optional visible text, which supplies the accessible name and\nplaces the icon at the inline start. Use plain text or non-interactive markup."
      },
      "tag": "ki-copy-button",
      "whenNotToUse": "submit a form, navigate, or trigger an action with no clipboard\nwrite. Use a button or link for those actions.",
      "whenToUse": "let a person copy a link, identifier, token or code sample. Supply\na direct value or point to a source in the same document or shadow root."
    },
    "ki-counter": {
      "description": "A decorative count or dot over a trigger or avatar.",
      "events": {},
      "props": {
        "dot": {
          "type": "boolean",
          "description": "Show a dot independently of the count, including when the value is zero.",
          "default": false
        },
        "for": {
          "type": "string",
          "description": "Literal ID of a trigger in the same document or shadow root. Places the\nindicator at its block-start inline-end corner and hides it while the\ntrigger is unavailable. For a named host slot, omit this property.",
          "format": "idref"
        },
        "max": {
          "type": "number",
          "description": "Largest count displayed in full. Higher values display the cap with a\nplus sign. Fractional caps round down; invalid caps use 99.",
          "default": 99
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "primary",
            "success"
          ],
          "description": "Semantic palette of the pill or dot. An unknown tone uses danger.",
          "default": "danger"
        },
        "value": {
          "type": "number",
          "description": "Count of unread or pending items. Finite values are rounded down.\nValues below one and non-finite values hide the count."
        }
      },
      "slots": {},
      "tag": "ki-counter",
      "whenNotToUse": "for an object's status (use ki-badge), a count inside a list\nrow (use text or ki-badge), or an announcement that needs its own semantics.",
      "whenToUse": "mark unread or pending items on a trigger, or presence on an\navatar. Supply the full meaning in the host's accessible name and use a\npage-owned polite live region for important updates."
    },
    "ki-date-picker": {
      "description": "A locale-aware date field with an anchored keyboard-operable calendar.",
      "events": {
        "ki-change": "Reports a changed, committed value in canonical ISO form. Use this for calendar and typed changes."
      },
      "props": {
        "apply-label": {
          "type": "string",
          "description": "Localized label of the confirmation button that saves a complete draft.",
          "default": "Apply"
        },
        "cancel-label": {
          "type": "string",
          "description": "Localized label of the confirmation button that discards a draft.",
          "default": "Cancel"
        },
        "change-label": {
          "type": "string",
          "description": "Localized name of the trigger when a date is saved. Use {date} for the current selection.",
          "default": "Change date, {date}"
        },
        "choose-label": {
          "type": "string",
          "description": "Localized name of the calendar dialog and of the trigger when no date is saved.",
          "default": "Choose date"
        },
        "confirm": {
          "type": "boolean",
          "description": "Require Apply before saving picks made in the calendar.",
          "default": false
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted date (\"No flights on that day\"). While it holds text the field\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit of the text or pick of another date, or when the form is reset, so\nit never blocks the corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a missing, unreadable or out-of-bounds\ndate, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables the text entry and calendar button and excludes the field from form data.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Overrides the message shown when a date is missing, invalid or outside the bounds. A `custom-error` outranks it."
        },
        "first-day-of-week": {
          "type": "number",
          "description": "First weekday, where Sunday is 0 and Saturday is 6. Defaults to the locale's week start.",
          "minimum": 0,
          "maximum": 6
        },
        "help-text": {
          "type": "string",
          "description": "A format hint or explanation read with the field. It is replaced by a visible error."
        },
        "invalid-date-label": {
          "type": "string",
          "description": "Localized fallback message for an impossible, incomplete or out-of-bounds date.",
          "default": "Enter a valid date within the allowed range."
        },
        "label": {
          "type": "string",
          "description": "Visible text and accessible name of the date field. Provide a label for every field.",
          "required": true
        },
        "locale": {
          "type": "string",
          "description": "BCP 47 language tag for localized dates and weekday order. Defaults to the page language."
        },
        "max": {
          "type": "string",
          "description": "Latest selectable date, inclusive. Use YYYY-MM-DD."
        },
        "min": {
          "type": "string",
          "description": "Earliest selectable date, inclusive. Use YYYY-MM-DD."
        },
        "mode": {
          "type": "enum",
          "values": [
            "range",
            "single"
          ],
          "description": "Select one date or a range with a start and an end date.",
          "default": "single"
        },
        "name": {
          "type": "string",
          "description": "Form-data key. A range is submitted as a single value."
        },
        "next-month-label": {
          "type": "string",
          "description": "Localized accessible name of the next-month button.",
          "default": "Next month"
        },
        "previous-month-label": {
          "type": "string",
          "description": "Localized accessible name of the previous-month button.",
          "default": "Previous month"
        },
        "required": {
          "type": "boolean",
          "description": "Requires a complete date or pair of dates for native form submission.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Current ISO date, ISO start/end pair or empty string. The value attribute is the reset default.",
          "default": ""
        }
      },
      "slots": {},
      "tag": "ki-date-picker",
      "whenNotToUse": "Enter a known distant date, such as a birth date, or choose a time.",
      "whenToUse": "Choose a nearby date or date range when the weekday matters, such as\na booking, a deadline or a schedule."
    },
    "ki-details": {
      "description": "A native disclosure for supporting information that can stay collapsed.",
      "events": {
        "ki-toggle": "Emitted when the native disclosure toggles or an exclusive peer closes it."
      },
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Disables summary activation. The page can still set open.",
          "default": false
        },
        "name": {
          "type": "string",
          "description": "Nonempty name for exclusive disclosures in the same document or shadow root."
        },
        "open": {
          "type": "boolean",
          "description": "Whether the panel is open. Native changes reflect back to this property.",
          "default": false
        },
        "summary": {
          "type": "string",
          "description": "Plain label for the control. Supply the summary slot for a rich label."
        }
      },
      "slots": {
        "": "Content shown when the disclosure is open.",
        "summary": "Rich summary text or an authored heading, replacing the summary prop."
      },
      "tag": "ki-details",
      "whenNotToUse": "hide the primary action or information needed to complete a task.\nFor script-free HTML, author native details and summary directly.",
      "whenToUse": "reveal a short explanation, FAQ answer, settings section or tool\noutput on demand. Use ki-accordion for related disclosures."
    },
    "ki-dialog": {
      "description": "A modal dialog for an interrupting decision or a focused task.",
      "events": {
        "ki-close": "Requests dismissal on fullscreen Escape or activation of the header\nclose button. Prevent the default on that cancelable event to keep the\nmodal open. The button reports `method` and Escape reports `escape`.\nEvery other dismissal path emits a noncancelable notification after close\nand focus restoration. Use `open` to observe the modal's live state.",
        "ki-confirm": "The user activated the confirmation button. Handle validation, submission\nand dismissal in the application."
      },
      "props": {
        "close-label": {
          "type": "string",
          "description": "Accessible name for the fullscreen close button. Localize it or describe\nthe effect of dismissing, for example \"Discard and close\".",
          "default": "Close"
        },
        "close-on-backdrop": {
          "type": "boolean",
          "description": "Opts into backdrop light-dismiss. Omit this attribute for critical\nconfirmations; `close-on-backdrop=\"false\"` still enables it.\nWhen to use: low-risk dialogs where an outside click may safely dismiss.\nWhen NOT to use: destructive confirmations or decisions that should not be\nlost to a stray click; omit the attribute entirely rather than setting it\nto `\"false\"`.",
          "default": false
        },
        "confirm-label": {
          "type": "string",
          "description": "Label for the optional confirmation button. Use an action verb such as\n\"Save\". The button is in the fullscreen header or the centered footer."
        },
        "fullscreen": {
          "type": "enum",
          "values": [
            "always",
            "compact",
            "never"
          ],
          "description": "Layout for the native modal. Use `compact` to fill windows narrower than\n600 CSS pixels, or `always` to fill any window. Use `never` for a centered\ndialog at every width.",
          "default": "never"
        },
        "heading": {
          "type": "string",
          "description": "Visible dialog title and accessible-name source. Always provide a heading;\nan empty value intentionally leaves the native dialog unnamed.\nWhen to use: name the interrupting decision, for example \"Delete\naccount?\". When NOT to use: do not omit it for production dialogs; APG\nmodal dialogs require an accessible name.",
          "required": true
        },
        "open": {
          "type": "boolean",
          "description": "Reflected live modal state. Add it or call `show()` to open; remove it or\ncall `close()` to close. When open, the native dialog enters the top layer\nand the page behind is inert.\nWhen to use: bind application state to the dialog's modal lifecycle.\nWhen NOT to use: do not set the internal native `<dialog open>` attribute;\nthe host attribute is the only public source of truth.",
          "default": false
        }
      },
      "slots": {
        "": "Dialog body content.",
        "footer": "Dialog actions. Dismiss using an invoker command or `close()`."
      },
      "tag": "ki-dialog",
      "whenNotToUse": "non-blocking feedback (`ki-alert`, `ki-toast`),\nsupplementary hints (`ki-tooltip`), multi-step flows that need their own\npage, menus, or pickers.",
      "whenToUse": "destructive confirmations, blocking choices, and brief\ncritical input that must be resolved before returning to the page. Always\nprovide a `heading`, place actions in the `footer` slot, wire each\ndismissal to `close()` or a close command, and in destructive confirmations put `autofocus` on\nthe least destructive action. Use `fullscreen=\"compact\"` for longer tasks\nthat need the whole window on compact screens."
    },
    "ki-divider": {
      "description": "A static, decorative rule that visually separates adjacent content.",
      "events": {},
      "props": {
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Layout axis of the rule: `horizontal` spans the available inline size\nbetween stacked content; `vertical` stretches to the cross size its\nlayout context provides, between side-by-side content. A structural\naxis, never appearance — thickness, color, end caps and gutter are\nper-theme `--ki-divider-*` tokens. An unrecognized value matches no\nstyle selector, so the divider keeps the default horizontal rendering\n(fallback by CSS construction — no validation code).",
          "default": "horizontal"
        }
      },
      "slots": {},
      "tag": "ki-divider",
      "whenNotToUse": "between list items (separation is a ki-list theme-token\ndecision), semantic thematic breaks in running prose (native `<hr>`\ncarries those semantics — the divider is deliberately decorative and\ncontributes no role, name or announcement), as a border or outline\nsubstitute (surface/border tokens), or purely decorative flourishes\n(prefer white space).",
      "whenToUse": "visually separate adjacent content when spacing alone is not\nenough: grouped settings sections, toolbar action groups, distinct\nregions inside a card — horizontal between stacked content, vertical\nbetween side-by-side content."
    },
    "ki-drawer": {
      "description": "An edge-aligned sheet for a focused task that keeps the current page in context.",
      "events": {
        "ki-close": "Requests dismissal before the drawer closes. Call preventDefault() to keep it open,\nfor example when edits are unsaved. The event carries the reason in detail.reason."
      },
      "props": {
        "close-label": {
          "type": "string",
          "description": "Accessible name for the built-in Close button. Translate this for localized interfaces.",
          "default": "Close"
        },
        "heading": {
          "type": "string",
          "description": "Title and accessible name. Provide a heading whenever the drawer opens.",
          "required": true
        },
        "modal": {
          "type": "boolean",
          "description": "Makes the page behind the sheet inert. Set modal=\"false\" for continued page interaction.",
          "default": true
        },
        "open": {
          "type": "boolean",
          "description": "Reflected live state. Setting it to false requests dismissal and may be vetoed.",
          "default": false
        },
        "placement": {
          "type": "enum",
          "values": [
            "bottom",
            "end",
            "start"
          ],
          "description": "Logical edge. Use bottom for an action sheet with a swipe handle. Unknown values use end.",
          "default": "end"
        },
        "size": {
          "type": "string",
          "description": "Optional CSS length. Overrides the 18rem themed width or bottom height cap."
        }
      },
      "slots": {
        "": "The drawer's content, such as fields or a short list of actions.",
        "footer": "Optional actions such as Save. Wire these in the application.",
        "header-actions": "Optional actions between the heading and Close button."
      },
      "tag": "ki-drawer",
      "whenNotToUse": "Menus, hover hints, permanent navigation, or work that needs a\nfull page. For a short interrupting decision in the center, use ki-dialog.",
      "whenToUse": "Edit an item beside its list or offer a short set of actions in a\nbottom sheet. Supply a heading and wire slotted actions in the application.\nUse non-modal mode if people need to interact with the page while editing."
    },
    "ki-empty-state": {
      "description": "A short explanation and next step for an empty view.",
      "events": {},
      "props": {
        "announce": {
          "type": "boolean",
          "description": "Put the heading and description in a polite status, with actions outside\nthe region. Set before mounting a message that reports changed results.",
          "default": false
        },
        "heading": {
          "type": "string",
          "description": "Localized heading that identifies the empty view. Blank text omits the heading.",
          "required": true
        },
        "heading-level": {
          "type": "number",
          "description": "Native heading level for the surrounding document outline. Only integers\nfrom 2 through 6 are valid; unsupported values use level 3.",
          "default": 3,
          "minimum": 2,
          "maximum": 6
        },
        "icon-name": {
          "type": "string",
          "description": "Optional decorative Lucide glyph. Register it with a per-icon import before\nmounting. A supplied illustration takes precedence."
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Use small inside a table or narrow panel. Unrecognized sizes use the medium layout.",
          "default": "md"
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "info",
            "neutral",
            "primary",
            "primary-light",
            "success",
            "warning"
          ],
          "description": "FeatureIcon tone. Unrecognized tones use the neutral tile.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Localized supporting text with a reason or recovery advice.",
        "actions": "Optional controls for the next step, with at most one\nprimary action. In a guarded surface, bind actions to these controls.",
        "media": "Optional decorative illustration in place of the icon. Use\nan image with empty alt text or a decorative SVG. Keep this slot free of controls."
      },
      "tag": "ki-empty-state",
      "whenNotToUse": "signal that results are loading or draw attention to an error\nthat needs acknowledgement. Use ki-spinner or ki-alert for those states.",
      "whenToUse": "explain an empty list, table, search result, or first-run view.\nSupply a localized heading that names what is empty and a short next step.\nUse announce for results that change after an interaction."
    },
    "ki-fab": {
      "description": "The primary action of a screen, as an icon or an extended control with a visible label.",
      "events": {
        "click": "Native activation click. The page or guarded renderer handles the declared action."
      },
      "props": {
        "collapse-on-scroll": {
          "type": "boolean",
          "description": "Compact an extended FAB on viewport scroll down and restore on scroll up.",
          "default": false
        },
        "extended": {
          "type": "boolean",
          "description": "Show the action label next to its icon.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "A nonempty destination renders an anchor. Relative URLs and fragments retain native resolution.",
          "format": "url"
        },
        "icon-name": {
          "type": "string",
          "description": "Registered Lucide name. Import the icon module before rendering. The icon slot takes precedence."
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the action. Also the visible text in the extended state.",
          "required": true
        },
        "position": {
          "type": "enum",
          "values": [
            "fixed",
            "static"
          ],
          "description": "Fixed sits at the viewport's block-end inline-end corner. Reserve page clearance there.",
          "default": "static"
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "xl"
          ],
          "description": "Square footprint when icon-only, and minimum size when extended.",
          "default": "md"
        },
        "variant": {
          "type": "enum",
          "values": [
            "primary",
            "secondary",
            "surface"
          ],
          "description": "Surface and ink: strong primary, tinted secondary or raised surface.",
          "default": "secondary"
        }
      },
      "slots": {
        "icon": "Decorative, noninteractive icon replacing the named glyph."
      },
      "tag": "ki-fab",
      "whenNotToUse": "for secondary or destructive actions, for multiple actions on the same screen, or on a desktop screen that already has a visible primary ki-button.",
      "whenToUse": "give a mobile screen one primary action, such as composing a draft or creating a project. Supply a descriptive label and a registered icon or decorative icon slot. Reserve page clearance for fixed placement, and leave the action binding unset for native link navigation."
    },
    "ki-fab-menu": {
      "description": "An icon FAB that opens two to six related actions above its trigger.",
      "events": {
        "ki-select": "Emits the selected item's value or its trimmed label. Native links retain their destination."
      },
      "props": {
        "close-label": {
          "type": "string",
          "description": "Localized accessible name of the trigger when it becomes the close control.",
          "default": "Close menu"
        },
        "icon-name": {
          "type": "string",
          "description": "Registered Lucide glyph for the closed trigger. The plus glyph ships with the component.",
          "default": "plus"
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the closed trigger and of the menu.",
          "required": true
        },
        "open": {
          "type": "boolean",
          "description": "Whether the action stack is open. Reflected when the user opens or dismisses it.",
          "default": false
        },
        "position": {
          "type": "enum",
          "values": [
            "fixed",
            "static"
          ],
          "description": "Static anchors to the host. Fixed anchors to the viewport's block-end inline-end corner.",
          "default": "static"
        },
        "scrim": {
          "type": "boolean",
          "description": "Dim the viewport and dismiss on a scrim click. Use the boolean property or scrim=\"false\" to opt out.",
          "default": true
        },
        "variant": {
          "type": "enum",
          "values": [
            "primary",
            "secondary",
            "surface"
          ],
          "description": "Closed FAB surface. The open trigger always uses primary.",
          "default": "secondary"
        }
      },
      "slots": {
        "": "Two to six direct ki-fab-menu-item children, in top-to-bottom order."
      },
      "tag": "ki-fab-menu",
      "whenNotToUse": "for a single primary action, long lists, or site navigation.",
      "whenToUse": "group related creation or screen actions behind one floating button."
    },
    "ki-fab-menu-item": {
      "description": "A labeled command or native link within a floating action menu.",
      "events": {
        "ki-select": "Local command selection for a direct action binding. Links use native navigation."
      },
      "props": {
        "href": {
          "type": "string",
          "description": "A nonempty destination renders a native link and preserves relative URL resolution.",
          "format": "url"
        },
        "icon-name": {
          "type": "string",
          "description": "Registered Lucide glyph. Import the desired icon before rendering."
        },
        "value": {
          "type": "string",
          "description": "Stable selection identifier. When omitted, the menu reports the trimmed visible label."
        }
      },
      "slots": {
        "": "The visible action label."
      },
      "tag": "ki-fab-menu-item",
      "whenNotToUse": "for a standalone action, a form control, or a container of interactive content.",
      "whenToUse": "as a direct child of ki-fab-menu, with a short, visible action label."
    },
    "ki-feature-icon": {
      "description": "A decorative glyph centered on a tinted tile.",
      "events": {},
      "props": {
        "shape": {
          "type": "enum",
          "values": [
            "circle",
            "square"
          ],
          "description": "Rounded square or circle. Unknown values use square.",
          "default": "square"
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Tile size. At a 16px root, the steps are 24, 32, 40, 48 and 64px. Unknown values use md.",
          "default": "md"
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "info",
            "neutral",
            "primary",
            "primary-light",
            "success",
            "warning"
          ],
          "description": "Colour pair for the tile and its glyph. Unknown values use neutral.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "One Lucide glyph. Supply an inline SVG using currentColor or a ki-icon with inherited size. Guarded surfaces use a registered ki-icon."
      },
      "tag": "ki-feature-icon",
      "whenNotToUse": "For an action (use ki-icon-button), a status (use ki-badge),\nor the sole label of a section.",
      "whenToUse": "Place a decorative icon beside the visible heading of a feature,\nempty state or settings section. The heading carries the meaning."
    },
    "ki-file-upload": {
      "description": "A form-associated picker and drop zone with local selection validation and a\nlist of file upload outcomes.",
      "events": {
        "ki-file-cancel": "Requests that the application cancel the identified upload.",
        "ki-file-remove": "Reports a row removed by the user, after updating the file list.",
        "ki-files-add": "Reports the accepted rows in one picker or drop batch, each with its original File."
      },
      "props": {
        "accept": {
          "type": "string",
          "description": "Comma-separated extensions, MIME types and MIME wildcards allowed in new selections."
        },
        "browse-label": {
          "type": "string",
          "description": "Visible text of the native file picker button.",
          "default": "Browse files"
        },
        "cancel-label": {
          "type": "string",
          "description": "Accessible name template for cancellation. Use {file} for the displayed filename.",
          "default": "Cancel upload of {file}"
        },
        "count-error": {
          "type": "string",
          "description": "Rejection text for a file beyond selection capacity.",
          "default": "Too many files."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables the picker and file actions and excludes the field from submission.",
          "default": false
        },
        "done-label": {
          "type": "string",
          "description": "Status text for a completed upload.",
          "default": "Uploaded"
        },
        "drop-label": {
          "type": "string",
          "description": "Drop instruction shown just before the Browse button.",
          "default": "Drop files here or"
        },
        "error-text": {
          "type": "string",
          "description": "Application validation error. Clear it to allow form submission again."
        },
        "failed-label": {
          "type": "string",
          "description": "Fallback status text for a failed upload without a supplied error.",
          "default": "Upload failed."
        },
        "help-text": {
          "type": "string",
          "description": "Guidance for file formats, limits or the purpose of this field."
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible name of the upload group.",
          "default": "Upload files"
        },
        "list-label": {
          "type": "string",
          "description": "Accessible name of the list of files.",
          "default": "Files"
        },
        "max-files": {
          "type": "number",
          "description": "Maximum accepted local files as a nonnegative integer. Single-file mode also caps this at one."
        },
        "max-size": {
          "type": "string",
          "description": "Maximum size per selected file in bytes or decimal B, KB, MB or GB, such as \"10MB\"."
        },
        "multiple": {
          "type": "boolean",
          "description": "Allows a selection of more than one file.",
          "default": false
        },
        "name": {
          "type": "string",
          "description": "Form-data key repeated for each accepted original file."
        },
        "queued-label": {
          "type": "string",
          "description": "Status text for an accepted file waiting to upload.",
          "default": "Queued"
        },
        "remove-label": {
          "type": "string",
          "description": "Accessible name template for removal. Use {file} for the displayed filename.",
          "default": "Remove {file}"
        },
        "required": {
          "type": "boolean",
          "description": "Requires at least one original accepted file to submit the form.",
          "default": false
        },
        "required-label": {
          "type": "string",
          "description": "Visible annotation for a required file field.",
          "default": "Required"
        },
        "required-message": {
          "type": "string",
          "description": "Validation message when the form requires a file and none is selected.",
          "default": "Select a file."
        },
        "size-error": {
          "type": "string",
          "description": "Rejection text for a file larger than max-size.",
          "default": "This file is too large."
        },
        "type-error": {
          "type": "string",
          "description": "Rejection text for a file that does not match accept.",
          "default": "This file type is not allowed."
        },
        "uploading-label": {
          "type": "string",
          "description": "Progress indicator name template. Use {file} for the displayed filename.",
          "default": "Uploading {file}"
        }
      },
      "slots": {
        "help": "Plain-language guidance for the picker, in place of help-text."
      },
      "tag": "ki-file-upload",
      "whenNotToUse": "transfer files without an application handler, collect a URL,\nor use client-side type and size checks as upload authorization.",
      "whenToUse": "collect local attachments, media or imports, and optionally show\napplication-managed upload progress and results."
    },
    "ki-format-date": {
      "description": "Displays an ISO date or timestamp in the reader's language.",
      "events": {},
      "props": {
        "date": {
          "type": "string",
          "description": "ISO calendar date (YYYY-MM-DD) or ISO date-time. A timestamp without an offset uses local time."
        },
        "date-style": {
          "type": "enum",
          "values": [
            "full",
            "long",
            "medium",
            "short"
          ],
          "description": "Date detail. Defaults to medium when neither date style nor time style is supplied."
        },
        "lang": {
          "type": "string",
          "description": "Language tag for the formatted date. Inherits the nearest HTML lang declaration when omitted."
        },
        "time-style": {
          "type": "enum",
          "values": [
            "full",
            "long",
            "medium",
            "short"
          ],
          "description": "Time detail. Omit to show the date alone."
        },
        "time-zone": {
          "type": "string",
          "description": "IANA time zone for a timestamp. A calendar date keeps its day in every zone."
        }
      },
      "slots": {},
      "tag": "ki-format-date",
      "whenNotToUse": "For an editable date or an elapsed time that should change as the clock advances.",
      "whenToUse": "For raw date and timestamp values in tables, records and prose."
    },
    "ki-format-number": {
      "description": "Displays a raw number using local number conventions and tabular figures.",
      "events": {},
      "props": {
        "currency": {
          "type": "string",
          "description": "ISO 4217 currency code, such as EUR. Selects currency output when format-style is omitted."
        },
        "format-style": {
          "type": "enum",
          "values": [
            "decimal",
            "percent",
            "unit"
          ],
          "description": "Decimal, percent or unit output. Without this option, currency selects currency output and other values use decimal."
        },
        "maximum-fraction-digits": {
          "type": "number",
          "description": "Maximum number of fraction digits.",
          "minimum": 0
        },
        "minimum-fraction-digits": {
          "type": "number",
          "description": "Minimum number of fraction digits.",
          "minimum": 0
        },
        "notation": {
          "type": "enum",
          "values": [
            "compact"
          ],
          "description": "Use compact notation for abbreviated large numbers. Omit for standard notation."
        },
        "unit": {
          "type": "string",
          "description": "Intl unit identifier, such as celsius or kilometer. Use with format-style=\"unit\"."
        },
        "value": {
          "type": "number",
          "description": "Raw finite number. A percent uses a ratio, so 0.49 displays as 49%."
        }
      },
      "slots": {},
      "tag": "ki-format-number",
      "whenNotToUse": "For numeric input or values that already include localized formatting.",
      "whenToUse": "For numeric data, currency amounts, ratios and measurements in content."
    },
    "ki-grid": {
      "description": "A passive responsive grid for content items.",
      "events": {},
      "props": {
        "columns": {
          "type": "number",
          "description": "Positive whole track count. Below 30rem of available inline size the fixed\ngrid uses one column. Omit columns for automatic tracks.",
          "minimum": 1
        },
        "gap": {
          "type": "enum",
          "values": [
            "10xl",
            "11xl",
            "12xl",
            "13xl",
            "14xl",
            "15xl",
            "16xl",
            "17xl",
            "18xl",
            "19xl",
            "20xl",
            "21xl",
            "22xl",
            "23xl",
            "24xl",
            "25xl",
            "26xl",
            "2xl",
            "3xl",
            "4xl",
            "5xl",
            "6xl",
            "7xl",
            "8xl",
            "9xl",
            "lg",
            "md",
            "sm",
            "xl",
            "xs",
            "xxs",
            "zero"
          ],
          "description": "Kimen spacing step, xl by default. Unsupported values keep the default gap.",
          "default": "xl"
        },
        "min-column": {
          "type": "string",
          "description": "Minimum automatic track size as a CSS length. Defaults to 15rem and is ignored with fixed columns.",
          "default": "15rem"
        }
      },
      "slots": {
        "": "The content in reading order. A direct child with data-span=\"2\" spans two tracks when they fit."
      },
      "tag": "ki-grid",
      "whenNotToUse": "for page shells, painted grouping (use ki-card), or a data grid.",
      "whenToUse": "lay out items on responsive tracks with consistent token spacing."
    },
    "ki-icon": {
      "description": "A static Lucide glyph selected by name from the application's per-icon imports.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name for a meaningful glyph. Omit it when nearby text already conveys the meaning."
        },
        "name": {
          "type": "string",
          "description": "Lucide name made available by a per-icon import. An unavailable name draws no glyph.",
          "required": true
        },
        "size": {
          "type": "enum",
          "values": [
            "inherit",
            "lg",
            "md",
            "sm"
          ],
          "description": "Glyph size. Inherit follows the surrounding text at 1em.",
          "default": "inherit"
        }
      },
      "slots": {},
      "tag": "ki-icon",
      "whenNotToUse": "make an icon interactive, accept arbitrary SVG or URLs, or\nreplace the accessible name of a control. Use the control's own label.",
      "whenToUse": "show a named glyph next to text, or give a standalone meaningful\nglyph an accessible label. Import `@kimen/elements/icons/<name>` before\nmounting the component or rendering a guarded surface."
    },
    "ki-icon-button": {
      "description": "A token-styled, icon-only action button with native button semantics and a\nmandatory accessible name.",
      "events": {
        "ki-change": "Emitted after toggle activation with the new selected state."
      },
      "props": {
        "command": {
          "type": "enum",
          "values": [
            "close",
            "request-close",
            "show-modal"
          ],
          "description": "Dialog action to run for `commandfor`. Use `show-modal` to open,\n`close` for direct dismissal, or `request-close` for guarded dismissal.\nChoose a command for local dialog control and omit it for other actions."
        },
        "commandfor": {
          "type": "string",
          "description": "ID of a ki-dialog in the same document or shadow tree as this button.\nSet it together with `command` to connect a dialog declaratively."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the icon button from keyboard reach, and\nexposes the unavailable state through the internal native button. Wins\nover `loading` when both are set.\nWhen NOT to use: do not use disabled for pending/loading semantics; use\n`loading`.",
          "default": false
        },
        "expanded": {
          "type": "boolean",
          "description": "Application-owned disclosure state for a trigger that opens a popup.\nThe native icon button exposes this as `aria-expanded`. Use with\n`aria-haspopup=\"menu\"` for a menu trigger. Omit for other actions."
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the internal focusable button (\"Close\", \"Play\").\nRequired in the catalog. When slotted as a trailing list control, the\nrow text supplies a fallback through the host aria-label.\nUse ki-button when the action has a visible label.",
          "required": true
        },
        "loading": {
          "type": "boolean",
          "description": "Pending state of the action this icon button started (refreshing,\nsending). While set, every activation is blocked (pointer, Enter and\nSpace), but the icon button stays focusable, in the Tab order and at its\nsize: the icon stays laid out, transparent, and a spinner is drawn in its\nplace. The internal native button is exposed with `aria-disabled=\"true\"`\nand keeps its `label`, and `loadingLabel` is announced as a polite status\nmessage. `disabled` wins over it. The application sets it when the\naction starts and clears it when the action ends.\nWhen to use: while the work a click on this icon button started is\nrunning, so a second activation cannot repeat it.\nWhen NOT to use: for an icon button the person cannot use yet (use\n`disabled`), or for the progress of a page or region (use ki-progress).",
          "default": false
        },
        "loading-label": {
          "type": "string",
          "description": "Text of the polite status message announced while `loading` is set.\nOverride for localization; the default English string is the icon\nbutton's only built-in user-visible text.\nWhen to use: provide a localized message whenever the document language\nis not English, or a more specific one (\"Refreshing\").\nWhen NOT to use: do not repeat `label` here; the person already hears it\non focus.",
          "default": "Loading"
        },
        "pressed": {
          "type": "boolean",
          "description": "Application-owned toggle state. The native icon button exposes this as\n`aria-pressed` when `toggle` is off. Omit for a momentary action."
        },
        "selected": {
          "type": "boolean",
          "description": "Current press state in toggle mode. Set this to initialize or synchronize\nthe state programmatically without emitting a change.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed square size. Every size keeps at least the 24×24 minimum\npointer target (`xs` sits exactly on it); choose the size that matches\nthe density of the surrounding UI.\nWhen NOT to use: do not shrink below `xs` through tokens; no theme may\ngo under the WCAG 2.2 pointer-target floor.",
          "default": "md"
        },
        "toggle": {
          "type": "boolean",
          "description": "Enables persistent press state for an action such as Bookmark. The\nnative button exposes `aria-pressed` and each activation switches\n`selected`. Keep the same accessible label in both states.",
          "default": false
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "success"
          ],
          "description": "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions. Toggle\npalettes are specific to the variant.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.",
          "default": "neutral"
        },
        "variant": {
          "type": "enum",
          "values": [
            "ghost",
            "outline",
            "primary",
            "quaternary",
            "secondary"
          ],
          "description": "Visual hierarchy for the action. Use filled `primary` for the single main\naction, outlined `secondary` for supporting actions, `quaternary` for\nneutral icon actions, `ghost` for accent icon actions and `outline` for\nan unfilled action with a visible boundary.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.",
          "default": "secondary",
          "deprecatedValues": [
            "tertiary"
          ]
        }
      },
      "slots": {
        "": "Exactly one decorative icon. The slot is presentational: its\ncontent is hidden from assistive technology and never contributes to the\naccessible name. Supply `label` or use a named trailing list control.",
        "counter": "Decorative ki-counter in the block-start inline-end corner.\nInclude its meaning in the button label.",
        "selected": "Optional decorative icon shown when the toggle is selected.\nIf omitted, the default icon stays visible and an inline SVG takes a current-colour fill."
      },
      "tag": "ki-icon-button",
      "whenNotToUse": "whenever a visible label fits (use ki-button),\nnavigation (use a link), or form\nsubmit/reset (ki-icon-button is not form-associated; use ki-button, whose\nvisible label communicates the consequence).",
      "whenToUse": "a compact, widely understood action where space precludes a\nvisible label: toolbars, card and dialog corners (close), media transport,\ndata-row actions. Always supply `label`; usually pair with ki-tooltip for\nsighted discoverability. Enable `toggle` for persistent actions such as\nBookmark. While the action it started is in progress, set `loading`."
    },
    "ki-image": {
      "description": "Displays one accessible image in a reserved frame, with an optional caption\nand a fallback if the source is refused or fails to load.",
      "events": {
        "ki-error": "Reports a load failure or rejected URL once per source attempt. Bubbles\nand crosses shadow boundaries so consumers can observe it on a surface."
      },
      "props": {
        "alt": {
          "type": "string",
          "description": "Describe what the image shows for the task at hand. Required and nonblank\nfor an informative image. Omit it for a decorative image."
        },
        "decorative": {
          "type": "boolean",
          "description": "Hide the media from assistive technology when it conveys no information.",
          "default": false
        },
        "fallback-label": {
          "type": "string",
          "description": "Localizable fallback label. An informative fallback appends the image's\ndescription, when available, to this label.",
          "default": "Image unavailable"
        },
        "fit": {
          "type": "enum",
          "values": [
            "contain",
            "cover"
          ],
          "description": "Cover fills the frame. Contain preserves the whole image in it.",
          "default": "cover"
        },
        "loading": {
          "type": "enum",
          "values": [
            "eager",
            "lazy"
          ],
          "description": "Native loading hint. Use eager for a critical image above the fold.",
          "default": "lazy"
        },
        "radius": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "none"
          ],
          "description": "Corner radius of the media frame.",
          "default": "lg"
        },
        "ratio": {
          "type": "enum",
          "values": [
            "16:9",
            "1:1",
            "3:2",
            "4:3",
            "auto"
          ],
          "description": "An explicit ratio reserves the same frame before load and on failure.\nAuto reserves 16:9 first and uses the intrinsic ratio after load.",
          "default": "auto"
        },
        "src": {
          "type": "string",
          "description": "Relative or HTTP(S) image URL. Refused sources are left unloaded.",
          "required": true,
          "format": "url"
        }
      },
      "slots": {
        "caption": "Optional visible context displayed below the media in a figcaption."
      },
      "tag": "ki-image",
      "whenNotToUse": "for a background decoration, a video, or an interactive\ncontrol. Use a separate control to open or otherwise act on an image.",
      "whenToUse": "to show a photo, illustration, or diagram with a predictable\nlayout. Supply task-relevant alt text, or mark purely decorative media as\ndecorative. Set an explicit ratio when the layout must stay fixed."
    },
    "ki-indicator": {
      "description": "A non-interactive page-position indicator: one dot per position of a\nbounded sequence, exactly one highlighted as current.",
      "events": {},
      "props": {
        "count": {
          "type": "number",
          "description": "Number of positions (non-negative integer): one dot renders per\nposition, in position order. A missing, non-numeric or negative value\nrenders zero dots — an authoring mistake by catalog guidance, never an\nerror state or a rendering failure (FR-002; empty ki-list precedent).\nAt most 20 positions render, and the catalog accepts no more: the\nindicator serves a short sequence of peer views, 20 dots are the longest\nrow that fits a 320 CSS px viewport (the WCAG reflow width) in both\nshipped themes, and one dot renders per position, so the bound also caps\nthe work a single node can demand. A larger value renders 20.",
          "minimum": 0,
          "maximum": 20
        },
        "current": {
          "type": "number",
          "description": "The current position, 1-based to match the exposed position text\n(\"2 / 5\"). Exactly one dot presents the current appearance whenever\n`count` >= 1: values above `count` clamp to the last position, values\nbelow 1 and non-numeric values fall back to the first (FR-003). Updates\nre-render in place — the highlight and the exposed text follow\nimmediately, re-applying the normalization (FR-004). The catalog accepts\n1 to 20, the positions a bounded `count` can have.",
          "minimum": 1,
          "maximum": 20
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the sequence (\"Slide position\"). The exposed name\ncombines it with the wordless numeric position —\n\"<label>, <current> / <count>\" — on a single non-interactive graphic;\nwithout a label the name degrades to the bare position text (documented\nas required authoring, FR-005). The label is never rendered visually\nand position changes are never announced (no live region, FR-006).",
          "required": true
        }
      },
      "slots": {},
      "tag": "ki-indicator",
      "whenNotToUse": "section navigation (ki-tabs), task completion or loading\n(ki-progress), labeled step flows (a stepper is a separate roadmap item),\ninteractive pagination (a future feature — the indicator takes no focus\nand no input; navigation belongs to the composing carousel's own\ncontrols), or conveying quantity without a current position. Position\nchanges are never announced by the indicator itself (no live region): the\ncomposing carousel owns announcements.",
      "whenToUse": "show the current position within a bounded, sequential set of\npeer views whose navigation lives elsewhere: carousel slides, unlabeled\nonboarding steps, gallery pages. Wire `count` and `current` (1-based) to\nthe sequence the consumer renders and give it a `label` (required\nauthoring: assistive technology reads one graphic named\n\"<label>, <current> / <count>\"). Below two positions an indicator carries\nno information."
    },
    "ki-input": {
      "description": "A token-styled single-line text field with native input semantics.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired when the user commits an edited value (native text-field\ntiming, such as on blur), composed across the shadow boundary; `value` is\nalready current when listeners run. When to use: react to a committed\nvalue. When NOT to use: do not use it for per-keystroke updates; the native\n`input` event carries those."
      },
      "props": {
        "ai-suggestion-text": {
          "type": "string",
          "description": "Localized provenance description read alongside help or an error when\nthe end slot contains an AI label. Use this to translate the description.",
          "default": "Suggested by AI"
        },
        "appearance": {
          "type": "enum",
          "values": [
            "default",
            "filled",
            "outlined"
          ],
          "description": "Field appearance. `default` uses the current theme, `outlined` draws a\nfull border, and `filled` uses a tinted surface and bottom indicator.\nThe visible label stays above the field.\nWhen to use: set an explicit appearance when fields must share a shape\nacross themes.",
          "default": "default"
        },
        "autocomplete": {
          "type": "string",
          "description": "Native autocomplete detail token forwarded to the internal input.\nWhen NOT to use: omit when no autofill entry purpose is known."
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side or cross-field\nverdict on the submitted answer (\"Already registered\"). While it holds\ntext the field is invalid, blocks its form, shows the text in place of\nthe help text at once and is announced as invalid. It stops counting at\nthe person's next change of the answer, or when the form is reset, so it\nnever blocks the corrected answer. It outranks `error-text` and an error\nset with `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required` or other constraints the\nfield enforces itself; `error-text` words those. Setting the same text\nagain while the prop still holds it shows nothing: remove it first, then\nset it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents editing, removes the field from keyboard reach and exposes the\nunavailable state through the internal native input.\nWhen NOT to use: do not use disabled for readonly reference values.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message shown in place of the help text once the person's answer fails a\nconstraint (`required`, `type` or a length limit), and the field's `validationMessage`. Say\nhow to fix the answer (\"Enter an email address like name@example.com\").\nWithout it the browser's own message shows, in the browser's language. An\nerror set with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those."
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the field, read with it as its description: the\nformat expected, or why the answer is asked. While an error shows, the\nerror takes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`."
        },
        "label": {
          "type": "string",
          "description": "Visible label rendered next to the entry area and used as the accessible\nname. This is mandatory for valid usage.\nWhen NOT to use: never use `placeholder` as a label substitute.",
          "required": true
        },
        "label-hint": {
          "type": "string",
          "description": "Short text shown after the label and read with it as part of the field's\nname, so people know before submitting whether to answer: \"(optional)\" on\nthe few optional fields of a mostly required form, or \"(required)\" the\nother way round, in the page's own language. It changes no validation;\nset `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions or formats in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label."
        },
        "maxlength": {
          "type": "number",
          "description": "Native maximum length in UTF-16 code units. The input prevents user entry\npast this limit.\nWhen to use: cap the number of characters people can enter.",
          "minimum": 0,
          "maximum": 2147483647
        },
        "minlength": {
          "type": "number",
          "description": "Native minimum length in UTF-16 code units for a nonempty user edit.\nWhen to use: require a minimum number of characters in an answer.",
          "minimum": 0,
          "maximum": 2147483647
        },
        "name": {
          "type": "string",
          "description": "Form-data key for the submitted value.\nWhen NOT to use: omit when the field must not contribute named form data."
        },
        "placeholder": {
          "type": "string",
          "description": "Hint shown when the field is empty.\nWhen NOT to use: do not use placeholder as the accessible name."
        },
        "readonly": {
          "type": "boolean",
          "description": "Makes the value focusable and selectable while rejecting edits.\nWhen NOT to use: use `disabled` when the value must be unavailable and\nexcluded from forms.",
          "default": false
        },
        "required": {
          "type": "boolean",
          "description": "Marks the field as required for native constraint validation.\nWhen NOT to use: do not use required on optional fields.",
          "default": false
        },
        "show-count": {
          "type": "boolean",
          "description": "Shows the current count and maximum next to the help or error text and\nannounces reaching or exceeding the limit. Requires `maxlength`.\nWhen to use: give people feedback while writing to a limit.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed field size (`--ki-input-{size}-*` tokens): the field box is\n24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and\nicon box; the label and help text follow in three steps. An unrecognized\nvalue matches no style rule and keeps the medium metrics.\nWhen to use: match the size of the buttons and fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "type": {
          "type": "enum",
          "values": [
            "email",
            "password",
            "search",
            "tel",
            "text",
            "url"
          ],
          "description": "Entry kind with native single-line input semantics. Unknown runtime\nvalues fall back to `text`; `number` is not a v1 input kind.\nWhen NOT to use: use future numeric controls for locale-aware number entry.",
          "default": "text"
        },
        "value": {
          "type": "string",
          "description": "Live text value. The attribute declares the initial default; the property\nis the current value and programmatic assignments are silent.\nDeviation from native (deliberate, research D2): assigning the ATTRIBUTE\nprogrammatically also replaces the displayed value, silently — native\ninputs would keep the user's dirty value. Form reset restores the\nattribute's current value.\nWhen NOT to use: do not observe user edits by polling; listen for `input`\nand `change` (both re-dispatched composed across the shadow boundary).",
          "default": ""
        }
      },
      "slots": {
        "action": "One small submit action inside the field after the end adornment.\nUse for one-field forms such as search or subscribe. Place a named\n`ki-button size=\"sm\" type=\"submit\"` here, or wire a labeled\n`ki-icon-button size=\"sm\"` to request form submission. The action has its own tab\nstop. Use the end slot for clear or reveal controls.",
        "end": "Trailing icon or text affix inside the field. Follows writing direction.\nA directly slotted AI label also describes the field as suggested by AI.",
        "start": "Leading icon or text affix inside the field. Follows writing direction."
      },
      "tag": "ki-input",
      "whenNotToUse": "multiline text, predefined choices, boolean state, numeric\nstepper entry, or placeholder-only labeling.",
      "whenToUse": "collect one line of free text from a person, always with a\nvisible `label`; choose the `type` and `autocomplete` that match the entry\npurpose."
    },
    "ki-link": {
      "description": "A native navigation link with Kimen ink, underline, and focus styles.",
      "events": {},
      "props": {
        "download": {
          "type": "string",
          "description": "Native download attribute. Set it to an empty string to let the browser\nchoose the file name, or supply a suggested file name."
        },
        "external": {
          "type": "boolean",
          "description": "Requests a new tab with noopener and adds an icon and an accessible\nannouncement. An explicit download still follows native download rules.",
          "default": false
        },
        "external-label": {
          "type": "string",
          "description": "Localizable text appended to the accessible name in external mode.",
          "default": "(opens in a new tab)"
        },
        "href": {
          "type": "string",
          "description": "Destination URL. Relative URLs and fragments use native anchor resolution.",
          "required": true,
          "format": "url"
        },
        "rel": {
          "type": "string",
          "description": "Space-separated native link relationships. External links always include noopener."
        },
        "target": {
          "type": "string",
          "description": "Native browsing-context name. External links use _blank."
        },
        "underline": {
          "type": "enum",
          "values": [
            "always",
            "hover"
          ],
          "description": "Keep the underline in running text. Use hover for standalone navigation,\nwhere placement identifies the link and keyboard focus still underlines it.",
          "default": "always"
        },
        "variant": {
          "type": "enum",
          "values": [
            "neutral",
            "primary"
          ],
          "description": "Ink role. Primary uses accent ink and neutral uses body ink.",
          "default": "primary"
        }
      },
      "slots": {
        "": "Descriptive link text. Use phrasing content without nested interactive controls."
      },
      "tag": "ki-link",
      "whenNotToUse": "perform an action on the current page. Use ki-button variant=\"ghost\" for that.",
      "whenToUse": "navigate to a page, section, or resource. Use a descriptive label and keep the default underline in running text. Leave the action binding unset for native navigation."
    },
    "ki-list": {
      "description": "A vertical list of read-only entries, navigation links, settings controls,\nor options in a single- or multiple-selection listbox.",
      "events": {
        "ki-change": "Fires once per user selection change, after updating the form value."
      },
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name for a list with links, options or trailing controls."
        },
        "name": {
          "type": "string",
          "description": "Form field name. Multiple selection submits repeated entries under this name."
        },
        "required": {
          "type": "boolean",
          "description": "Requires at least one enabled choice in a selection list.",
          "default": false
        },
        "selection": {
          "type": "enum",
          "values": [
            "multiple",
            "none",
            "single"
          ],
          "description": "Enables single or multiple selection. The default supports static, link and control rows.",
          "default": "none"
        }
      },
      "slots": {
        "": "Direct `ki-list-item` children."
      },
      "tag": "ki-list",
      "whenNotToUse": "popup action menus, tabular data, or rows with several actions.",
      "whenToUse": "settings, contacts, results, navigation or visible choices composed\nfrom primary text, supporting text and optional media. Name interactive lists."
    },
    "ki-list-item": {
      "description": "A row inside `ki-list`, composed from leading media, primary text,\noptional secondary text and trailing content.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Excludes this option from focus, selection by the user, and form data.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "Native row link destination. Use outside selection lists, with no\nslotted interactive content.",
          "format": "url"
        },
        "selected": {
          "type": "boolean",
          "description": "Whether this row is selected in a single- or multiple-selection list.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl"
          ],
          "description": "Token-backed row size (`--ki-list-item-{size}-*` tokens): minimum height\n(48, 56, 64 or 72px with a secondary line in onmars), padding, gap and\ntext. Slotted start and end content keeps the size its author gave it.\nAn unrecognized value matches no style rule and keeps the medium metrics.\nWhen to use: give every row of one list the same size.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Submitted option value. The primary row text supplies the default."
        }
      },
      "slots": {
        "": "Primary text line.",
        "end": "Trailing media, meta text or the only control of a settings row.",
        "secondary": "Supporting text below the primary line. Its presence\nselects the multi-line min-height token.",
        "start": "Leading media such as an icon, avatar or image."
      },
      "tag": "ki-list-item",
      "whenNotToUse": "as a menu item, tabular row, or row with several actions.",
      "whenToUse": "as a direct child of `ki-list`, for a static entry, link,\nselection option, or a settings row with one control."
    },
    "ki-markdown": {
      "description": "Displays Markdown as Kimen components and native HTML semantics.",
      "events": {},
      "props": {
        "allow-images": {
          "type": "boolean",
          "description": "Render Markdown images that pass the URL policy. Otherwise show their alternative text.",
          "default": false
        },
        "heading-offset": {
          "type": "number",
          "description": "Add zero through five levels to source headings. The output stops at level six. Invalid values use two.",
          "default": 2,
          "minimum": 0,
          "maximum": 5
        },
        "src-text": {
          "type": "string",
          "description": "Markdown source. A supplied value, including an empty string, takes precedence over the default text slot."
        },
        "streaming": {
          "type": "boolean",
          "description": "Keep established blocks mounted while an answer grows. Turn it off when the source is complete.",
          "default": false
        }
      },
      "slots": {
        "": "Literal Markdown source. Set a text node or escape markup when writing HTML."
      },
      "tag": "ki-markdown",
      "whenNotToUse": "Present an editable document or apply trusted authored HTML. Use native markup for structured page content.",
      "whenToUse": "Show a formatted reply, readme excerpt or progressively received text from a person or model."
    },
    "ki-menu": {
      "description": "A popup of actions opened by a button in the same document or shadow root.",
      "events": {
        "ki-select": "Reports the selected action and, for a checkbox or radio, its new checked state."
      },
      "props": {
        "anchor": {
          "type": "string",
          "description": "Literal ID of the menu button in the same document or containing shadow root.",
          "default": "",
          "format": "idref"
        },
        "filter-label": {
          "type": "string",
          "description": "Accessible name and placeholder of the filter. Omit to hide the field.",
          "default": ""
        },
        "filter-results-label": {
          "type": "string",
          "description": "Polite results message. The menu substitutes the number of matches for `{count}`.",
          "default": "Matching actions: {count}"
        },
        "open": {
          "type": "boolean",
          "description": "Whether the popup is open. Reflected when the user opens or dismisses it.",
          "default": false
        },
        "placement": {
          "type": "enum",
          "values": [
            "bottom-end",
            "bottom-start",
            "top-end",
            "top-start"
          ],
          "description": "Preferred side and logical alignment. Flips when the opposite side has more room.",
          "default": "bottom-start"
        }
      },
      "slots": {
        "": "Place ki-menu-item, ki-menu-group, and ki-divider here.",
        "header": "Informational content above the actions, such as account details."
      },
      "tag": "ki-menu",
      "whenNotToUse": "form values, navigation destinations, or long action lists.",
      "whenToUse": "row actions, account commands, split buttons, and overflow actions."
    },
    "ki-menu-group": {
      "description": "A named group of related actions in a ki-menu.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Visible and accessible group name.",
          "default": ""
        }
      },
      "slots": {
        "": "The ki-menu-item and ki-divider children of the group."
      },
      "tag": "ki-menu-group",
      "whenNotToUse": "standalone sections or nested menus.",
      "whenToUse": "name a set of related actions or scope exclusive radio items in a menu."
    },
    "ki-menu-item": {
      "description": "A pointer and keyboard action within a ki-menu.",
      "events": {},
      "props": {
        "checked": {
          "type": "boolean",
          "description": "Checked state for checkbox and radio actions.",
          "default": false
        },
        "disabled": {
          "type": "boolean",
          "description": "Disabled actions remain discoverable via menu navigation.",
          "default": false
        },
        "shortcut": {
          "type": "string",
          "description": "Display-only keyboard shortcut. Applications own shortcut registration.",
          "default": ""
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral"
          ],
          "description": "Apply the danger tone to a destructive action.",
          "default": "neutral"
        },
        "type": {
          "type": "enum",
          "values": [
            "checkbox",
            "item",
            "radio"
          ],
          "description": "Action role. A checkbox stays open. A radio selects one action within its group.",
          "default": "item"
        },
        "value": {
          "type": "string",
          "description": "Action identifier reported by the parent menu.",
          "default": ""
        }
      },
      "slots": {
        "": "The action's visible label.",
        "start": "One decorative icon or avatar before the label."
      },
      "tag": "ki-menu-item",
      "whenNotToUse": "standalone controls, navigational links, or form options.",
      "whenToUse": "a command, independent checkbox action, or exclusive radio action in a menu."
    },
    "ki-message": {
      "description": "A user message, assistant reply or event.",
      "events": {
        "ki-branch-change": "Requests a branch by its one-based index.",
        "ki-feedback": "Reports the selected rating.",
        "ki-regenerate": "Requests a new reply on Regenerate."
      },
      "props": {
        "actions-label": {
          "type": "string",
          "description": "Names and enables the assistant toolbar."
        },
        "author": {
          "type": "string",
          "description": "Accessible article name. Defaults by role."
        },
        "branch-count": {
          "type": "number",
          "description": "Total replies. Shows a picker for two or more.",
          "default": 1
        },
        "branch-index": {
          "type": "number",
          "description": "One-based reply index. Update after accepting a branch request.",
          "default": 1
        },
        "branch-status-label": {
          "type": "string",
          "description": "Branch announcement template with {index} and {count}.",
          "default": "Response {index} of {count}"
        },
        "feedback": {
          "type": "enum",
          "values": [
            "bad",
            "good"
          ],
          "description": "Good or bad rating. Restore it when switching branches."
        },
        "icon-name": {
          "type": "string",
          "description": "Decorative event icon. Search is built in. Import other icons before use."
        },
        "message-role": {
          "type": "enum",
          "values": [
            "assistant",
            "event",
            "user"
          ],
          "description": "Trailing user bubble, leading assistant avatar or centered event."
        },
        "next-branch-label": {
          "type": "string",
          "description": "Next branch button label.",
          "default": "Next response"
        },
        "previous-branch-label": {
          "type": "string",
          "description": "Previous branch button label.",
          "default": "Previous response"
        },
        "streaming": {
          "type": "boolean",
          "description": "Show a caret and mark the article busy.",
          "default": false
        }
      },
      "slots": {
        "": "Text or formatted content.",
        "actions": "App controls. With actions-label, use direct buttons or a layout-only\nki-button-group. Mark regenerate and rating buttons with data-message-action.",
        "avatar": "Overrides the decorative assistant avatar."
      },
      "tag": "ki-message",
      "whenNotToUse": "Prompt input, page alerts or tool execution.",
      "whenToUse": "Display an entry in ki-conversation."
    },
    "ki-mobile-nav": {
      "description": "A fixed or floating navigation bar for the main destinations of a phone layout.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the landmark. Supply a distinct name when the page\nhas more than one navigation landmark.",
          "default": "Main"
        },
        "variant": {
          "type": "enum",
          "values": [
            "fixed",
            "floating"
          ],
          "description": "Place the bar edge to edge or inset it as a raised pill.",
          "default": "fixed"
        }
      },
      "slots": {
        "": "Three to five direct ki-mobile-nav-item destinations."
      },
      "tag": "ki-mobile-nav",
      "whenNotToUse": "Use buttons for actions. Use TopNav or Sidebar on wide layouts or when there are more than five destinations.",
      "whenToUse": "Place after the main content of a narrow layout. Supply three to five direct ki-mobile-nav-item children and mark the current page on its item. The host reserves room for the bar in normal flow."
    },
    "ki-mobile-nav-item": {
      "description": "An icon and visible label for one mobile navigation destination.",
      "events": {},
      "props": {
        "count": {
          "type": "number",
          "description": "Optional count of new items. Only finite counts of at least one are shown.\nThe painted count is abbreviated above 99."
        },
        "count-label": {
          "type": "string",
          "description": "Localized suffix for the link name. Use {count} for the full rounded count.",
          "default": "{count} new"
        },
        "current": {
          "type": "boolean",
          "description": "Marks this link as the current page.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "Destination URL. Relative paths and fragments use native anchor resolution.",
          "required": true,
          "format": "url"
        },
        "icon-name": {
          "type": "string",
          "description": "Registered icon name. The visible destination text supplies the link name.",
          "required": true
        }
      },
      "slots": {
        "": "Visible destination text. Use plain text or noninteractive phrasing content."
      },
      "tag": "ki-mobile-nav-item",
      "whenNotToUse": "For a command on the current page, use a button. For inline navigation outside a bottom bar, use ki-link.",
      "whenToUse": "Place directly in ki-mobile-nav. Register a decorative icon and supply a short visible text label. Leave the catalog click action unset for native navigation."
    },
    "ki-note": {
      "description": "A compact, static explanation beside a control or inside a card.",
      "events": {},
      "props": {
        "icon": {
          "type": "boolean",
          "description": "Shows the decorative icon. Set icon=\"false\" in HTML to hide it.",
          "default": true
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Uses caption text at sm and body text at md. Unknown values use md.",
          "default": "md"
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "info",
            "neutral",
            "primary",
            "success",
            "warning"
          ],
          "description": "Selects the background tint and decorative icon. Unknown values use neutral.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Short explanatory text that carries the full meaning.",
        "icon": "A decorative glyph that replaces the tone's built-in icon."
      },
      "tag": "ki-note",
      "whenNotToUse": "For updates that must be announced, use ki-alert. Use Toast\nfor transient confirmations and the field's help-text for field guidance.",
      "whenToUse": "Add a short constraint, tip or consequence next to the content\nit explains. Put the consequence first when warning the reader."
    },
    "ki-number-input": {
      "description": "A form field for a numeric quantity with optional stepper buttons, bounds,\nlocale-aware formatting, and a visible unit.",
      "events": {
        "change": "Composed event fired when the person commits an edited or stepped value. Read the host's numeric value. Listen to native input for live edits."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted number (\"Only 40 seats left\"). While it holds text the field is\ninvalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit or step of the number, or when the form is reset, so it never blocks\nthe corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required`, the bounds or unreadable\ntext, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again."
        },
        "decrease-label": {
          "type": "string",
          "description": "Stepper's accessible name. The field label replaces {label}.",
          "default": "Decrease {label}"
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents editing and excludes the control from form submission.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Validation hint to show when the entry fails a constraint. A `custom-error` outranks it."
        },
        "format": {
          "type": "string",
          "description": "Intl.NumberFormat options for display. In HTML or a catalog spec, supply\nthese options as JSON text. The form value retains its original precision."
        },
        "help-text": {
          "type": "string",
          "description": "Context or instructions displayed beneath the field when it has no visible error."
        },
        "increase-label": {
          "type": "string",
          "description": "Stepper's accessible name. The field label replaces {label}.",
          "default": "Increase {label}"
        },
        "invalid-number-message": {
          "type": "string",
          "description": "Default validation message for text that cannot be read as a number.",
          "default": "Enter a number."
        },
        "label": {
          "type": "string",
          "description": "Visible accessible name. Supply a meaningful label in the page language.",
          "required": true
        },
        "max": {
          "type": "number",
          "description": "Maximum permitted numeric value. Omit for an unbounded maximum."
        },
        "maximum-message": {
          "type": "string",
          "description": "Polite adjustment message after exceeding the maximum. The formatted bound replaces {value}.",
          "default": "Value adjusted to the maximum of {value}."
        },
        "min": {
          "type": "number",
          "description": "Minimum permitted numeric value. Omit for an unbounded minimum."
        },
        "minimum-message": {
          "type": "string",
          "description": "Polite adjustment message after falling below the minimum. The formatted bound replaces {value}.",
          "default": "Value adjusted to the minimum of {value}."
        },
        "name": {
          "type": "string",
          "description": "Form-data key for the plain numeric value."
        },
        "required": {
          "type": "boolean",
          "description": "Whether the user must enter a number before submitting the form.",
          "default": false
        },
        "step": {
          "type": "number",
          "description": "Positive increment for arrows and buttons. Page keys and Shift+arrows move ten increments.",
          "default": 1
        },
        "steppers": {
          "type": "boolean",
          "description": "Shows named decrease and increase buttons inside the field.",
          "default": false
        },
        "unit": {
          "type": "string",
          "description": "Visible suffix such as seconds or seats, included in the accessible description."
        },
        "value": {
          "type": "number",
          "description": "Current numeric value, or undefined when empty or unparseable. Use the\nattribute for the form reset value. Property assignments are silent."
        }
      },
      "slots": {},
      "tag": "ki-number-input",
      "whenNotToUse": "Use ki-input for identifiers, codes, or other text that only\nlooks numeric. Use a range control when relative position is the main cue.",
      "whenToUse": "Collect a number like a quantity, amount, or limit. Provide a\nvisible label and choose bounds and an increment when they have meaning."
    },
    "ki-option": {
      "description": "A declarative data option rendered by its owning `ki-select` or `ki-combobox`.",
      "events": {},
      "props": {
        "description": {
          "type": "string",
          "description": "Secondary text shown below the label in a combobox choice row."
        },
        "disabled": {
          "type": "boolean",
          "description": "Makes this option unavailable. Disabled options cannot be selected, are\nskipped by keyboard highlight, and are exposed unavailable by the select.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Submission and selection value for this option. When omitted, the value\nfalls back to the trimmed option text, matching native `<option>` parity.\nWhen NOT to use: do not use this as selection state; set `ki-select.value`."
        }
      },
      "slots": {
        "": "Text label mirrored by the owning choice field.",
        "start": "Decorative content shown before the label in a combobox row."
      },
      "tag": "ki-option",
      "whenNotToUse": "`ki-option` standalone, authoring selection\non an option, or expecting it to paint its own row.",
      "whenToUse": "declare one choice inside a `ki-select` or `ki-combobox`; its text is the\nhuman-facing label and its `value` is the submitted value."
    },
    "ki-pagination": {
      "description": "Controls for moving among pages of results or appending the next batch.",
      "activationEvent": "ki-page-change",
      "events": {
        "ki-load-more": "Requests another batch. Append results in place and update shown.",
        "ki-page-change": "Requests a different page. Update results and move focus to their heading\nwhen they are ready. Cancelling the event also cancels a plain link click."
      },
      "props": {
        "boundaries": {
          "type": "number",
          "description": "Number of pages to display at each end of the numbered list.",
          "default": 1,
          "minimum": 0,
          "maximum": 10
        },
        "compact-label": {
          "type": "string",
          "description": "Localized stepper label template. Include {page} and {pages}.",
          "default": "Page {page} of {pages}"
        },
        "href-template": {
          "type": "string",
          "description": "Relative or HTTP(S) URL template for native navigation. Place {page} in\nthe path, query or fragment, for example \"?page={page}\".",
          "format": "url"
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the navigation landmark. Distinguish multiple result sets.",
          "default": "Pagination"
        },
        "load-more-label": {
          "type": "string",
          "description": "Localized visible label for the button that appends results.",
          "default": "Load more"
        },
        "next-label": {
          "type": "string",
          "description": "Localized accessible name of the control that requests the next page.",
          "default": "Next page"
        },
        "page": {
          "type": "number",
          "description": "Current 1-based page. Update it when the requested results are ready.",
          "default": 1,
          "minimum": 1
        },
        "page-label": {
          "type": "string",
          "description": "Localized accessible name template for numbered controls. Include {page}.",
          "default": "Page {page}"
        },
        "pages": {
          "type": "number",
          "description": "Total number of result pages. Omit it until a page count is available.",
          "minimum": 0
        },
        "previous-label": {
          "type": "string",
          "description": "Localized accessible name of the control that requests the previous page.",
          "default": "Previous page"
        },
        "shown": {
          "type": "number",
          "description": "Displayed result count in load-more mode. Update it after appending results.",
          "minimum": 0
        },
        "siblings": {
          "type": "number",
          "description": "Number of pages to display on each side of the current page.",
          "default": 1,
          "minimum": 0,
          "maximum": 10
        },
        "status-label": {
          "type": "string",
          "description": "Localized polite count template. Include {shown} and {total}.",
          "default": "Showing {shown} of {total} results"
        },
        "total": {
          "type": "number",
          "description": "Total result count in load-more mode. Required with shown for the count.",
          "minimum": 0
        },
        "variant": {
          "type": "enum",
          "values": [
            "compact",
            "load-more",
            "pages"
          ],
          "description": "Numbered pages, a previous/next stepper, or a button to append results.\nNumbered pages switch to the stepper below 480 CSS pixels of available width.",
          "default": "pages"
        }
      },
      "slots": {},
      "tag": "ki-pagination",
      "whenNotToUse": "short lists that fit in one view or the steps of a task.",
      "whenToUse": "paged tables, search results or long lists. Use compact for\na previous/next stepper and load-more to append results in place."
    },
    "ki-popover": {
      "description": "A non-modal popover anchored to a button.",
      "events": {
        "ki-close": "Emitted when the popover closes.",
        "ki-open": "Emitted when the popover opens."
      },
      "props": {
        "appearance": {
          "type": "enum",
          "values": [
            "default",
            "rich"
          ],
          "description": "Rich shares the tooltip's raised surface, body and heading styles. With\n`kind=\"toggletip\"` it enables actions and moves focus inside on open.",
          "default": "default"
        },
        "arrow": {
          "type": "boolean",
          "description": "Shows the arrow toward the trigger.",
          "default": true
        },
        "for": {
          "type": "string",
          "description": "ID of the button in the same document or shadow tree.",
          "format": "idref"
        },
        "kind": {
          "type": "enum",
          "values": [
            "dialog",
            "toggletip"
          ],
          "description": "Use dialog for controls or toggletip for supplemental information. Rich toggletips can contain actions.",
          "default": "dialog"
        },
        "label": {
          "type": "string",
          "description": "Accessible name of a dialog popover.",
          "default": "Popover"
        },
        "open": {
          "type": "boolean",
          "description": "Visibility. Reflects activation and native dismissal.",
          "default": false
        },
        "placement": {
          "type": "enum",
          "values": [
            "bottom",
            "bottom-end",
            "bottom-start",
            "end",
            "end-end",
            "end-start",
            "start",
            "start-end",
            "start-start",
            "top",
            "top-end",
            "top-start"
          ],
          "description": "Preferred side and logical alignment. Flips when room is limited.",
          "default": "bottom-start"
        }
      },
      "slots": {
        "": "Dialog content or toggletip text. A rich toggletip also accepts actions."
      },
      "tag": "ki-popover",
      "whenNotToUse": "Use ki-dialog for required decisions and ki-tooltip for hover or focus hints.",
      "whenToUse": "Show filters, details, a small form, or an explanation opened by click. Use a rich toggletip for a short explanation with actions."
    },
    "ki-progress": {
      "description": "A token-styled, non-interactive progress indicator for known or unknown\nduration work.",
      "events": {},
      "props": {
        "indeterminate": {
          "type": "boolean",
          "description": "Unknown-duration mode. When set, no completed fraction or current value is\nexposed. Its motion is declared only when reduced motion is not requested.\nWhen to use: show ongoing work whose duration or total cannot be measured.\nWhen NOT to use: do not use for known fractions; use `value` and `max`.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Accessible name applied to the internal progressbar. Always set this to\nwhat is progressing, such as \"Uploading report.pdf\". Without it the\nelement renders but exposes no accessible name, so the catalog contract\nrequires it.\nWhen NOT to use: do not use a generic label such as \"Loading\" when the\ntask can be named more specifically.",
          "required": true
        },
        "max": {
          "type": "number",
          "description": "Total amount. Non-finite, zero or negative values normalize to `100` for\npresentation and ARIA.\nWhen to use: set when a determinate task's total is not 100.\nWhen NOT to use: omit for conventional percentage-style progress.",
          "default": 100
        },
        "shape": {
          "type": "enum",
          "values": [
            "circular",
            "linear"
          ],
          "description": "Structural presentation. Use `linear` in page flows and lists; use\n`circular` in compact or centered placements. Unknown values render linear.\nWhen NOT to use: do not use shape to encode semantic status or task intent.",
          "default": "linear"
        },
        "value": {
          "type": "number",
          "description": "Completed amount. Presentation and ARIA clamp this value to `0..max`;\nmalformed values fall back to `0`. Ignored while `indeterminate` is set.\nWhen to use: set with `max` for determinate task advancement.\nWhen NOT to use: do not set a fabricated value for unknown-duration work;\nset `indeterminate` instead.",
          "default": 0
        }
      },
      "slots": {},
      "tag": "ki-progress",
      "whenNotToUse": "static measurements within a known range such as disk\nusage or scores (gauge/meter), step-by-step wizard navigation (stepper),\nskeleton placeholders while content loads, or operations that finish in\nunder about one second.",
      "whenToUse": "communicate advancement of an ongoing task such as upload,\ndownload, installation or multi-step processing. Use `value`/`max` when\nthe completed fraction is known; use `indeterminate` when work is ongoing\nbut its duration cannot be measured, including loading-indicator use cases.\nChoose `linear` in page flows and lists, and `circular` in compact or\ncentered placements. Always set `label` to what is progressing."
    },
    "ki-prompt-input": {
      "description": "A multiline assistant composer with local file attachments and send and stop requests.",
      "events": {
        "ki-stop": "Requests that the application stop its streaming response.",
        "ki-submit": "Requests a send with original text and a snapshot of accepted local files."
      },
      "props": {
        "accept": {
          "type": "string",
          "description": "Comma-separated extensions or MIME types. Empty hides the attachment surface.",
          "default": ""
        },
        "attach-label": {
          "type": "string",
          "description": "Accessible name of the file picker button.",
          "default": "Attach files"
        },
        "attachments-label": {
          "type": "string",
          "description": "Accessible name of the attachment list.",
          "default": "Attachments"
        },
        "disabled": {
          "type": "boolean",
          "description": "Excludes the composer from interaction and native form data.",
          "default": false
        },
        "file-count-message": {
          "type": "string",
          "description": "Localized count rejection. The {name} marker is replaced with the file name.",
          "default": "{name} exceeds the maximum number of attachments."
        },
        "file-size-message": {
          "type": "string",
          "description": "Localized size rejection. The {name} marker is replaced with the file name.",
          "default": "{name} exceeds the file size limit."
        },
        "file-type-message": {
          "type": "string",
          "description": "Localized type rejection. The {name} marker is replaced with the file name.",
          "default": "{name} has an unsupported file type."
        },
        "label": {
          "type": "string",
          "description": "Required accessible name of the text field. Supply it even with a placeholder.",
          "required": true
        },
        "max-files": {
          "type": "number",
          "description": "Maximum count of attached files. Omit for no count limit."
        },
        "max-size": {
          "type": "number",
          "description": "Maximum attachment size in bytes per file. Omit for no size limit."
        },
        "name": {
          "type": "string",
          "description": "Optional key for the text in native form data. Files are carried by ki-submit."
        },
        "placeholder": {
          "type": "string",
          "description": "Hint displayed while the text field is empty."
        },
        "remove-label": {
          "type": "string",
          "description": "Prefix of an attachment's remove button name, followed by the file name.",
          "default": "Remove"
        },
        "send-label": {
          "type": "string",
          "description": "Accessible name of the Send button.",
          "default": "Send"
        },
        "status": {
          "type": "enum",
          "values": [
            "idle",
            "streaming",
            "submitted"
          ],
          "description": "Application-owned request state. Only idle can send; streaming exposes Stop.",
          "default": "idle"
        },
        "stop-label": {
          "type": "string",
          "description": "Accessible name of the Stop button.",
          "default": "Stop generating"
        },
        "submit-on": {
          "type": "enum",
          "values": [
            "enter",
            "mod-enter"
          ],
          "description": "Send with Enter or with Control/Command+Enter. Shift+Enter always adds a line.",
          "default": "enter"
        },
        "value": {
          "type": "string",
          "description": "Current draft text; the value attribute provides the form reset default.",
          "default": ""
        },
        "writing-message": {
          "type": "string",
          "description": "Visible polite status while the assistant streams.",
          "default": "Writing…"
        }
      },
      "slots": {
        "attachments": "Supplemental list items, visible when accept is set. Composer-managed files appear in the same list and alone contribute to ki-submit.",
        "tools": "Application-owned toolbar controls, such as a model-picker trigger. Use non-submitting controls."
      },
      "tag": "ki-prompt-input",
      "whenNotToUse": "Ordinary multiline form input without a send or stop interaction (`ki-textarea`), file uploads, or rich text editing.",
      "whenToUse": "Compose a message to an assistant, optionally attach local files, and let people interrupt the assistant's response."
    },
    "ki-qr": {
      "description": "A machine-scannable QR code that hands a declared value — a link, a\npairing payload — from the screen to a nearby camera, encoded locally\nand restyled entirely through tokens.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name stating the code's purpose (\"Open onmars.dev on your\nphone\"). The component exposes exactly one non-interactive image named\nby it, falling back to the encoded value when absent (FR-005) — never\nan unnamed graphic. The label is never rendered visually, and naming\nthe purpose is what tells assistive-technology users to look for the\naccessible alternative carrying the same payload (documented catalog\nguidance, FR-013)."
        },
        "value": {
          "type": "string",
          "description": "The exact text the code encodes — the single source of the content,\nencoded locally as one UTF-8 byte segment at error-correction level M\n(non-ASCII text additionally carries the UTF-8 ECI designator, so real\nscanners decode the declared string rather than an ISO-8859-1\nmisreading), so an independent decoder recovers it byte-for-byte,\nincluding non-ASCII text (FR-001), and no network request is ever made — the value is\ndata, never behavior: the component never interprets, resolves,\nnavigates to or fetches it (FR-002). Changes re-encode in place. When\nabsent, empty or beyond the capacity of the densest symbol (~2,331\nbytes at level M), nothing renders and nothing errors (FR-003)."
        }
      },
      "slots": {},
      "tag": "ki-qr",
      "whenNotToUse": "data the person must read on this same screen (render text\nor a link), one-dimensional barcodes (out of scope), anything interactive\n(a QR code is not a button — pair it with a real control instead), secret\nvalues (anyone who can photograph the screen can decode them), or as the\nsole carrier of the payload (the accessible alternative is mandatory\nguidance). An always-empty ki-qr and a value beyond the ~2,331-byte\ncapacity are authoring mistakes: both render nothing, silently.",
      "whenToUse": "hand a URL or machine-readable payload from the screen to a\nnearby camera device: login pairing, tickets and passes, \"continue on\nmobile\" links, Wi-Fi sharing. Declare `value` (encoded verbatim, always\nlocally) and a purpose-stating `label` (\"Open onmars.dev on your phone\"),\nand always offer the same payload through an accessible alternative next\nto the code — a visible link or copyable text — because a QR code is only\nuseful to someone who can point a second device's camera at the screen."
    },
    "ki-radio": {
      "description": "One option in a token-styled radio group.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents this option from being selected or focused. Disabled options are\nskipped by group arrow navigation and omitted from form submission when\nselected before becoming disabled.\nWhen NOT to use: do not use disabled as a temporary loading state.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Submission value projected by the parent `ki-radio-group` when this option\nis selected. Omit for native radio parity with value `\"on\"`.\nWhen NOT to use: do not use `value` to author selection; set the group's\n`value` property or attribute.",
          "default": "on"
        }
      },
      "slots": {
        "": "Option label. This is the accessible name and activation surface."
      },
      "tag": "ki-radio",
      "whenNotToUse": "`ki-radio` standalone, multiple selection,\nor authored selection state; set the parent group's `value` instead.",
      "whenToUse": "place inside `ki-radio-group` when a person must choose\nexactly one of a small visible set."
    },
    "ki-radio-group": {
      "description": "A token-styled radio group that owns selection, keyboard coordination and\nform participation for slotted `ki-radio` options.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired once after the user selects a different radio, composed\nacross the shadow boundary; `value` is already current when listeners run.\n`click()` on a `ki-radio` from a script selects it like a native radio: one\n`input`, then one `change`.\nWhen to use: react to the committed choice. When NOT to use: do not expect\nit for programmatic `value` writes, which are silent."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"This plan is sold out\"). While it holds text the group\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting when the person\nchooses another option, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` group left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Makes the whole group unavailable, skips it in Tab order and removes its\nform entry.\nWhen NOT to use: do not use disabled for pending/loading semantics.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message shown in place of the help text once a `required` group is left\nwithout a choice, and its `validationMessage` (\"Choose a plan\"). Without\nit the browser's own message shows, in the browser's language. An error\nset with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those."
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the options, read with the group as its\ndescription: what the choice decides. While an error shows, the error\ntakes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`."
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible-name source for the radiogroup.\nWhen NOT to use: do not omit it unless the host's `aria-labelledby` names\nthe group from the page; a group with neither fails accessibility gates.\n\nNaming from the page: set `aria-labelledby` on the host to the ids of\nelements in the same document or shadow root, such as the heading that\nalready asks the question. The group then takes its name from them,\nfollowed by its own `label` and `label-hint` when set. The ids are read\nwhen the group renders and whenever the attribute changes.\nWhen to use: the question is written on the page above the options; omit\n`label` so the question is not shown, or read, twice.\nWhen NOT to use: do not reference elements inside another component's\nshadow root, which an id reference cannot reach.",
          "required": true
        },
        "label-hidden": {
          "type": "boolean",
          "description": "Hides the `label` (and its hint) from view and from reading order while it\nstays the radiogroup's accessible name, so a screen reader announces it\nonce, as the group's name.\nWhen to use: the layout already makes the question obvious to sighted\npeople (a heading in a card, an icon row) but the group still needs a\nname of its own.\nWhen NOT to use: do not hide a label that repeats a question already on\nthe page; point `aria-labelledby` at that question instead. Do not hide\nthe only description of what a choice decides; that is `help-text`.",
          "default": false
        },
        "label-hint": {
          "type": "string",
          "description": "Short text shown after the group label and read with it as part of the\nradiogroup name, so people know before submitting whether to choose:\n\"(optional)\" on the few optional questions of a mostly required form, or\n\"(required)\" the other way round, in the page's own language. It changes\nno validation; set `required` for that, and keep the two consistent.\nWhen NOT to use: do not put what the choice decides in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label."
        },
        "name": {
          "type": "string",
          "description": "Form-data key for the selected option's value. Omit when the group should\nnot contribute a form entry.\nWhen NOT to use: do not put `name` on `ki-radio` options; their internal\nnative inputs are intentionally unnamed."
        },
        "required": {
          "type": "boolean",
          "description": "Requires one selected option for form submission. The group uses platform\n`valueMissing` from its internal native radio inputs.\nWhen NOT to use: do not use required when no answer is acceptable.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm"
          ],
          "description": "Token-backed size of every `ki-radio` the group holds: the circle is 18\nor 20px in onmars, and `sm` takes the smaller option label (13/20, 8px\naway). The group decides for all its options; the group's own label,\nhelp and error keep their size. An unrecognized value matches no style\nrule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around the group.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Projection of the current selection. The initial attribute selects the\nfirst matching option; unmatched values leave the group unselected and\noperable. Assigning the property updates selection silently.\nWhen NOT to use: never author selection on `ki-radio`; set this value.",
          "default": ""
        }
      },
      "slots": {
        "": "`ki-radio` options. Document order is navigation order."
      },
      "tag": "ki-radio-group",
      "whenNotToUse": "many options or tight space (use `ki-select`), independent\non/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or\nauthored selection on options; set this group's `value` instead.",
      "whenToUse": "a person must choose exactly one of a small set of mutually\nexclusive options that should all be visible at once."
    },
    "ki-rating": {
      "description": "Displays a score or collects one choice on a small rating scale.",
      "events": {
        "ki-change": "Fires once when a person changes the selection. The detail contains the numeric value."
      },
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Makes an editable rating unavailable and excludes it from form submission.",
          "default": false
        },
        "icon-name": {
          "type": "string",
          "description": "Lucide icon name. Import custom names before mounting. Unavailable names use star.",
          "default": "star"
        },
        "label": {
          "type": "string",
          "description": "Visible question in input mode and accessible context in read-only mode. Always supply it.",
          "required": true
        },
        "max": {
          "type": "number",
          "description": "Highest score and number of glyphs. Use a whole number from 1 to 10.",
          "default": 5,
          "minimum": 1,
          "maximum": 10
        },
        "name": {
          "type": "string",
          "description": "Form field name for a selected editable score."
        },
        "option-label": {
          "type": "string",
          "description": "Accessible name pattern for the other choices. Use {value} for the choice.",
          "default": "{value} stars"
        },
        "option-singular-label": {
          "type": "string",
          "description": "Accessible name pattern for the one-star choice. Use {value} for the choice.",
          "default": "{value} star"
        },
        "precision": {
          "type": "number",
          "description": "Choose 1 for whole steps or 0.5 for half steps. Other inputs use whole steps.",
          "default": 1
        },
        "rated-label": {
          "type": "string",
          "description": "Accessible name pattern for the read-only image. Use {value} and {max} for the scores.",
          "default": "Rated {value} out of {max}"
        },
        "readonly": {
          "type": "boolean",
          "description": "Displays a score without editing or submitting it.",
          "default": false
        },
        "required": {
          "type": "boolean",
          "description": "Requires an editable score before the form can be submitted.",
          "default": false
        },
        "required-message": {
          "type": "string",
          "description": "Validation message for an unanswered required rating.",
          "default": "Select a rating."
        },
        "score-label": {
          "type": "string",
          "description": "Visible score pattern in input mode. Use {value} and {max} for the scores.",
          "default": "{value} of {max}"
        },
        "value": {
          "type": "number",
          "description": "Current score. Zero means unanswered in input mode. Editable scores use\nthe nearest allowed step. Read-only scores retain their decimal precision.",
          "default": 0,
          "minimum": 0,
          "maximum": 10
        }
      },
      "slots": {},
      "tag": "ki-rating",
      "whenNotToUse": "Use message actions for yes/no feedback and a slider for a\ncontinuous or large numeric range.",
      "whenToUse": "Show an average review score in readonly mode or ask people to rate\nan answer, experience, or product on a small scale."
    },
    "ki-reasoning": {
      "description": "A disclosure for the assistant's progress or plan, with a localized summary.",
      "events": {
        "ki-toggle": "Emitted after a native disclosure toggle. Setting open from the application is silent."
      },
      "props": {
        "done-label": {
          "type": "string",
          "description": "Summary text when done and elapsed time is unavailable.",
          "default": "Thought"
        },
        "duration": {
          "type": "number",
          "description": "Optional elapsed milliseconds. Done displays finite, nonnegative values rounded to seconds."
        },
        "duration-label": {
          "type": "string",
          "description": "Summary template for zero or multiple elapsed seconds. The {seconds} placeholder receives the rounded time.",
          "default": "Thought for {seconds} seconds"
        },
        "open": {
          "type": "boolean",
          "description": "Whether the disclosure shows its steps. Native toggles update this reflected property.",
          "default": false
        },
        "singular-duration-label": {
          "type": "string",
          "description": "Summary template for one elapsed second. The {seconds} placeholder receives the rounded time.",
          "default": "Thought for {seconds} second"
        },
        "status": {
          "type": "enum",
          "values": [
            "done",
            "thinking"
          ],
          "description": "Use thinking while steps arrive and done once the assistant finishes.",
          "default": "thinking"
        },
        "thinking-label": {
          "type": "string",
          "description": "Summary text while the assistant is thinking.",
          "default": "Thinking…"
        }
      },
      "slots": {
        "": "Supporting content shown when expanded, such as an ordered list of steps supplied by the application."
      },
      "tag": "ki-reasoning",
      "whenNotToUse": "hide the answer or controls the user needs to complete a task. Use a general disclosure for unrelated content.",
      "whenToUse": "present assistant-supplied steps, progress or a completed plan alongside the answer."
    },
    "ki-relative-time": {
      "description": "Displays the elapsed or remaining time for a timestamp in the reader's language.",
      "events": {},
      "props": {
        "date": {
          "type": "string",
          "description": "ISO calendar date or date-time. A timestamp without an offset uses local time."
        },
        "numeric": {
          "type": "enum",
          "values": [
            "always",
            "auto"
          ],
          "description": "Auto can show words such as yesterday. Always uses a number.",
          "default": "auto"
        },
        "sync": {
          "type": "boolean",
          "description": "Refresh the visible wording as the clock crosses a formatting boundary.",
          "default": false
        },
        "threshold": {
          "type": "number",
          "description": "Display an absolute timestamp when the distance reaches this many seconds.\nOmit to keep relative wording at any distance.",
          "minimum": 0
        }
      },
      "slots": {},
      "tag": "ki-relative-time",
      "whenNotToUse": "For an interactive countdown or a date that should always show an absolute value.",
      "whenToUse": "For timestamps whose distance from the present matters, such as timeline entries or recent changes."
    },
    "ki-scroller": {
      "description": "A bounded scroll container that clips its content along one declared axis\nand replaces platform scrollbar chrome with a token-resolved indicator.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the scroll region (\"Release notes\", \"Chat\nmessages\"). Assistive technology receives a `region` with this name\nwhose slotted content keeps its own semantics (FR-006). Documented as\nrequired: a scroller without a label renders but exposes no accessible\nname and fails the accessibility audit (015-ki-progress precedent).\nThe label is never rendered visually.",
          "required": true
        },
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Declared scroll axis, mapping the design source's `Type` axis:\n`vertical` (default) scrolls the block axis, `horizontal` the inline\naxis. One axis per instance; the cross axis clips. A structural axis,\nnever appearance — thickness, shape and colors of the indicator are\nper-theme `--ki-scroller-*` tokens. An unrecognized value matches no\nstyle selector and no `horizontal` code path, so the scroller keeps\nthe default vertical behavior (fallback by CSS construction plus a\nsingle strict comparison — no validation code, FR-002/FR-009).",
          "default": "vertical"
        }
      },
      "slots": {
        "": "The scrollable content: it keeps its own semantics and sizes the scroll extent along the declared axis."
      },
      "tag": "ki-scroller",
      "whenNotToUse": "page-level scrolling (the browser's job), carousels or\npaginated media (future indicator/carousel patterns), virtualized long\ncollections, multi-column tabular data, or nesting scrollers (v1\nguarantees a single scroll axis per region). Cross-axis overflow is an\nauthoring mistake: the scroller scrolls its declared axis only and clips\nthe other — wrap or size content on the cross axis.",
      "whenToUse": "a bounded region inside a view whose content can outgrow it:\nchat or message panes, code and log blocks, tag rows, sidebar navigation,\ntall menus inside cards. Give it bounds (its size comes entirely from your\nlayout) and a `label` (required: the accessible name of the scroll\nregion). Scrolling stays native — wheel, touch, keyboard and indicator\ndrag operate the viewport directly."
    },
    "ki-search": {
      "description": "A query field with a responsive view for suggestions, recent searches and results.",
      "events": {
        "ki-clear": "The user cleared the query with the clear control or with Escape.",
        "ki-input": "The current query after 200 ms of inactivity following an edit.",
        "ki-remove-recent": "The removed recent query. Hosts can use this to persist the updated history.",
        "ki-search": "The query to run, emitted on Enter or activation of a suggestion or recent search."
      },
      "props": {
        "back-label": {
          "type": "string",
          "description": "Accessible name of the full-screen Back button.",
          "default": "Back"
        },
        "clear-label": {
          "type": "string",
          "description": "Accessible name of the query clear button.",
          "default": "Clear search"
        },
        "highlight": {
          "type": "boolean",
          "description": "Emphasize literal, case-insensitive matches in suggestion titles.",
          "default": true
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the search landmark, input and full-screen dialog.",
          "default": "Search"
        },
        "loading": {
          "type": "boolean",
          "description": "Show a loading indicator while the host fetches suggestions.",
          "default": false
        },
        "loading-label": {
          "type": "string",
          "description": "Accessible name of the loading indicator.",
          "default": "Loading suggestions"
        },
        "mode": {
          "type": "enum",
          "values": [
            "auto",
            "docked",
            "fullscreen"
          ],
          "description": "View presentation. Auto uses a full-screen dialog below 600 CSS pixels.",
          "default": "auto"
        },
        "name": {
          "type": "string",
          "description": "Name under which the current query is included in form data."
        },
        "open": {
          "type": "boolean",
          "description": "Whether the search view is open. The field opens it on focus, click or input.",
          "default": false
        },
        "placeholder": {
          "type": "string",
          "description": "Optional hint displayed inside the empty search field.",
          "default": ""
        },
        "recent-label": {
          "type": "string",
          "description": "Visible and accessible name of the recent-search group.",
          "default": "Recent searches"
        },
        "remove-recent-label": {
          "type": "string",
          "description": "Accessible name template for recent-query removal. Use {value} for the query title.",
          "default": "Remove {value}"
        },
        "suggestion-count-plural": {
          "type": "string",
          "description": "Polite announcement for zero or multiple suggestions. Use {count} for the number.",
          "default": "{count} suggestions"
        },
        "suggestion-count-singular": {
          "type": "string",
          "description": "Polite announcement when the list contains one suggestion.",
          "default": "1 suggestion"
        },
        "suggestions-label": {
          "type": "string",
          "description": "Accessible name of the suggestion listbox.",
          "default": "Suggestions"
        },
        "value": {
          "type": "string",
          "description": "Current query. Edits and selected suggestions update this property.",
          "default": ""
        }
      },
      "slots": {
        "": "Direct ki-search-suggestion children supply suggestion and recent-query data.",
        "leading": "A control or decorative icon at the start of the collapsed or docked bar.",
        "results": "Host-rendered results beneath suggestions and recent searches.",
        "trailing": "A control or avatar at the end of the collapsed or docked bar. Supply\na labelled button here to surface voice search."
      },
      "tag": "ki-search",
      "whenNotToUse": "selecting one value from a fixed set belongs in ki-select.\nUse ki-input when a plain search field is enough.",
      "whenToUse": "accept free-text searches and let the user run a typed or suggested\nquery. Listen for ki-input to update suggestions, and ki-search to render results."
    },
    "ki-search-suggestion": {
      "description": "Declarative search suggestion or recent query rendered by its owning ki-search.",
      "events": {},
      "props": {
        "description": {
          "type": "string",
          "description": "Optional supporting text displayed below the title."
        },
        "recent": {
          "type": "boolean",
          "description": "Display in the removable recent-search group.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Query to run. When omitted, the trimmed title is used."
        }
      },
      "slots": {
        "": "Plain text title displayed in the owning search view."
      },
      "tag": "ki-search-suggestion",
      "whenNotToUse": "standalone display, form options or arbitrary results content.\nUse the results slot of ki-search for independently rendered results.",
      "whenToUse": "supply one suggested or recent query as a direct ki-search child."
    },
    "ki-segment": {
      "description": "A single choice in a ki-segmented-control.",
      "events": {},
      "props": {
        "aria-label": {
          "type": "string",
          "description": "Accessible name of an icon-only option. An enabled icon-only option also\nshows this name on focus and hover when ki-tooltip is registered. The\nall-elements loader includes it. For a text option, use the visible label."
        },
        "disabled": {
          "type": "boolean",
          "description": "Excludes the option from selection and keyboard navigation.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Required nonempty option identifier. Each value must be unique in its group.",
          "required": true
        }
      },
      "slots": {
        "": "Noninteractive visible option label. A label wider than its share of\nthe row wraps onto a second line and every option of the row keeps one\nheight; text that would need a third line ends with an ellipsis, and the\nfull text stays the option's accessible name. Keep it to a few words.",
        "start": "Decorative leading icon. Supply aria-label for an icon-only option."
      },
      "tag": "ki-segment",
      "whenNotToUse": "standalone, for navigation, or for form submission.",
      "whenToUse": "offer one mutually exclusive choice with text or a named icon."
    },
    "ki-segmented-control": {
      "description": "A compact control for one in-place choice among two to five options.",
      "events": {
        "ki-change": "Emitted once per changed user choice with the new resolved value."
      },
      "props": {
        "full-width": {
          "type": "boolean",
          "description": "Distribute the available inline space evenly among all segments. A label\nwider than its equal share wraps onto a second line.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Required accessible name of the group. Use a short name for the setting.",
          "required": true
        },
        "size": {
          "type": "enum",
          "values": [
            "md",
            "sm",
            "xs"
          ],
          "description": "Track size. The default heights are 28, 32 and 40 CSS px respectively;\nsurrounding density settings can increase or decrease targets.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Resolved selected value. Set it to choose an option programmatically.\nOmit it to select the first available option. The value is empty when\nthere are no available options. Programmatic changes are silent.",
          "default": ""
        }
      },
      "slots": {
        "": "Two to five direct ki-segment children with distinct nonempty values."
      },
      "tag": "ki-segmented-control",
      "whenNotToUse": "switching between panels (ki-tabs), submitted form choices\n(ki-radio-group), or more than five options (ki-select).",
      "whenToUse": "apply a chart range, view mode, or another immediate setting."
    },
    "ki-select": {
      "description": "A form-associated select-only combobox for choosing one option from\ndeclarative `ki-option` children.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired once after the user commits a different option, composed\nacross the shadow boundary and preceded by `input`; `value` is already\ncurrent when listeners run. When to use: react to the committed choice.\nWhen NOT to use: do not expect it for programmatic `value` writes, which\nare silent."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"We do not ship there\"). While it holds text the select\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting when the person\nchooses another option, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` select left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents opening, removes the trigger from keyboard reach, and excludes\nthe select from form submission. Boolean presence semantics apply.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message shown in place of the help text once a `required` select is left\nwithout a choice, and its `validationMessage` (\"Choose a country\").\nWithout it the browser's own message shows, in the browser's language. An\nerror set with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those."
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the trigger, read with it as the combobox\ndescription: what the choice decides. While an error shows, the error\ntakes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`."
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible-name source for the combobox trigger.\nWhen NOT to use: do not omit it; unlabeled selects are invalid usage.",
          "required": true
        },
        "label-hint": {
          "type": "string",
          "description": "Short text shown after the label and read with it as part of the\ncombobox name, so people know before submitting whether to choose:\n\"(optional)\" on the few optional fields of a mostly required form, or\n\"(required)\" the other way round, in the page's own language. It changes\nno validation; set `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions in it (use `help-text`), errors\n(use `error-text`), or a repeat of the label."
        },
        "name": {
          "type": "string",
          "description": "Form-data key used when a selected option contributes its value.\nWhen NOT to use: omit it when the select should not submit data."
        },
        "placeholder": {
          "type": "string",
          "description": "Text shown while no option is selected.\nWhen NOT to use: do not use it as a replacement for `label`.",
          "default": ""
        },
        "required": {
          "type": "boolean",
          "description": "Requires a non-empty submitted value. The platform validation message is\ndonated by a hidden native select.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed trigger size (`--ki-select-{size}-*` tokens): the trigger is\n24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and\nindicator; the label and help text follow in three steps. The listbox\nand its options keep their size. An unrecognized value matches no style\nrule and keeps the medium metrics.\nWhen to use: match the size of the fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Live projection of the selected option value, or `\"\"` when unselected.\nAssigning it selects the first matching option silently; the attribute is\nthe reset/default declaration and is not updated by user commits.",
          "default": ""
        }
      },
      "slots": {
        "": "`ki-option` data children. They do not paint; rows are mirrored."
      },
      "tag": "ki-select",
      "whenNotToUse": "`ki-radio-group` for a few always-visible choices,\n`ki-input` for free or searchable text, `ki-checkbox`/`ki-switch` for\nbinary decisions, or multiselect and command menus.",
      "whenToUse": "choose exactly one value from a known closed list, especially\nwhen there are roughly five or more choices or space is limited."
    },
    "ki-sidebar": {
      "description": "Side navigation with an expanded panel and an optional icon rail.",
      "events": {
        "ki-sidebar-change": "Reports the new collapsed state after a user toggle. Programmatic writes are silent."
      },
      "props": {
        "collapse-label": {
          "type": "string",
          "description": "Accessible toggle name while the sidebar is expanded.",
          "default": "Collapse sidebar"
        },
        "collapsed": {
          "type": "boolean",
          "description": "Display the icon rail. May also be assigned by the application.",
          "default": false
        },
        "collapsible": {
          "type": "boolean",
          "description": "Show the expand and collapse control.",
          "default": false
        },
        "expand-label": {
          "type": "string",
          "description": "Accessible toggle name while the sidebar is collapsed.",
          "default": "Expand sidebar"
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the navigation landmark.",
          "default": "Main"
        }
      },
      "slots": {
        "": "Navigation routes and groups, in reading order.",
        "brand": "Presentational brand content for the expanded panel.",
        "footer": "Account trigger or other app-owned content available in both modes."
      },
      "tag": "ki-sidebar",
      "whenNotToUse": "for a few destinations, use top navigation. For mobile\nnavigation, use a mobile navigation pattern or a drawer.",
      "whenToUse": "navigate more than five top-level destinations or organize\napplication destinations in named groups."
    },
    "ki-sidebar-group": {
      "description": "A named list of routes within sidebar navigation.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Visible group heading and accessible name of the nested list.",
          "required": true
        }
      },
      "slots": {
        "": "One or more ki-sidebar-item routes."
      },
      "tag": "ki-sidebar-group",
      "whenNotToUse": "as a destination or outside ki-sidebar.",
      "whenToUse": "give related sidebar destinations a common heading."
    },
    "ki-sidebar-item": {
      "description": "One destination in a sidebar.",
      "events": {},
      "props": {
        "count": {
          "type": "number",
          "description": "Positive unread count. Fractional values round down."
        },
        "count-label": {
          "type": "string",
          "description": "Accessible count template, using the {label} and {count} placeholders.",
          "default": "{label}, {count} new"
        },
        "current": {
          "type": "boolean",
          "description": "Mark this destination as the current page.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "Destination resolved by a native link. Omit for a static row.",
          "format": "url"
        },
        "icon-name": {
          "type": "string",
          "description": "Name of a registered Lucide glyph. Import its per-icon entry point first."
        }
      },
      "slots": {
        "": "The destination name as text or static inline content.",
        "start": "One decorative icon that overrides icon-name."
      },
      "tag": "ki-sidebar-item",
      "whenNotToUse": "for commands, nested controls, or standalone links outside the sidebar.",
      "whenToUse": "link to a named destination in ki-sidebar or ki-sidebar-group.\nRegister ki-tooltip once when using direct component imports for a rail."
    },
    "ki-skeleton": {
      "description": "Decorative placeholder shapes that reserve space for loading content.",
      "events": {},
      "props": {
        "animated": {
          "type": "boolean",
          "description": "Sweep a highlight while the user permits motion. Set false to use a static\nplaceholder. Shimmer also stops under reduced motion and forced colours.",
          "default": true
        },
        "block-size": {
          "type": "string",
          "description": "CSS length for the block axis. For text, this is the height of each line.\nUse it to reserve the height of the content that will replace the shape."
        },
        "inline-size": {
          "type": "string",
          "description": "CSS length for the inline axis. Use it to match a fixed content width.\nText and rectangles otherwise fill available inline space."
        },
        "lines": {
          "type": "number",
          "description": "Number of text lines. Use a whole number from 1 to 20 for the expected\nparagraph length. Extra lines are ignored for circles and rectangles.",
          "default": 1,
          "minimum": 1,
          "maximum": 20
        },
        "shape": {
          "type": "enum",
          "values": [
            "circle",
            "rect",
            "text"
          ],
          "description": "Match the placeholder to the expected text, avatar, or rectangular content.",
          "default": "text"
        },
        "size": {
          "type": "string",
          "description": "CSS length shared by both axes. Use it for circles or square blocks.\nAn axis-specific override takes precedence."
        }
      },
      "slots": {},
      "tag": "ki-skeleton",
      "whenNotToUse": "For a standalone loading announcement, progress measurement,\nor interactive control. Put content and loading feedback in the caller's region.",
      "whenToUse": "Reserve the expected layout of a card, list, or assistant reply\nwhile it loads. Give the surrounding region an accessible name and set\nits aria-busy state. Show the skeleton after about 300 ms of waiting."
    },
    "ki-slider": {
      "description": "Adjusts a value or an interval on a bounded scale.",
      "events": {
        "change": "Bubbles once when a pointer operation commits a different\nselection or a keyboard action changes it. Read the current host value.\nFor updates during a drag, listen for the standard bubbling `input` event.\nProgrammatic updates and form resets are silent."
      },
      "props": {
        "centered": {
          "type": "boolean",
          "description": "Shows a midpoint tick and fills from that point to a single thumb.",
          "default": false
        },
        "currency": {
          "type": "string",
          "description": "ISO 4217 code used with currency format.",
          "default": "EUR"
        },
        "disabled": {
          "type": "boolean",
          "description": "Makes the slider unavailable for pointer, keyboard and form submission.",
          "default": false
        },
        "format": {
          "type": "enum",
          "values": [
            "currency",
            "number",
            "percent"
          ],
          "description": "Display format for the readout and accessible values.",
          "default": "number"
        },
        "help-text": {
          "type": "string",
          "description": "Optional supporting text, read as the description of each thumb."
        },
        "label": {
          "type": "string",
          "description": "Visible base name. Use a task-specific, localized label.",
          "default": "Slider"
        },
        "marks": {
          "type": "number",
          "description": "Number of evenly spaced tick intervals, up to 100. Zero hides ticks.",
          "default": 0,
          "minimum": 0,
          "maximum": 100
        },
        "max": {
          "type": "number",
          "description": "Inclusive upper bound. A maximum below min collapses the scale.",
          "default": 100
        },
        "maximum-label": {
          "type": "string",
          "description": "Localized suffix for the upper thumb's accessible name.",
          "default": "maximum"
        },
        "min": {
          "type": "number",
          "description": "Inclusive lower bound and step origin.",
          "default": 0
        },
        "minimum-label": {
          "type": "string",
          "description": "Localized suffix for the lower thumb's accessible name.",
          "default": "minimum"
        },
        "name": {
          "type": "string",
          "description": "Native form key. Omit when the value should remain local to the control."
        },
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Axis of the scale. A vertical scale increases towards the top.",
          "default": "horizontal"
        },
        "range": {
          "type": "boolean",
          "description": "Enables two non-crossing thumbs in minimum then maximum tab order.",
          "default": false
        },
        "step": {
          "type": "number",
          "description": "Positive increment. Values snap from min and max is always reachable.",
          "default": 1
        },
        "value": {
          "type": "number-or-string",
          "description": "Current selection as a number or, in range mode, a comma-separated pair.\nHTML attributes also accept the scalar as numeric text. Defaults to min\nfor one thumb and to both bounds for a range. User updates are normalized."
        }
      },
      "slots": {},
      "tag": "ki-slider",
      "whenNotToUse": "when people need to enter exact numbers or choose among a\nfew named options. Use a number input or radio group for those tasks.",
      "whenToUse": "coarse adjustments such as volume, balance or a price filter,\nwith a descriptive label."
    },
    "ki-source": {
      "description": "Declares one named web source for a `ki-sources` list.",
      "events": {},
      "props": {
        "href": {
          "type": "string",
          "description": "Source destination. Accepts HTTP(S) URLs and relative web references.\nThe source list shows the resolved hostname.",
          "required": true,
          "format": "url"
        },
        "snippet": {
          "type": "string",
          "description": "Optional plain-text excerpt displayed in the source card."
        },
        "source-id": {
          "type": "string",
          "description": "Source identifier in this document or shadow root. Overrides the native\nHTML `id` when set. Use this value in guarded specs and in citation refs."
        },
        "title": {
          "type": "string",
          "description": "Required plain-text source title. In HTML use the `title` attribute.",
          "required": true
        }
      },
      "slots": {},
      "tag": "ki-source",
      "whenNotToUse": "For standalone links outside a source list; use `ki-link`.",
      "whenToUse": "As a direct child of `ki-sources`. In HTML provide an `id`,\n`href` and `title`; in guarded specs provide `source-id`, `href` and\n`title`. Use the same identifier on any citation of the source."
    },
    "ki-sources": {
      "description": "A disclosure with the ordered sources behind an answer.",
      "events": {},
      "props": {
        "open": {
          "type": "boolean",
          "description": "Whether the disclosure is expanded. Set to show the list initially.",
          "default": false
        },
        "source-count-label": {
          "type": "string",
          "description": "Localized summary when there is one source. Use `{count}` for its number.",
          "default": "{count} source"
        },
        "sources-count-label": {
          "type": "string",
          "description": "Localized summary for multiple sources. Use `{count}` for their number.",
          "default": "{count} sources"
        }
      },
      "slots": {
        "": "Direct `ki-source` definitions for this answer."
      },
      "tag": "ki-sources",
      "whenNotToUse": "For ordinary navigation, unrelated links, or form controls.",
      "whenToUse": "To show the evidence behind an answer. Add direct `ki-source`\nchildren and place `ki-citation` markers next to the claims they support."
    },
    "ki-spinner": {
      "description": "A compact status for an indeterminate wait.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Localized name of the ongoing activity, such as \"Saving changes\".\nSupply a meaningful label for every spinner, even when the text is hidden.\nUse the activity's name whenever it can be more specific than \"Loading\".",
          "required": true
        },
        "show-label": {
          "type": "boolean",
          "description": "Display the label beside the graphic when sighted users also need the\nactivity description. The same text names the status in either case.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm"
          ],
          "description": "Diameter of the ring. Choose the size that fits the surrounding content.\nDots use a fixed size. Unrecognized values draw the medium ring.",
          "default": "md"
        },
        "variant": {
          "type": "enum",
          "values": [
            "dots",
            "ring"
          ],
          "description": "Use a ring for general inline activity and dots for assistant typing or\nthinking. Unrecognized values draw a ring.",
          "default": "ring"
        }
      },
      "slots": {},
      "tag": "ki-spinner",
      "whenNotToUse": "use ki-progress for page-level work or a known fraction of\na task. Use ki-alert for persistent notices.",
      "whenToUse": "show brief inline activity such as saving a change or running a\ntool. Choose typing dots for an assistant that is thinking. Set a localized\nlabel that names the activity and mount the spinner when the wait starts."
    },
    "ki-stack": {
      "description": "A passive flex layout for content on one axis.",
      "events": {},
      "props": {
        "align": {
          "type": "enum",
          "values": [
            "baseline",
            "center",
            "end",
            "start",
            "stretch"
          ],
          "description": "Cross-axis alignment, stretch by default.",
          "default": "stretch"
        },
        "direction": {
          "type": "enum",
          "values": [
            "column",
            "row"
          ],
          "description": "Main axis, column by default.",
          "default": "column"
        },
        "gap": {
          "type": "enum",
          "values": [
            "10xl",
            "11xl",
            "12xl",
            "13xl",
            "14xl",
            "15xl",
            "16xl",
            "17xl",
            "18xl",
            "19xl",
            "20xl",
            "21xl",
            "22xl",
            "23xl",
            "24xl",
            "25xl",
            "26xl",
            "2xl",
            "3xl",
            "4xl",
            "5xl",
            "6xl",
            "7xl",
            "8xl",
            "9xl",
            "lg",
            "md",
            "sm",
            "xl",
            "xs",
            "xxs",
            "zero"
          ],
          "description": "Kimen spacing step, md by default. Unsupported values keep the default gap.",
          "default": "md"
        },
        "justify": {
          "type": "enum",
          "values": [
            "between",
            "center",
            "end",
            "start"
          ],
          "description": "Main-axis distribution, start by default. Use between to distribute spare space.",
          "default": "start"
        },
        "wrap": {
          "type": "boolean",
          "description": "Allow items to continue on a new line. Defaults to false.",
          "default": false
        }
      },
      "slots": {
        "": "The content in reading order. A direct child with data-grow takes a share of free space."
      },
      "tag": "ki-stack",
      "whenNotToUse": "for page shells, painted grouping (use ki-card), or tabular data.",
      "whenToUse": "arrange content in a vertical sequence or a horizontal row with\nconsistent token spacing."
    },
    "ki-stat": {
      "description": "A key metric with an optional comparison against a reference period.",
      "events": {},
      "props": {
        "delta": {
          "type": "number",
          "description": "Optional finite change. Its sign determines the trend and its magnitude is displayed."
        },
        "delta-label": {
          "type": "string",
          "description": "Localized comparison period, such as \"vs last week\"."
        },
        "direction": {
          "type": "enum",
          "values": [
            "higher-is-better",
            "lower-is-better",
            "neutral"
          ],
          "description": "Which direction is favorable for this metric. Use neutral to avoid a judgment.",
          "default": "higher-is-better"
        },
        "down-label": {
          "type": "string",
          "description": "Localized spoken direction for a negative delta.",
          "default": "down"
        },
        "label": {
          "type": "string",
          "description": "Localized name of the metric, such as \"Median render time\".",
          "required": true
        },
        "unit": {
          "type": "string",
          "description": "Literal suffix for decimal readings, such as \"ms\"."
        },
        "up-label": {
          "type": "string",
          "description": "Localized spoken direction for a positive delta.",
          "default": "up"
        },
        "value": {
          "type": "number",
          "description": "Current finite reading.",
          "required": true
        }
      },
      "slots": {
        "chart": "An optional sparkline after the summary. Give informative\ncharts a textual equivalent, and hide charts that repeat the summary."
      },
      "tag": "ki-stat",
      "whenNotToUse": "Present a sequence of readings or inspect multiple data\npoints. Use a chart or table with a text equivalent for that data.",
      "whenToUse": "Summarize one numeric metric in a dashboard or report. Set\ndirection to lower-is-better for metrics such as latency and neutral for\nchanges that carry no favorable or unfavorable meaning."
    },
    "ki-status": {
      "description": "A tiny, non-interactive status dot that marks the state of a nearby item.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name for the state (\"Online\", \"Build failing\"). With a\nlabel the dot is exposed to assistive technology as a named\nnon-interactive image (role `img`); without one it is decorative and\ncontributes nothing to the accessibility tree — the meaning must then\nlive in adjacent visible text (FR-003, FR-008). The label is never\nrendered visually: visible status text belongs to ki-badge. Runtime\nchanges are not announced (no live region, FR-005)."
        },
        "ring": {
          "type": "boolean",
          "description": "Draws a separating ring around the dot for placement over media (an\navatar photo), keeping it distinguishable from the pixels beneath. A\nper-instance functional axis — MarsUI ships Outline=True|False as\nsibling variants under one theme (recorded deviation from the 002\ntoken-only rule) — while ring width and color stay per-theme\n`--ki-status-ring-*` tokens. The ring paints outside the dot's box and\nnever shifts layout.",
          "default": false
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "info",
            "neutral",
            "success",
            "warning"
          ],
          "description": "Semantic intent, never appearance: each tone resolves its fill from\nthe per-theme `--ki-status-{tone}-color` tokens. An unrecognized value\nmatches no style selector, so the dot keeps the neutral appearance\n(fallback by CSS construction — no validation code, FR-007).",
          "default": "neutral"
        }
      },
      "slots": {},
      "tag": "ki-status",
      "whenNotToUse": "short labeled status text (that pill is ki-badge — this dot\nnever renders text), notification counters or the overlay attachment\nmechanism (a future, separate nav-badge concern), messages that need\nattention or announcement (ki-alert — the dot has no live region),\nprogress or loading (ki-progress). An unlabeled dot without adjacent\nvisible text is an authoring mistake (WCAG 1.4.1).",
      "whenToUse": "mark a state with minimal footprint adjacent to (or overlaid\non) the item it describes: presence on an avatar, health of a service\nlist entry, connection state in a toolbar. Label it (`label`) or pair it\nwith adjacent visible text — color is never the only carrier of the\nmeaning (WCAG 1.4.1)."
    },
    "ki-step": {
      "description": "One authored step in a Stepper.",
      "events": {},
      "props": {
        "description": {
          "type": "string",
          "description": "Optional supporting text displayed below the label."
        },
        "href": {
          "type": "string",
          "description": "Destination for a completed step. Omit for a passive step.",
          "format": "url"
        },
        "state": {
          "type": "enum",
          "values": [
            "current",
            "done",
            "error",
            "upcoming"
          ],
          "description": "The step's progress state. Mark the active step as current.",
          "default": "upcoming"
        }
      },
      "slots": {
        "": "The visible label. Use text or passive inline markup."
      },
      "tag": "ki-step",
      "whenNotToUse": "Standalone or with interactive content in the label.\nA completed step can make the label itself a link.",
      "whenToUse": "Place directly inside ki-stepper in task order. Its default slot\nis the step label and its properties describe the step to the owning list."
    },
    "ki-stepper": {
      "description": "An ordered, responsive view of progress through named steps.",
      "events": {},
      "props": {
        "count-label": {
          "type": "string",
          "description": "Compact disclosure text without a current step. Include {total}.",
          "default": "Steps ({total})"
        },
        "current-label": {
          "type": "string",
          "description": "Localized text for the current step.",
          "default": "Current"
        },
        "done-label": {
          "type": "string",
          "description": "Localized text for a completed step.",
          "default": "Completed"
        },
        "error-label": {
          "type": "string",
          "description": "Localized text for a step that has an error.",
          "default": "Error"
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the list. Use a localized description of the task.",
          "required": true
        },
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Use vertical for a stacked list. Horizontal layout compacts below 22rem.",
          "default": "horizontal"
        },
        "summary-label": {
          "type": "string",
          "description": "Compact disclosure text. Place {current} and {total} in the local order.",
          "default": "Step {current} of {total}"
        },
        "upcoming-label": {
          "type": "string",
          "description": "Localized text for an upcoming step.",
          "default": "Not started"
        }
      },
      "slots": {
        "": "Direct ki-step children in task order. The stepper assigns each\nchild to its row automatically."
      },
      "tag": "ki-stepper",
      "whenNotToUse": "A percentage or indeterminate task, a carousel position,\nor navigation among peer views. The task owner updates step states.",
      "whenToUse": "Show the current place in onboarding, checkout or a wizard.\nProvide a label and direct ki-step children in task order."
    },
    "ki-suggestion": {
      "description": "A native prompt button displayed by a ki-suggestions group.",
      "events": {},
      "props": {
        "description": {
          "type": "string",
          "description": "Optional accessible description, visible below the title in cards."
        }
      },
      "slots": {
        "": "Plain text forming the visible and accessible prompt title."
      },
      "tag": "ki-suggestion",
      "whenNotToUse": "navigation, static content, or a submitted form value.",
      "whenToUse": "offer one short, actionable prompt in a suggestion group."
    },
    "ki-suggestions": {
      "description": "A labelled group of prompt starters or follow-up suggestions.",
      "events": {
        "ki-select": "Reports the chosen prompt title. Use this event to send the prompt in\nsend mode. Cancel it to take over the default composer write and focus."
      },
      "props": {
        "label": {
          "type": "string",
          "description": "Required accessible name for the group.",
          "required": true
        },
        "mode": {
          "type": "enum",
          "values": [
            "fill",
            "send"
          ],
          "description": "Send through the application or fill its attached editor for revision.",
          "default": "send"
        },
        "variant": {
          "type": "enum",
          "values": [
            "cards",
            "chips"
          ],
          "description": "Wrapping chips for follow-ups or cards with room for a description.",
          "default": "chips"
        }
      },
      "slots": {
        "": "Direct ki-suggestion children in reading order."
      },
      "tag": "ki-suggestions",
      "whenNotToUse": "choose a form value, switch views, or display static example text.",
      "whenToUse": "offer suggested prompts to start or continue an assistant conversation."
    },
    "ki-switch": {
      "description": "A token-styled switch for immediate on/off settings.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired once after a user toggle commits, composed across the shadow\nboundary; `checked` is already current when listeners run. `click()` from a\nscript, or a page `<label>` for the switch, toggles it like a native\ncheckbox: one `input`, then one `change`. When to use:\napply the on/off effect. When NOT to use: do not expect it for programmatic\n`checked` writes, which are silent."
      },
      "props": {
        "checked": {
          "type": "boolean",
          "description": "Live on/off state. Boolean presence semantics apply: any present\n`checked` attribute value, including `checked=\"false\"` or malformed\nagent output, means on. Omit the attribute to express off.\nWhen to use: set the initial on state for a setting that applies\nimmediately.\nWhen NOT to use: do not use a switch for choices saved only on submit;\nuse ki-checkbox for that pattern.",
          "default": false
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted setting (\"Two-step sign-in needs a phone number\"). While it\nholds text the switch is invalid, blocks its form, shows the text in\nplace of the help text at once and is announced as invalid. It stops\ncounting when the person toggles the switch, or when the form is reset,\nso it never blocks the corrected answer. It outranks an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for help that is not an error; use\n`help-text`. Setting the same text again while the prop still holds it\nshows nothing: remove it first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents toggling, removes the switch from keyboard reach, excludes it\nfrom form data, and exposes the unavailable state to assistive technology.\nWhen to use: make a setting temporarily unavailable while preserving its\ncurrent state.\nWhen NOT to use: do not use disabled for pending or loading states.",
          "default": false
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the switch, read with it as its description: what\nturning it on changes.\nWhen NOT to use: do not repeat the label. A switch has no constraint of\nits own, so it takes no error text; an error the application sets with\n`custom-error` or `setCustomValidity` shows in this line's place."
        },
        "name": {
          "type": "string",
          "description": "Form-data key contributed while the switch is on.\nWhen to use: include the immediate setting in native form data when on.\nWhen NOT to use: omit when no form entry should be submitted."
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl"
          ],
          "description": "Token-backed size: the track is 32 x 18, 40 x 22, 48 x 26 or 56 x 32px in\nonmars (`xl` is the design's mobile size), with its thumb. `sm` also takes\nthe smaller label (13/20, 8px away). An unrecognized value matches no\nstyle rule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Form-data value submitted while on. Omit for native checkbox parity: the\nsubmitted value defaults to `on`.\nWhen to use: submit a domain-specific value instead of the default `on`.\nWhen NOT to use: do not set a value to represent off; off contributes\nnothing."
        }
      },
      "slots": {
        "": "Label content. This is the accessible name source."
      },
      "tag": "ki-switch",
      "whenNotToUse": "selections collected for later form submission; use\nki-checkbox for recorded choices, ki-radio-group for mutually exclusive\nchoices, and ki-button for actions.",
      "whenToUse": "binary settings whose change takes effect immediately, always\nwith a slotted label."
    },
    "ki-tab": {
      "description": "One selectable tab inside a `ki-tabs` view switcher.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents selection by every modality and exposes the unavailable state.\nBoolean presence semantics apply: `disabled=\"false\"` is still disabled.",
          "default": false
        },
        "selected": {
          "type": "boolean",
          "description": "Output-only selected state written by `ki-tabs`. Set the group's `value`\nto choose an initial tab; author-set `selected` is overwritten.",
          "default": false
        },
        "value": {
          "type": "string",
          "description": "Pairing identifier shared with a `ki-tab-panel`. The first tab with a\nvalue owns it; later duplicates render but are not selectable.",
          "default": ""
        }
      },
      "slots": {
        "": "Required visible text label and accessible name source.",
        "end": "Trailing icon or media. Follows writing direction.",
        "icon": "Decorative SVG. Supply visible text in the default slot.",
        "start": "Leading icon or media. Follows writing direction."
      },
      "tag": "ki-tab",
      "whenNotToUse": "standalone, for form value\nselection, or for page navigation; use the parent group's `value` instead\nof authoring `selected`.",
      "whenToUse": "label one peer content view inside `ki-tabs`, with optional\ndecorative `icon` and `start` or `end` slot media."
    },
    "ki-tab-panel": {
      "description": "One content view paired with a `ki-tab` inside `ki-tabs`.",
      "events": {},
      "props": {
        "value": {
          "type": "string",
          "description": "Pairing identifier shared with a `ki-tab`. The first panel with a value\nowns it; duplicate or orphan panels stay hidden.",
          "default": ""
        }
      },
      "slots": {
        "": "Panel content."
      },
      "tag": "ki-tab-panel",
      "whenNotToUse": "standalone, as lazy mounting, or for page\nnavigation; orphan and duplicate panels are hidden by the parent group.",
      "whenToUse": "hold the content for one peer tab view, sharing `value` with\nits `ki-tab`."
    },
    "ki-table": {
      "description": "A scrollable frame for a native data table with optional sorting and selection.",
      "events": {
        "ki-selection-change": "A person changes selection with a checkbox. The event supplies the selected\ndata-key values in displayed order.",
        "ki-sort": "A person activates a sortable column. Use the key and direction to sort records\nand move aria-sort to the active header. The event is a request."
      },
      "props": {
        "density": {
          "type": "enum",
          "values": [
            "compact",
            "default"
          ],
          "description": "Row density. Default measures 48px and compact measures 40px at a 16px root on desktop.",
          "default": "default"
        },
        "loading": {
          "type": "boolean",
          "description": "Makes the native table busy and adds a decorative loading row after the current records.",
          "default": false
        },
        "row-selection-label": {
          "type": "string",
          "description": "Accessible name template for each row checkbox. Include {row} for the row header or key.",
          "default": "Select {row}"
        },
        "select-all-label": {
          "type": "string",
          "description": "Accessible name for the bulk selection checkbox. Translate for the page language.",
          "default": "Select all rows"
        },
        "selectable": {
          "type": "boolean",
          "description": "Adds a leading selection column with a checked, mixed or unchecked bulk control.\nGive each selectable body row a distinct, nonempty data-key. Register\nki-checkbox alongside ki-table when using individual component imports.",
          "default": false
        },
        "sticky-header": {
          "type": "boolean",
          "description": "Keeps the native column header in view inside a vertically constrained frame.",
          "default": false
        }
      },
      "slots": {
        "": "One native light-DOM table with a caption, head and body. Use data-sort\non sortable headers and data-key on each record available for selection."
      },
      "tag": "ki-table",
      "whenNotToUse": "Lay out a screen, show a short one-line list, or present the\nname-value details of one record. Use CSS grid, ki-list or a description list.",
      "whenToUse": "Show records with shared fields that people compare, scan or sort.\nSupply a native caption, column headers with scope=\"col\" and record headers\nwith scope=\"row\". Mark numeric cells with data-numeric and secondary cells\nwith data-meta. The host application supplies the native table markup."
    },
    "ki-tabs": {
      "description": "A tab group for switching between peer content views.",
      "events": {
        "ki-change": "Fired once after a user-driven selection change from pointer or keyboard\nnavigation. `detail.value` is the resolved selected value and `value` is\nalready current when listeners run. Programmatic `value` writes and\nfirst-render fallback are silent."
      },
      "props": {
        "icon-layout": {
          "type": "enum",
          "values": [
            "inline",
            "stacked"
          ],
          "description": "Positions the decorative icon relative to its tab label. When omitted,\nprimary stacks the icon above the label and secondary puts it inline."
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the tablist. Always provide one when multiple tab\ngroups may appear in a view. When NOT to use: do not use `label` as a\nvisible heading; render visible context in surrounding content."
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed strip size: every `ki-tab` it holds is 24, 32, 40, 48 or\n56px tall in onmars, with its text, and the gap between tabs follows.\nThe strip decides for all its tabs; a tab has no size of its own. An\nunrecognized value matches no style rule and keeps the medium metrics.\nWhen to use: match the size of the controls around the strip.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Resolved selected value. The attribute declares the initial request;\nthe live property falls back to the first enabled owner tab, or `\"\"`\nwhen no tab is selectable. Programmatic writes are silent.",
          "default": ""
        },
        "variant": {
          "type": "enum",
          "values": [
            "primary",
            "secondary"
          ],
          "description": "Visual treatment for the group. Use one primary group per screen and\nsecondary groups within content.",
          "default": "primary"
        }
      },
      "slots": {
        "": "`ki-tab` and `ki-tab-panel` children. Tabs are auto-assigned to an\ninternal named slot as managed output."
      },
      "tag": "ki-tabs",
      "whenNotToUse": "selecting form values\n(use `ki-radio-group`), page navigation (use links), step flows, or\nstandalone `ki-tab` / `ki-tab-panel` children outside this group.",
      "whenToUse": "switch between small sets of peer views inside the same page,\nwith one visible panel at a time. Use primary for the screen-level group\nand secondary inside content."
    },
    "ki-textarea": {
      "description": "A token-styled multiline text field with native form semantics.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously, on the custom-elements build (not on hosts\ncreated by the lazy loader).",
      "events": {
        "change": "Fired when the user commits an edited value (on blur, with native\ntextarea timing), composed across the shadow boundary; `value` is already\ncurrent when listeners run. When to use: react to a committed value. When\nNOT to use: do not use it for per-keystroke updates; the native `input`\nevent carries those."
      },
      "props": {
        "appearance": {
          "type": "enum",
          "values": [
            "default",
            "filled",
            "outlined"
          ],
          "description": "Field appearance. `default` uses the current theme, `outlined` draws a\nfull border, and `filled` uses a tinted surface and bottom indicator.\nThe visible label stays above the field.\nWhen to use: set an explicit appearance when fields must share a shape\nacross themes.",
          "default": "default"
        },
        "autocomplete": {
          "type": "string",
          "description": "Autofill detail token forwarded to the native textarea.\nWhen to use: expose entry purpose such as `street-address` when available.\nWhen NOT to use: omit when no valid autofill purpose applies."
        },
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted text (\"This title is taken\"). While it holds text the field is\ninvalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nchange of the text, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required` or a length limit the field\nenforces itself; `error-text` words those. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables editing, focus, validation and form-data contribution.\nWhen to use: make a field temporarily unavailable. When NOT to use: do not\nuse disabled for readonly review text that should submit.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Message shown in place of the help text once the person's answer fails a\nconstraint (`required` or a length limit), and the field's `validationMessage`. Say how to\nfix the answer. Without it the browser's own message shows, in the\nbrowser's language. An error set with `custom-error` or\n`setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those."
        },
        "help-text": {
          "type": "string",
          "description": "One line of help under the field, read with it as its description: what\nto write, or how long. While an error shows, the error takes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`."
        },
        "label": {
          "type": "string",
          "description": "Visible label rendered by the component and used as the accessible name.\nWhen to use: always provide a concise label for the requested long-form\ntext. When NOT to use: do not substitute placeholder text for the label.",
          "required": true
        },
        "label-hint": {
          "type": "string",
          "description": "Short text shown after the label and read with it as part of the field's\nname, so people know before submitting whether to answer: \"(optional)\" on\nthe few optional fields of a mostly required form, or \"(required)\" the\nother way round, in the page's own language. It changes no validation;\nset `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions or length limits in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label."
        },
        "maxlength": {
          "type": "number",
          "description": "Soft maximum in UTF-16 code units. Longer user edits and assigned values\nare preserved and fail form validation with `validity.tooLong`.\nWhen to use: let people revise an over-limit draft without losing text.",
          "minimum": 0,
          "maximum": 2147483647
        },
        "maxlength-error-text": {
          "type": "string",
          "description": "Localized message for an over-limit value. `error-text` and\n`setCustomValidity()` take precedence.\nWhen to use: translate the soft maximum message for the page language.",
          "default": "Shorten the text to fit the character limit."
        },
        "minlength": {
          "type": "number",
          "description": "Native minimum length in UTF-16 code units for a nonempty user edit.\nWhen to use: require a minimum number of characters in an answer.",
          "minimum": 0,
          "maximum": 2147483647
        },
        "name": {
          "type": "string",
          "description": "Form-data key used when the textarea submits with a form.\nWhen to use: provide for fields whose text must be included in FormData.\nWhen NOT to use: omit for display-only or client-only fields."
        },
        "placeholder": {
          "type": "string",
          "description": "Hint shown while the textarea is empty.\nWhen to use: add an example or short formatting hint. When NOT to use: do\nnot use placeholder as the accessible name or required instruction."
        },
        "readonly": {
          "type": "boolean",
          "description": "Makes the textarea focusable and selectable while rejecting edits.\nWhen to use: show submitted or policy text that should still be included\nin form data. When NOT to use: do not use readonly to remove a field from\nsubmission; use disabled.",
          "default": false
        },
        "required": {
          "type": "boolean",
          "description": "Requires a non-empty value before form submission.\nWhen to use: mark mandatory long-form text. When NOT to use: do not pair\nwith `readonly` expecting it to block; readonly fields are validation\nexempt like native textareas.",
          "default": false
        },
        "rows": {
          "type": "number",
          "description": "Visible line count. Invalid, non-numeric, zero, or negative values fall\nback to 2; no auto-grow or user resize handle exists in v1.\nWhen to use: set the stable multiline height needed by the layout. When\nNOT to use: do not use rows as a responsive size axis.",
          "default": 2
        },
        "show-count": {
          "type": "boolean",
          "description": "Shows the current count and maximum next to the help or error text and\nannounces reaching or exceeding the limit. Requires `maxlength`.\nWhen to use: give people feedback while writing to a limit.",
          "default": false
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl",
            "xs"
          ],
          "description": "Token-backed field size (`--ki-textarea-{size}-*` tokens): padding,\nradius and text; the label and help text follow in three steps. The\nheight stays `rows` lines. An unrecognized value matches no style rule\nand keeps the medium metrics.\nWhen to use: match the size of the fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.",
          "default": "md"
        },
        "value": {
          "type": "string",
          "description": "Live current text. The `value` attribute declares the reset default;\nelement text content is ignored. Programmatic assignments replace the\ndisplay and emit no events.\nWhen to use: preload or read free-form text, line breaks included. When\nNOT to use: do not put initial text between the element tags.",
          "default": ""
        }
      },
      "slots": {},
      "tag": "ki-textarea",
      "whenNotToUse": "single-line values (`ki-input`), constrained choices,\nrich or formatted text editing, or search boxes.\n\nAgent note: initial text is declared through the `value` attribute; element\ntext content is ignored. Enter inserts a line break and never submits the\nenclosing form, the inverse of `ki-input`.",
      "whenToUse": "free-form text longer than one line, such as comments,\ndescriptions, messages, delivery notes, or addresses when paired with a\nmatching `autocomplete` purpose."
    },
    "ki-time-input": {
      "description": "A time-of-day field with locale-aware typing and suggested slots. The shadow\nroot keeps the combobox and listbox in the same accessibility ID scope.\nThe host owns native form participation.",
      "events": {
        "change": "Native-style composed event for a changed user commit.",
        "ki-change": "Emitted when a person commits a different canonical time or clears it."
      },
      "props": {
        "custom-error": {
          "type": "string",
          "description": "An error of the application's own, such as a server-side verdict on the\nsubmitted time (\"That slot was just booked\"). While it holds text the\nfield is invalid, blocks its form, shows the text in place of the help\ntext at once and is announced as invalid. It stops counting at the\nperson's next edit or pick of a time, or when the form is reset, so it\nnever blocks the corrected answer. It outranks `error-text` and an error\nset with `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required`, the bounds or unreadable\ntext, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables typing, suggestions and form participation.",
          "default": false
        },
        "error-text": {
          "type": "string",
          "description": "Validation message to show after blur or a blocked form submission. A `custom-error` outranks it."
        },
        "help-text": {
          "type": "string",
          "description": "Guidance read with the field until a validation error replaces it."
        },
        "invalid-time-text": {
          "type": "string",
          "description": "Fallback validation message for invalid time syntax or bounds.",
          "default": "Enter a valid time within the allowed range."
        },
        "label": {
          "type": "string",
          "description": "Visible text naming the time field. Provide it for every use.",
          "required": true
        },
        "list-label": {
          "type": "string",
          "description": "Accessible name of the suggestion listbox.",
          "default": "Suggested times"
        },
        "max": {
          "type": "string",
          "description": "Latest allowed wall-clock time in HH:mm, inclusive."
        },
        "min": {
          "type": "string",
          "description": "Earliest allowed wall-clock time in HH:mm, inclusive."
        },
        "name": {
          "type": "string",
          "description": "Name under which the canonical time is submitted."
        },
        "picker-label": {
          "type": "string",
          "description": "Accessible name of the button that opens suggestions.",
          "default": "Choose time"
        },
        "required": {
          "type": "boolean",
          "description": "Empty values block form submission when true.",
          "default": false
        },
        "step": {
          "type": "number",
          "description": "Suggested slot interval in whole minutes. Typed times keep their exact minutes.",
          "default": 30
        },
        "time-zone": {
          "type": "string",
          "description": "IANA timezone shown alongside help. Does not change wall-clock values."
        },
        "value": {
          "type": "string",
          "description": "Committed wall-clock time in HH:mm, or empty. The attribute sets the form reset value.",
          "default": ""
        }
      },
      "slots": {
        "start": "Optional leading adornment, outside the input's accessible name."
      },
      "tag": "ki-time-input",
      "whenNotToUse": "durations, dates or timestamps. Pair with a date field when\nthe day matters. Timezone conversion belongs to the application.",
      "whenToUse": "collect an exact time of day or offer regular appointment slots.\nProvide a visible label and set bounding times when the schedule is limited."
    },
    "ki-timeline": {
      "description": "A chronological list of activity, audit records, or steps from a run.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the ordered list."
        },
        "order": {
          "type": "enum",
          "values": [
            "newest-first",
            "oldest-first"
          ],
          "description": "Chronological order of valid dates. Ties and undated entries retain source\norder. Undated entries follow valid dates in either direction.",
          "default": "newest-first"
        }
      },
      "slots": {
        "": "Direct ki-timeline-item children."
      },
      "tag": "ki-timeline",
      "whenNotToUse": "offer a selectable command list, control the current step of a\ntask, or represent progress toward completion.",
      "whenToUse": "present chronological events with independently readable summaries,\noptional times and details, including new entries in a live feed."
    },
    "ki-timeline-item": {
      "description": "One event in a timeline, with an optional time and details disclosure.",
      "events": {},
      "props": {
        "datetime": {
          "type": "string",
          "description": "ISO date or date-time. Invalid or missing dates have no time label."
        },
        "details-label": {
          "type": "string",
          "description": "Label of the details control when the details slot is populated.",
          "default": "Details"
        },
        "icon-name": {
          "type": "string",
          "description": "Decorative Lucide icon name, registered by the caller's per-icon import."
        },
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "primary",
            "success",
            "warning"
          ],
          "description": "Marker tone. The event text carries the meaning. Without an icon, a\nnon-neutral tone draws a solid dot in its ink.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Event summary. Include important status information in the text.",
        "details": "Additional event information in a native details disclosure.",
        "start": "Decorative avatar or other noninteractive marker in place of the icon."
      },
      "tag": "ki-timeline-item",
      "whenNotToUse": "convey the outcome only through marker colour, or use the marker\nas a control. Put actions in the event content or details.",
      "whenToUse": "describe an activity, audit, or run event inside a ki-timeline."
    },
    "ki-toast": {
      "description": "A short, transient message about something the person just did, shown\nwithout blocking the page. It leaves on its own after its time, which stops\nwhile the person points at the toaster, works inside it or is away from the\npage; a toast with an action, or reporting an error, waits for the person.",
      "events": {
        "ki-dismiss": "Fired once when the toast leaves because its time ran out\n(`reason: \"timeout\"`), the person used the dismiss button (`\"button\"`),\npressed Escape inside it (`\"escape\"`) or activated its action\n(`\"action\"`), after it is hidden and focus has been handed on. Not\ncancelable. When to use: remove the element, or record that the message\nwas seen. When NOT to use: do not expect it for programmatic `dismissed`\nchanges."
      },
      "props": {
        "dismiss-label": {
          "type": "string",
          "description": "Accessible name of the dismiss button. Override for localization; the\ndefault English word is the component's only built-in text.\n\nWhen to use: whenever the document language is not English.\nWhen NOT to use: do not put the message here; use the default slot.",
          "default": "Dismiss"
        },
        "dismissed": {
          "type": "boolean",
          "description": "Reflected state: true once the toast has left. The timer, the dismiss\nbutton, Escape and the action set it; the page may set or clear it.\nWhile true the host stays in the document but renders nothing and leaves\nthe accessibility tree. Clearing it shows the toast again with its full\ntime.\n\nWhen to use: show a toast again, or close it from the page.\nWhen NOT to use: do not read programmatic changes as dismissals;\n`ki-dismiss` reports only the timer and the person.",
          "default": false
        },
        "dismissible": {
          "type": "boolean",
          "description": "Shows the dismiss button, a ghost `ki-icon-button` named by\n`dismiss-label`. Escape still dismisses a focused toast without it.\n\nWhen to use: keep it on unless the toast leaves on its own and the page\noffers no other way to read it again.\nWhen NOT to use: do not turn it off on a toast that waits for the person.",
          "default": true
        },
        "duration": {
          "type": "number",
          "description": "How long the toast stays, in milliseconds, before it leaves on its own;\n`0` keeps it until it is dismissed. Ignored (treated as `0`) when the toast\nholds an action or its tone is `danger`. Unset, or not a finite number of\nzero or more, it is 5000. The time stops while the pointer rests on the\ntoaster, while focus is inside it, or while the page is hidden, and\ncontinues with what was left. Changing it restarts the time.\n\nWhen to use: give a longer message more time.\nWhen NOT to use: do not shorten it below what a person needs to read the\nmessage.",
          "minimum": 0
        },
        "heading": {
          "type": "string",
          "description": "Optional bold first line, inside the live region. Empty strings render no\nheading. It is a `strong` element, never a document heading.\n\nWhen to use: a short label for the event (\"Changes saved\").\nWhen NOT to use: do not use it for page structure."
        },
        "queued": {
          "type": "boolean",
          "description": "Output-only state written by an enclosing `ki-toaster`: true while the\ntoast waits for a place. A queued toast renders nothing, is absent from\nthe accessibility tree and its time does not run. Authors do not set it;\nthe toaster overwrites it.",
          "default": false
        },
        "tone": {
          "type": "string",
          "documentedValues": [
            "danger",
            "info",
            "neutral",
            "success",
            "warning"
          ],
          "description": "Picks the icon and its ink, and the live-region urgency: `danger` exposes\n`role=\"alert\"` and never leaves on its own; `neutral`, `info`, `success`,\n`warning`, absent and unrecognized values expose `role=\"status\"`. The\nsurface and the text look the same in every tone. Unknown values render\nneutral.\n\nWhen to use: choose the tone that describes what happened.\nWhen NOT to use: do not use tone for emphasis; a lasting failure belongs\nin `ki-alert`.",
          "default": "neutral"
        }
      },
      "slots": {
        "": "Message text. It lives inside the live-region boundary.",
        "action": "At most one action, as a `ki-button size=\"sm\" variant=\"ghost\"`.\nIts own click handler runs, then the toast leaves (`reason: \"action\"`). A\ntoast holding an action never leaves on its own. When NOT to use: a response\nthe person cannot skip belongs in `ki-dialog`."
      },
      "tag": "ki-toast",
      "whenNotToUse": "anything the person must read or act on to continue belongs\nto `ki-dialog`; form validation belongs to the field's error text; a lasting\ncondition of the page belongs to `ki-alert`, which stays inline.\n\nAssistive technology note: a toast announces as it appears, so append it\nwhen the event happens; a toast present at initial page load is exposed with\nits role but its announcement is not guaranteed. The heading and the message\nare the whole announcement: the icon, the action and the dismiss button\nstay outside the live region.",
      "whenToUse": "confirm an action that happened elsewhere on screen (\"Changes\nsaved\", \"Link copied\"), report a background result (\"Export ready\"), or\noffer a quick undo. Raise it into a `ki-toaster`, in markup or with its\n`show()` method; express urgency with `tone`."
    },
    "ki-toaster": {
      "description": "The one place toasts appear: it paints its `ki-toast` children in the top\nlayer at a corner of the viewport, stacks them in arrival order, shows the\nnewest few and queues the older ones, without covering the page beside\nthem.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the group the toaster exposes while it shows toasts.\nOverride for localization.\n\nWhen to use: provide the name in the document language.\nWhen NOT to use: do not put a message here.",
          "default": "Notifications"
        },
        "max": {
          "type": "number",
          "description": "How many toasts show at once: the newest ones. Older toasts wait, and come\nback with their full time as shown ones leave. A toast holding focus keeps\nits place until focus leaves the toaster; the oldest other one waits\ninstead. A value below 1 or not a whole number shows 3.\n\nWhen to use: lower it on small screens or busy applications.\nWhen NOT to use: do not raise it to show every toast; a tall stack covers\nthe page.",
          "default": 3,
          "minimum": 1
        },
        "placement": {
          "type": "string",
          "documentedValues": [
            "bottom-center",
            "bottom-end",
            "top-center",
            "top-end"
          ],
          "description": "Corner or edge of the viewport the stack sits against; `end` follows the\nwriting direction. On a coarse pointer and a viewport narrower than 40rem\nthe stack always sits at the bottom center. Unknown values place the stack\nat the bottom end.\n\nWhen to use: keep toasts away from where the page's own controls live.\nWhen NOT to use: do not change it per toast; one toaster keeps one place.",
          "default": "bottom-end"
        }
      },
      "slots": {
        "": "The `ki-toast` elements, in arrival order. Other children are not\ncounted, queued or placed."
      },
      "tag": "ki-toaster",
      "whenNotToUse": "do not put anything but `ki-toast` elements in it; do not use\nit for persistent content, which belongs in the page or in `ki-alert`.\n\nAssistive technology note: while it shows toasts the toaster is a group\nnamed by `label`, never a landmark; F6 moves focus into it and Escape on a\ntoast returns focus to where it was. An empty toaster exposes nothing and\ncovers nothing.",
      "whenToUse": "once per page (or once inside a modal `ki-dialog`), as the place\nevery `ki-toast` of the application appears in: append toasts to it, or call\n`show()`. Choose the corner with `placement`."
    },
    "ki-tool-call": {
      "description": "A disclosure for one assistant tool call, with a status and optional payloads.",
      "events": {
        "ki-tool-retry": "A request to retry this tool call. Bind a declared surface action to handle it."
      },
      "props": {
        "approval-label": {
          "type": "string",
          "description": "Status text for a call waiting on an approval decision.",
          "default": "Needs approval"
        },
        "done-label": {
          "type": "string",
          "description": "Status text for a successful call.",
          "default": "Done"
        },
        "duration": {
          "type": "number",
          "description": "Non-negative elapsed time in milliseconds. Displayed only for Done.",
          "minimum": 0
        },
        "error-label": {
          "type": "string",
          "description": "Caption for the error slot.",
          "default": "Error"
        },
        "failed-label": {
          "type": "string",
          "description": "Status text for a failed call.",
          "default": "Failed"
        },
        "input-label": {
          "type": "string",
          "description": "Caption for the input slot.",
          "default": "Input"
        },
        "locale": {
          "type": "string",
          "description": "Language tag used to format the completed duration. Defaults to English.",
          "default": "en"
        },
        "name": {
          "type": "string",
          "description": "Tool identifier, such as search_docs, displayed in monospace.",
          "required": true
        },
        "open": {
          "type": "boolean",
          "description": "Override the disclosure state. Without an override, failed calls are open\nand other calls are closed. Set open=\"false\" for an explicit collapse.\nUsing the summary sets the property to the reader's choice."
        },
        "output-label": {
          "type": "string",
          "description": "Caption for the output slot.",
          "default": "Output"
        },
        "pending-label": {
          "type": "string",
          "description": "Status text for a call waiting to run.",
          "default": "Pending"
        },
        "retry-label": {
          "type": "string",
          "description": "Visible and accessible label for the built-in retry control.",
          "default": "Retry"
        },
        "retryable": {
          "type": "boolean",
          "description": "Offer the built-in Retry button when the call fails.",
          "default": false
        },
        "running-label": {
          "type": "string",
          "description": "Status text for a call in progress.",
          "default": "Running"
        },
        "status": {
          "type": "enum",
          "values": [
            "approval",
            "done",
            "failed",
            "pending",
            "running"
          ],
          "description": "Lifecycle status. Unknown values display Pending.",
          "default": "pending"
        },
        "title": {
          "type": "string",
          "description": "Optional human-readable label displayed beside the identifier."
        }
      },
      "slots": {
        "error": "A failure message or a consumer-owned retry control, visible on failed calls.",
        "input": "Arguments supplied to the tool. Use ki-code-block for structured text.",
        "output": "Result returned by the tool. Use ki-code-block for structured text."
      },
      "tag": "ki-tool-call",
      "whenNotToUse": "collecting approval, running or configuring tools. Pair with a\nseparate confirmation control for an approval decision.",
      "whenToUse": "show which tool ran, its state and duration, and let the reader\ninspect the supplied input, output or error. Use a conversation log for status updates."
    },
    "ki-toolbar": {
      "description": "Brings frequent page actions together in a floating pill or docked surface.",
      "events": {},
      "props": {
        "hide-on-scroll": {
          "type": "boolean",
          "description": "Hides on downward page scroll and reveals on upward scroll or when an\naction receives focus. Use for secondary actions where content needs room.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Accessible name for the group, such as \"Formatting\". Supply it in the page's language.",
          "required": true
        },
        "orientation": {
          "type": "enum",
          "values": [
            "horizontal",
            "vertical"
          ],
          "description": "Layout and keyboard axis. Set vertical for a floating column. Docked is always horizontal.",
          "default": "horizontal"
        },
        "tone": {
          "type": "enum",
          "values": [
            "standard",
            "vibrant"
          ],
          "description": "Surface palette. Use vibrant to emphasize the toolbar with an accent tint.",
          "default": "standard"
        },
        "variant": {
          "type": "enum",
          "values": [
            "docked",
            "floating"
          ],
          "description": "Floating leaves placement to the page. Docked fixes the surface to the\nviewport's bottom edge. Reserve space below the content when docking.",
          "default": "floating"
        }
      },
      "slots": {
        "": "Direct ki-button, ki-icon-button (including toggles), native button\nand ki-divider children. Give every icon-only action an accessible name.",
        "fab": "A companion ki-fab for the floating variant. It follows the\ntoolbar and has its own Tab stop."
      },
      "tag": "ki-toolbar",
      "whenNotToUse": "for site navigation, mutually exclusive choices, or a docked\nbar on a screen already using MobileNav.",
      "whenToUse": "group a small set of related page actions, such as text\nformatting or the commands on a compact message screen."
    },
    "ki-tooltip": {
      "description": "A transient, text-only hint with an optional heading.",
      "events": {},
      "props": {
        "for": {
          "type": "string",
          "description": "ID of the rich tooltip's external trigger in the same document or shadow tree.",
          "format": "idref"
        },
        "heading": {
          "type": "string",
          "description": "Rich tooltip heading. Pair it with `for` and optional direct text in the default slot."
        },
        "label": {
          "type": "string",
          "description": "The entire plain tooltip content. The string is reflected to the slotted\ntrigger's accessible description without changing its name. Empty or\nwhitespace-only labels render no tooltip and expose no description.\nWhen to use: a short hint that clarifies the slotted trigger.\nWhen NOT to use: never use `label` for essential information, rich\ncontent, interactive content, validation messages, or information attached\nto disabled controls; put that content in visible UI or a popover.",
          "default": ""
        },
        "placement": {
          "type": "enum",
          "values": [
            "bottom",
            "end",
            "start",
            "top"
          ],
          "description": "Preferred placement for the tooltip. The component may flip or clamp the\nrendered placement to keep the bubble inside the viewport; unknown runtime\nvalues fall back to `top`.\nWhen NOT to use: do not depend on placement for meaning or reading order.",
          "default": "top"
        }
      },
      "slots": {
        "": "One trigger for a plain tooltip, or direct explanatory text when\n`for` and `heading` are provided. Rich tooltips accept text only."
      },
      "tag": "ki-tooltip",
      "whenNotToUse": "essential or unique information in a tooltip; interactive\ncontent in a tooltip; form validation messages, disabled controls, or\ntouch-primary flows. Use visible layout text or a rich `ki-popover` with\n`kind=\"toggletip\"` when the content includes actions.",
      "whenToUse": "add a brief clarifying hint for an icon-only, abbreviated, or\notherwise ambiguous control when the same information is discoverable\nelsewhere in the interface."
    },
    "ki-top-nav": {
      "description": "Application navigation with responsive primary links, or a per-screen app\nbar with a real heading, optional search, and overflow actions.",
      "events": {},
      "props": {
        "collapse-at": {
          "type": "string",
          "description": "CSS length below which navigation collapses and single-row app bars can center their title.\n`none` never collapses: links that do not fit wrap onto more lines.",
          "default": "48rem"
        },
        "heading-level": {
          "type": "number",
          "description": "Native heading level for the screen title. Use 1 through 6 to fit the page outline.",
          "default": 1
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the header's primary navigation landmark. Override for localization.",
          "default": "Main"
        },
        "navigation-label": {
          "type": "string",
          "description": "Accessible name for the compact navigation button and menu. Override for localization.",
          "default": "Open navigation"
        },
        "overflow-label": {
          "type": "string",
          "description": "Accessible name for the app-bar overflow button and menu. Override for localization.",
          "default": "More actions"
        },
        "scroll-behavior": {
          "type": "enum",
          "values": [
            "collapse",
            "elevate",
            "none"
          ],
          "description": "Tint on scroll with elevate, also shrink tall bars with collapse, or opt out with none.",
          "default": "elevate"
        },
        "size": {
          "type": "enum",
          "values": [
            "lg",
            "md",
            "sm",
            "xl"
          ],
          "description": "Bar size. Only app-bar mode has large and extra-large two-row sizes.",
          "default": "md"
        },
        "sticky": {
          "type": "boolean",
          "description": "Keep the bar at the block start of the scroll container and draw a bottom border.",
          "default": false
        },
        "subtitle": {
          "type": "string",
          "description": "Supporting text displayed under the screen heading.",
          "default": ""
        },
        "title": {
          "type": "string",
          "description": "Screen heading, set with the HTML title attribute or the screenTitle property.",
          "default": ""
        },
        "title-align": {
          "type": "enum",
          "values": [
            "center",
            "start"
          ],
          "description": "Center a compact single-row title when the app bar has at most one action.",
          "default": "start"
        },
        "variant": {
          "type": "enum",
          "values": [
            "app-bar",
            "header"
          ],
          "description": "Header for primary navigation, or app-bar for the current screen. Defaults to header.",
          "default": "header"
        }
      },
      "slots": {
        "": "Header mode: up to five direct native anchors; mark the current one with\naria-current=\"page\". They stay the page's own anchors, so the page's link\nrules reach them and outrank the bar's link styles (CSS Scoping gives the\npage's styles precedence over a component's `::slotted()` rules, whatever\ntheir specificity). `a { color: inherit }` is safe: the links then take the\nbar's item ink. A rule that sets `color`, `text-decoration`, `font-*` or\n`padding` on every `a` restyles them too: scope it away from the bar, for\nexample `:where(main, footer) a` or `a:not(ki-top-nav > a)`, and restyle the\nbar's links with the `--ki-top-nav-item-*` tokens.",
        "actions": "Header: global actions. App bar: up to three inline; additional direct named buttons or links go into overflow.",
        "brand": "Header mode: the brand link or wordmark. Page link rules reach it\nas they reach the primary links.",
        "leading": "App bar: a named Back or Open navigation control.",
        "search": "App bar: an accessible search control that can shrink inside its row."
      },
      "tag": "ki-top-nav",
      "whenNotToUse": "more than five sections or a deep navigation tree (use a\nsidebar), or switches between in-page views (use ki-tabs).",
      "whenToUse": "group a brand, up to five primary sections and global controls,\nor set a screen title, leading control and screen actions in app-bar mode."
    },
    "ki-tree": {
      "description": "A named hierarchy with collapsible branches and independent keyboard focus.",
      "events": {
        "ki-selection-change": "Emitted after a user selection changes. Selected items are in tree order."
      },
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the hierarchy. Localize it and make it distinct among nearby trees.",
          "default": "Tree"
        },
        "selection": {
          "type": "enum",
          "values": [
            "multiple",
            "none",
            "single"
          ],
          "description": "Use none for navigation, single for one selected item, or multiple for checkable branches.",
          "default": "single"
        }
      },
      "slots": {
        "": "Direct ki-tree-item children in reading order."
      },
      "tag": "ki-tree",
      "whenNotToUse": "flat lists of peers, menus of commands, or submitted form values.",
      "whenToUse": "browse nested files, categories or an outline, select items in\na hierarchy, or navigate through linked destinations."
    },
    "ki-tree-item": {
      "description": "An item or expandable branch inside a ki-tree.",
      "events": {
        "ki-collapse": "Emitted when an existing branch collapses.",
        "ki-expand": "Emitted when an existing branch expands.",
        "ki-load": "Emitted once when an empty lazy branch first opens. The listener supplies the children."
      },
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Keep the row discoverable by keyboard while preventing user activation.",
          "default": false
        },
        "expanded": {
          "type": "boolean",
          "description": "Whether a branch reveals its children. Has no visible effect on a leaf.",
          "default": false
        },
        "href": {
          "type": "string",
          "description": "Native destination of the row. Prefer selection=\"none\" for navigation trees.",
          "format": "url"
        },
        "icon-name": {
          "type": "string",
          "description": "Optional decorative icon. Import the named Kimen glyph before mounting the tree."
        },
        "lazy": {
          "type": "boolean",
          "description": "Request children on the first empty expansion. Clear it to finish an empty load.",
          "default": false
        },
        "loading-label": {
          "type": "string",
          "description": "Localized text for the spinner status during an outstanding lazy request.",
          "default": "Loading"
        },
        "selected": {
          "type": "boolean",
          "description": "Selected state. The tree keeps it in sync with single selection or fully checked branches.",
          "default": false
        }
      },
      "slots": {
        "": "The row label and directly nested ki-tree-item children."
      },
      "tag": "ki-tree-item",
      "whenNotToUse": "standalone controls, form checkboxes, or a row with other\ninteractive descendants.",
      "whenToUse": "label a file, category or destination in a hierarchy. Nest more\nki-tree-item children for a branch."
    },
    "ki-video": {
      "description": "A themed video surface: a calm poster facade with exactly one accessible\nplay control over a slotted native `<video>` element. From the first\nactivation on, playback, scrubbing, volume, captions and fullscreen belong\nto the native player — Kimen ships no custom chrome.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the play control (\"Play the product tour\"). The\ncontrol is a real button exposing role button with exactly this name;\nthe frame contributes no role, name or state of its own (FR-004,\nFR-005). Documented as required: no default human-language string is\nbaked in, and an unlabeled control renders but fails the accessibility\naudit (015-ki-progress precedent). The label is never rendered visually.",
          "required": true
        }
      },
      "slots": {
        "": "Exactly one native `<video>` element carrying its own poster, sources and `<track>` captions."
      },
      "tag": "ki-video",
      "whenNotToUse": "decorative background or ambient loops (plain CSS and\n`<video>` are the tool), audio-only recordings (use ki-audio),\nembeds from streaming platforms that ship their own player chrome (use\ntheir embed), or static imagery (use an image, not a video). `autoplay`\non the slotted media is unsupported: the facade's contract is that\nplayback begins only by explicit user activation — never on scroll,\nhover or visibility — so preexisting `autoplay` and `controls` on the\nslotted media are cleared when it arrives, and any playback already\nrunning is paused (FR-003; the native chrome returns at activation).",
      "whenToUse": "playable content the person deliberately chooses to watch —\nproduct tours, talks, tutorials, announcements — presented as a poster\nwith one play control. Slot exactly one native `<video>` carrying its own\n`poster`, sources and `<track>` captions, omit `controls` (the component\nenables the native chrome the moment the facade yields, FR-002), and give\nthe control a `label` (required: the accessible name of the play button)."
    },
    "p": {
      "description": "A native paragraph (`<p>`) of running text that takes the host page's typography.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "p",
      "whenNotToUse": "Do not use it as a heading, to hold layout, images or components, or for a status message (use ki-alert or ki-status). Never bind an action.",
      "whenToUse": "Write one paragraph of explanatory text in a generated panel."
    },
    "strong": {
      "description": "Native strong importance (`<strong>`) inside a heading, a paragraph or another emphasis element.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child."
      },
      "tag": "strong",
      "whenNotToUse": "Do not use it for whole paragraphs, as a heading or for a status (use ki-badge). Never bind an action.",
      "whenToUse": "Mark the figure or phrase of a sentence that matters most, such as a total."
    },
    "table": {
      "description": "A native data table (`<table>`) for reading records that share the same fields. It is never sorted or selected from a spec.",
      "events": {},
      "props": {},
      "slots": {
        "": "In this order: at most one `caption`, at most one `thead`, then any number of `tbody`. No text and no other element: anything else is rejected as invalid-child."
      },
      "tag": "table",
      "whenNotToUse": "Do not use it for layout (use a div), for a list of single items (use ki-list) or inside a cell: tables never nest. Never bind an action.",
      "whenToUse": "Show records with the same fields side by side, such as orders and their status. Put it in the default slot of a ki-table, and leave its `selectable` off: a table from a spec is never sorted or selected."
    },
    "tbody": {
      "description": "A native body row group of a table (`<tbody>`) that holds its records as rows.",
      "events": {},
      "props": {},
      "slots": {
        "": "Only `tr` rows. No text and no other element: anything else is rejected as invalid-child."
      },
      "tag": "tbody",
      "whenNotToUse": "Do not use it outside a table or before its caption or thead. A totals row is one more body row. Never bind an action.",
      "whenToUse": "Hold the body rows of a table, after its thead. A table may hold several to group its rows."
    },
    "td": {
      "description": "A native data cell (`<td>`) of a table row.",
      "events": {},
      "props": {},
      "slots": {
        "": "Text, native elements and catalog components, as in a layout `div`. Never a table or a table part: they are rejected as invalid-child."
      },
      "tag": "td",
      "whenNotToUse": "Do not use it outside a tr, and never put a table in it. A cell spans exactly one row and one column. Never bind an action on the cell itself.",
      "whenToUse": "Hold one field of a record: text, a ki-badge for a status, or a ki-button that acts on the record."
    },
    "th": {
      "description": "A native header cell (`<th>`) that heads a column or a row of a table.",
      "events": {},
      "props": {
        "scope": {
          "description": "What the cell heads: `col` for the column below it, `row` for the rest of its row. Optional: without it the browser infers it.",
          "type": "enum",
          "values": [
            "col",
            "row"
          ]
        }
      },
      "slots": {
        "": "Text, native elements and catalog components, as in a layout `div`. Never a table or a table part: they are rejected as invalid-child."
      },
      "tag": "th",
      "whenNotToUse": "Do not use it outside a tr or only to make text bold. A spec cannot sort a column. Never bind an action.",
      "whenToUse": "Head each column in the header row (scope `col`) and, when one field identifies the record, head each body row with it (scope `row`)."
    },
    "thead": {
      "description": "The native header row group of a table (`<thead>`) that holds the row of column headers.",
      "events": {},
      "props": {},
      "slots": {
        "": "Only `tr` rows. No text and no other element: anything else is rejected as invalid-child."
      },
      "tag": "thead",
      "whenNotToUse": "Do not use it outside a table, after a tbody, or twice in one table. Never bind an action.",
      "whenToUse": "Hold the header row of a table, after its caption and before its body."
    },
    "tr": {
      "description": "A native table row (`<tr>`) of header and data cells.",
      "events": {},
      "props": {},
      "slots": {
        "": "Only `th` and `td` cells. No text and no other element: anything else is rejected as invalid-child."
      },
      "tag": "tr",
      "whenNotToUse": "Do not use it outside a thead or a tbody, or to lay content out in a row (use a div with direction row). A row is never selected or clicked: never bind an action.",
      "whenToUse": "Hold one record, or the header row, inside a thead or a tbody."
    }
  },
  "elementsVersion": "0.1.3"
} as const;
