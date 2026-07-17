// GENERATED FILE (spec 027, Art. I) — never edit by hand.
// Source: packages/elements/generated/custom-elements.json via
// packages/catalog/scripts/generate-catalog.mjs; the catalog-sync gate
// fails any drift between this artifact and a fresh regeneration.
export const catalogData = {
  "catalogSchemaVersion": "1.0.0",
  "components": {
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
          "description": "Renders one native dismiss button when true. The button sits outside the\nlive-region boundary, so its accessible name is not announced as part of\nthe alert message. When false, the alert adds no tab stop.\n\nWhen to use: allow a person to acknowledge and clear a persistent message.\nWhen NOT to use: do not use dismissible for auto-expiring messages; that is\nfuture `ki-toast` behavior.",
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
        "": "Message body. It lives inside the live-region boundary."
      },
      "tag": "ki-alert",
      "whenNotToUse": "transient confirmations that expire on their own belong to\nthe future `ki-toast`; tiny status descriptors attached to another element\nbelong to `ki-badge`; blocking decisions belong to `ki-dialog`; inline\nfield-level validation belongs to the form control.\n\nAssistive technology note: alerts that must be announced should be inserted\ndynamically, or re-shown by clearing `dismissed`; alerts present at initial\npage load are exposed with their role but platform announcement is not\nguaranteed.",
      "whenToUse": "show a persistent inline message about the state of a page or\nsection, such as a failed save, completed operation, or service notice, that\nremains until the condition is resolved or the person dismisses it. Express\nseverity with `tone`, never custom styling."
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
          "description": "Portrait URL, the first step of the fallback chain. When it fails to\nload — initially or at runtime — the avatar silently falls back to the\ninitials (or the generic figure) with no error, no layout change and no\nevent (FR-001). Loading policy follows the platform image defaults."
        }
      },
      "slots": {},
      "tag": "ki-avatar",
      "whenNotToUse": "as a clickable control (compose the avatar inside an\ninteractive host such as ki-button), for logos or arbitrary illustrations\n(plain `img`), for presence/verification adornments overlaid on the corner\n(a future overlay concern shared with the nav badge), or unlabeled when no\nadjacent text names the identity.",
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
            "sm"
          ],
          "description": "Metric scale (`--ki-badge-{size}-*` tokens). An unrecognized value\nfalls back to the `md` metrics the same way.",
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
      "whenNotToUse": "feedback that must be announced (that is\nki-alert's job — the badge has no live region), an interactive\nchip, filter or button, empty content (the label IS the meaning), or a\nnotification-counter overlay (a future, separate concern).",
      "whenToUse": "annotate an entity with short status text (a state, a\ncategory) whose meaning is carried by the label itself; the tone color\nonly reinforces the text, it never replaces it."
    },
    "ki-button": {
      "description": "A token-styled action button with native button semantics.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the button from keyboard reach, and exposes\nthe unavailable state through the internal native button.\nWhen NOT to use: do not use disabled for pending/loading semantics.",
          "default": false
        },
        "name": {
          "type": "string",
          "description": "Form-data key contributed when this button submits its form.\nWhen NOT to use: omit when no submitter value should be sent."
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
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "success"
          ],
          "description": "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.",
          "default": "neutral"
        },
        "type": {
          "type": "enum",
          "values": [
            "button",
            "reset",
            "submit"
          ],
          "description": "Native form action type: `submit` submits the owning form (running\nconstraint validation and contributing `name`/`value` to the form data),\n`reset` restores field defaults, `button` never touches the form.\nCancel a submission from the form's `submit` event (`preventDefault()`);\nunlike a native button, `preventDefault()` on the `click` event does not\ncancel it. During submission `event.submitter` is a transient native\nbutton carrying this element's `name`/`value`, not the `ki-button` host.\nWhen NOT to use: use `button` when the action must never submit a form.",
          "default": "submit"
        },
        "value": {
          "type": "string",
          "description": "Form-data value paired with `name` when this button submits its form.\nWhen NOT to use: omit when the default empty submitter value is intended."
        },
        "variant": {
          "type": "enum",
          "values": [
            "ghost",
            "primary",
            "quaternary",
            "secondary",
            "tertiary"
          ],
          "description": "Visual hierarchy for the action. Use `primary` for the single main action\nin a view and lower-emphasis variants for supporting actions.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.",
          "default": "secondary"
        }
      },
      "slots": {
        "": "Label content. This is the accessible name source.",
        "end": "Trailing icon or media. Follows writing direction.",
        "start": "Leading icon or media. Follows writing direction."
      },
      "tag": "ki-button",
      "whenNotToUse": "navigation, icon-only actions, persistent toggles, or\nloading/progress semantics.",
      "whenToUse": "trigger the single main action of a view, supporting actions\nin descending hierarchy, or confirming/destructive actions through tone."
    },
    "ki-card": {
      "description": "A non-interactive card surface for grouping related content.",
      "events": {},
      "props": {},
      "slots": {
        "": "Body region for supporting text or arbitrary composed content.",
        "footer": "Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.",
        "header": "Title region. The author supplies the heading element at the surrounding document level; plain text here carries no heading semantics.",
        "media": "Leading visual region for an image, video or illustration."
      },
      "tag": "ki-card",
      "whenNotToUse": "as a button or link target, form control, fieldset, page\nlandmark, section replacement or nested card. For an interactive card, slot\nthe button or link INSIDE a region (whole-card interactivity is a future\nfeature, not this component).",
      "whenToUse": "group related media, heading, supporting text and actions into\none scannable surface visually distinct from the page; fill any subset of\nregions. Supply the heading element yourself in the `header` slot — plain\ntext slotted there carries no heading semantics for assistive technology."
    },
    "ki-checkbox": {
      "description": "A form-associated checkbox for selecting independent options.",
      "events": {},
      "props": {
        "checked": {
          "type": "boolean",
          "description": "Live binary selection state. User activation by pointer, slotted label or\nSpace toggles it with native checkbox parity and emits composed `input`\nbefore composed `change`. Boolean presence semantics apply:\n`checked=\"false\"` still renders checked; omit the attribute to express\nunchecked. Programmatic assignment is silent.\nWhen NOT to use: do not treat this reflected attribute as a native\n`defaultChecked`; reset uses the baseline captured at form association.",
          "default": false
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the checkbox from keyboard reach, exposes the\nunavailable state, and excludes it from form data.\nWhen NOT to use: do not use disabled for validation errors or pending\nstate.",
          "default": false
        },
        "indeterminate": {
          "type": "boolean",
          "description": "Presentation-only mixed state. It renders the dash mark, is forwarded to\nthe internal native input for mixed assistive-technology exposure, and\nnever changes the submitted value. Any user toggle clears it and removes\nthe reflected attribute.\nWhen NOT to use: do not submit or persist `indeterminate` as a third\nvalue; model data remains binary through `checked`.",
          "default": false
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
    "ki-dialog": {
      "description": "A modal dialog for one interrupting decision or short focused task.",
      "events": {
        "ki-close": "Post-close notification for every close path. Footer actions report\n`method` when they call `close()`, Escape reports `escape`, and opt-in\nbackdrop dismissal reports `backdrop`.\nWhen to use: update application state after the dialog is already closed\nand focus has returned through the native mechanism.\nWhen NOT to use: do not expect this event to veto closing; it is not\ncancelable in v1."
      },
      "props": {
        "close-on-backdrop": {
          "type": "boolean",
          "description": "Opts into backdrop light-dismiss. Omit this attribute for critical\nconfirmations; `close-on-backdrop=\"false\"` still enables it.\nWhen to use: low-risk dialogs where an outside click may safely dismiss.\nWhen NOT to use: destructive confirmations or decisions that should not be\nlost to a stray click; omit the attribute entirely rather than setting it\nto `\"false\"`.",
          "default": false
        },
        "heading": {
          "type": "string",
          "description": "Visible dialog title and accessible-name source. Always provide a heading;\nan empty value intentionally leaves the native dialog unnamed.\nWhen to use: name the interrupting decision, for example \"Delete\naccount?\". When NOT to use: do not omit it for production dialogs; APG\nmodal dialogs require an accessible name."
        },
        "open": {
          "type": "boolean",
          "description": "Reflected live modal state. Add it or call `show()` to open; remove it or\ncall `close()` to close. When open, the native dialog enters the top layer\nand the page behind is inert.\nWhen to use: bind application state to the dialog's modal lifecycle.\nWhen NOT to use: do not set the internal native `<dialog open>` attribute;\nthe host attribute is the only public source of truth.",
          "default": false
        }
      },
      "slots": {
        "": "Dialog body content.",
        "footer": "Dialog actions; applications wire every action to `close()`."
      },
      "tag": "ki-dialog",
      "whenNotToUse": "non-blocking feedback (`ki-alert`, future `ki-toast`),\nsupplementary hints (`ki-tooltip`), long forms or multi-step flows\n(navigate or use a future full-screen variant), menus, or pickers.",
      "whenToUse": "destructive confirmations, blocking choices, and brief\ncritical input that must be resolved before returning to the page. Always\nprovide a `heading`, place actions in the `footer` slot, wire each footer\naction to `close()`, and in destructive confirmations put `autofocus` on\nthe least destructive action."
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
    "ki-icon-button": {
      "description": "A token-styled, icon-only action button with native button semantics and a\nmandatory accessible name.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents activation, removes the icon button from keyboard reach, and\nexposes the unavailable state through the internal native button.\nWhen NOT to use: do not use disabled for pending/loading semantics.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the internal focusable button (\"Close\", \"Play\").\nRequired in the catalog contract: the icon is presentational, so without\na label the control exposes no name and fails the accessibility audit.\nThe component never invents a fallback name.\nWhen NOT to use: never omit it; never duplicate it as visible text (a\nvisible label means ki-button)."
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
        "tone": {
          "type": "enum",
          "values": [
            "danger",
            "neutral",
            "success"
          ],
          "description": "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.",
          "default": "neutral"
        },
        "variant": {
          "type": "enum",
          "values": [
            "ghost",
            "primary",
            "quaternary",
            "secondary",
            "tertiary"
          ],
          "description": "Visual hierarchy for the action. Use `primary` for the single main action\nin a view and lower-emphasis variants for supporting actions.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.",
          "default": "secondary"
        }
      },
      "slots": {
        "": "Exactly one decorative icon. The slot is presentational: its\ncontent is hidden from assistive technology and never contributes to the\naccessible name — that comes from `label` alone."
      },
      "tag": "ki-icon-button",
      "whenNotToUse": "whenever a visible label fits (use ki-button), toggling\nstate (a future toggle icon button), navigation (use a link), or form\nsubmit/reset (ki-icon-button is not form-associated; use ki-button, whose\nvisible label communicates the consequence).",
      "whenToUse": "a compact, widely understood action where space precludes a\nvisible label: toolbars, card and dialog corners (close), media transport,\ndata-row actions. Always supply `label`; usually pair with ki-tooltip for\nsighted discoverability."
    },
    "ki-indicator": {
      "description": "A non-interactive page-position indicator: one dot per position of a\nbounded sequence, exactly one highlighted as current.",
      "events": {},
      "props": {
        "count": {
          "type": "number",
          "description": "Number of positions (non-negative integer): one dot renders per\nposition, in position order. A missing, non-numeric or negative value\nrenders zero dots — an authoring mistake by catalog guidance, never an\nerror state or a rendering failure (FR-002; empty ki-list precedent)."
        },
        "current": {
          "type": "number",
          "description": "The current position, 1-based to match the exposed position text\n(\"2 / 5\"). Exactly one dot presents the current appearance whenever\n`count` >= 1: values above `count` clamp to the last position, values\nbelow 1 and non-numeric values fall back to the first (FR-003). Updates\nre-render in place — the highlight and the exposed text follow\nimmediately, re-applying the normalization (FR-004)."
        },
        "label": {
          "type": "string",
          "description": "Accessible name of the sequence (\"Slide position\"). The exposed name\ncombines it with the wordless numeric position —\n\"<label>, <current> / <count>\" — on a single non-interactive graphic;\nwithout a label the name degrades to the bare position text (documented\nas required authoring, FR-005). The label is never rendered visually\nand position changes are never announced (no live region, FR-006)."
        }
      },
      "slots": {},
      "tag": "ki-indicator",
      "whenNotToUse": "section navigation (ki-tabs), task completion or loading\n(ki-progress), labeled step flows (a stepper is a separate roadmap item),\ninteractive pagination (a future feature — the indicator takes no focus\nand no input; navigation belongs to the composing carousel's own\ncontrols), or conveying quantity without a current position. Position\nchanges are never announced by the indicator itself (no live region): the\ncomposing carousel owns announcements.",
      "whenToUse": "show the current position within a bounded, sequential set of\npeer views whose navigation lives elsewhere: carousel slides, unlabeled\nonboarding steps, gallery pages. Wire `count` and `current` (1-based) to\nthe sequence the consumer renders and give it a `label` (required\nauthoring: assistive technology reads one graphic named\n\"<label>, <current> / <count>\"). Below two positions an indicator carries\nno information."
    },
    "ki-input": {
      "description": "A token-styled single-line text field with native input semantics.",
      "events": {},
      "props": {
        "autocomplete": {
          "type": "string",
          "description": "Native autocomplete detail token forwarded to the internal input.\nWhen NOT to use: omit when no autofill entry purpose is known."
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents editing, removes the field from keyboard reach and exposes the\nunavailable state through the internal native input.\nWhen NOT to use: do not use disabled for readonly reference values.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Visible label rendered next to the entry area and used as the accessible\nname. This is mandatory for valid usage.\nWhen NOT to use: never use `placeholder` as a label substitute."
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
        "end": "Trailing icon or text affix inside the field. Follows writing direction.",
        "start": "Leading icon or text affix inside the field. Follows writing direction."
      },
      "tag": "ki-input",
      "whenNotToUse": "multiline text, predefined choices, boolean state, numeric\nstepper entry, or placeholder-only labeling.",
      "whenToUse": "collect one line of free text from a person, always with a\nvisible `label`; choose the `type` and `autocomplete` that match the entry\npurpose."
    },
    "ki-list": {
      "description": "A non-interactive vertical list container for read-only collections of\nsimilar entries composed with `ki-list-item` children.",
      "events": {},
      "props": {},
      "slots": {
        "": "`ki-list-item` children. Other children are unsupported."
      },
      "tag": "ki-list",
      "whenNotToUse": "menus, selectable option lists, tabular data, navigation,\nwhole-item clickable rows or lone items outside a list.",
      "whenToUse": "settings, contacts, results or activity feeds where each item\ncomposes leading media, primary text, optional secondary text and trailing\nmeta or a slotted control."
    },
    "ki-list-item": {
      "description": "A non-interactive item inside `ki-list`, composed from leading media,\nprimary text, optional secondary text and trailing media or meta.",
      "events": {},
      "props": {},
      "slots": {
        "": "Primary text line.",
        "end": "Trailing media, meta text or a slotted control.",
        "secondary": "Supporting text below the primary line. Its presence\nselects the multi-line min-height token.",
        "start": "Leading media such as an icon, avatar or image."
      },
      "tag": "ki-list-item",
      "whenNotToUse": "outside `ki-list`, as a menu item, selectable option,\ntabular row, navigation link or whole-item clickable control.",
      "whenToUse": "only as a child of `ki-list`, for one read-only entry in a\nsimilar vertical collection."
    },
    "ki-option": {
      "description": "A declarative data option rendered by its owning `ki-select`.",
      "events": {},
      "props": {
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
        "": "Text label mirrored by the owning select."
      },
      "tag": "ki-option",
      "whenNotToUse": "`ki-option` standalone, authoring selection\non an option, or expecting it to paint its own row.",
      "whenToUse": "declare one choice inside a `ki-select`; its text is the\nhuman-facing label and its `value` is the submitted value."
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
          "description": "Accessible name applied to the internal progressbar. Always set this to\nwhat is progressing, such as \"Uploading report.pdf\". Without it the\nelement renders but exposes no accessible name.\nWhen NOT to use: do not use a generic label such as \"Loading\" when the\ntask can be named more specifically."
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
      "description": "A token-styled radio group that owns selection, keyboard coordination and\nform participation for slotted `ki-radio` options.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Makes the whole group unavailable, skips it in Tab order and removes its\nform entry.\nWhen NOT to use: do not use disabled for pending/loading semantics.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible-name source for the radiogroup.\nWhen NOT to use: do not omit it; unlabeled groups fail accessibility gates."
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
    "ki-scroller": {
      "description": "A bounded scroll container that clips its content along one declared axis\nand replaces platform scrollbar chrome with a token-resolved indicator.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the scroll region (\"Release notes\", \"Chat\nmessages\"). Assistive technology receives a `region` with this name\nwhose slotted content keeps its own semantics (FR-006). Documented as\nrequired: a scroller without a label renders but exposes no accessible\nname and fails the accessibility audit (015-ki-progress precedent).\nThe label is never rendered visually."
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
    "ki-select": {
      "description": "A form-associated select-only combobox for choosing one option from\ndeclarative `ki-option` children.",
      "events": {},
      "props": {
        "disabled": {
          "type": "boolean",
          "description": "Prevents opening, removes the trigger from keyboard reach, and excludes\nthe select from form submission. Boolean presence semantics apply.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Visible label and accessible-name source for the combobox trigger.\nWhen NOT to use: do not omit it; unlabeled selects are invalid usage.",
          "default": ""
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
    "ki-switch": {
      "description": "A token-styled switch for immediate on/off settings.",
      "events": {},
      "props": {
        "checked": {
          "type": "boolean",
          "description": "Live on/off state. Boolean presence semantics apply: any present\n`checked` attribute value, including `checked=\"false\"` or malformed\nagent output, means on. Omit the attribute to express off.\nWhen to use: set the initial on state for a setting that applies\nimmediately.\nWhen NOT to use: do not use a switch for choices saved only on submit;\nuse ki-checkbox for that pattern.",
          "default": false
        },
        "disabled": {
          "type": "boolean",
          "description": "Prevents toggling, removes the switch from keyboard reach, excludes it\nfrom form data, and exposes the unavailable state to assistive technology.\nWhen to use: make a setting temporarily unavailable while preserving its\ncurrent state.\nWhen NOT to use: do not use disabled for pending or loading states.",
          "default": false
        },
        "name": {
          "type": "string",
          "description": "Form-data key contributed while the switch is on.\nWhen to use: include the immediate setting in native form data when on.\nWhen NOT to use: omit when no form entry should be submitted."
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
        "": "Tab label; this is the accessible name source.",
        "end": "Trailing icon or media. Follows writing direction.",
        "start": "Leading icon or media. Follows writing direction."
      },
      "tag": "ki-tab",
      "whenNotToUse": "standalone, for form value\nselection, or for page navigation; use the parent group's `value` instead\nof authoring `selected`.",
      "whenToUse": "label one peer content view inside `ki-tabs`, with optional\n`start` and `end` slot media."
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
    "ki-tabs": {
      "description": "A tab group for switching between peer content views.",
      "events": {
        "ki-change": "Fired once after a user-driven selection change from pointer or keyboard\nnavigation. `detail.value` is the resolved selected value and `value` is\nalready current when listeners run. Programmatic `value` writes and\nfirst-render fallback are silent."
      },
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name for the tablist. Always provide one when multiple tab\ngroups may appear in a view. When NOT to use: do not use `label` as a\nvisible heading; render visible context in surrounding content."
        },
        "value": {
          "type": "string",
          "description": "Resolved selected value. The attribute declares the initial request;\nthe live property falls back to the first enabled owner tab, or `\"\"`\nwhen no tab is selectable. Programmatic writes are silent.",
          "default": ""
        }
      },
      "slots": {
        "": "`ki-tab` and `ki-tab-panel` children. Tabs are auto-assigned to an\ninternal named slot as managed output."
      },
      "tag": "ki-tabs",
      "whenNotToUse": "selecting form values\n(use `ki-radio-group`), page navigation (use links), step flows, or\nstandalone `ki-tab` / `ki-tab-panel` children outside this group.",
      "whenToUse": "switch between small sets of peer views inside the same page,\nwith one visible panel at a time."
    },
    "ki-textarea": {
      "description": "A token-styled multiline text field with native form semantics.",
      "events": {},
      "props": {
        "autocomplete": {
          "type": "string",
          "description": "Autofill detail token forwarded to the native textarea.\nWhen to use: expose entry purpose such as `street-address` when available.\nWhen NOT to use: omit when no valid autofill purpose applies."
        },
        "disabled": {
          "type": "boolean",
          "description": "Disables editing, focus, validation and form-data contribution.\nWhen to use: make a field temporarily unavailable. When NOT to use: do not\nuse disabled for readonly review text that should submit.",
          "default": false
        },
        "label": {
          "type": "string",
          "description": "Visible label rendered by the component and used as the accessible name.\nWhen to use: always provide a concise label for the requested long-form\ntext. When NOT to use: do not substitute placeholder text for the label."
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
    "ki-tooltip": {
      "description": "A transient, text-only description bubble for one slotted trigger.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "The entire tooltip content. The string is reflected to the slotted\ntrigger's accessible description without changing its name. Empty or\nwhitespace-only labels render no tooltip and expose no description.\nWhen to use: a short hint that clarifies the slotted trigger.\nWhen NOT to use: never use `label` for essential information, rich\ncontent, interactive content, validation messages, or information attached\nto disabled controls; put that content in visible UI or a future popover.",
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
        "": "Exactly one interactive trigger. The component reflects `label` to\nthe trigger's `aria-description`."
      },
      "tag": "ki-tooltip",
      "whenNotToUse": "essential or unique information in a tooltip; interactive\nor rich content in a tooltip; form validation messages, disabled controls,\nor touch-primary flows. Use visible layout text or a future `ki-popover`\npattern for those cases.",
      "whenToUse": "add a brief clarifying hint for an icon-only, abbreviated, or\notherwise ambiguous control when the same information is discoverable\nelsewhere in the interface."
    },
    "ki-video": {
      "description": "A themed video surface: a calm poster facade with exactly one accessible\nplay control over a slotted native `<video>` element. From the first\nactivation on, playback, scrubbing, volume, captions and fullscreen belong\nto the native player — Kimen ships no custom chrome.",
      "events": {},
      "props": {
        "label": {
          "type": "string",
          "description": "Accessible name of the play control (\"Play the product tour\"). The\ncontrol is a real button exposing role button with exactly this name;\nthe frame contributes no role, name or state of its own (FR-004,\nFR-005). Documented as required: no default human-language string is\nbaked in, and an unlabeled control renders but fails the accessibility\naudit (015-ki-progress precedent). The label is never rendered visually."
        }
      },
      "slots": {
        "": "Exactly one native `<video>` element carrying its own poster, sources and `<track>` captions."
      },
      "tag": "ki-video",
      "whenNotToUse": "decorative background or ambient loops (plain CSS and\n`<video>` are the tool), audio-only content (a future audio component),\nembeds from streaming platforms that ship their own player chrome (use\ntheir embed), or static imagery (use an image, not a video). `autoplay`\non the slotted media is unsupported: the facade's contract is that\nplayback begins only by explicit user activation — never on scroll,\nhover or visibility — so preexisting `autoplay` and `controls` on the\nslotted media are cleared when it arrives, and any playback already\nrunning is paused (FR-003; the native chrome returns at activation).",
      "whenToUse": "playable content the person deliberately chooses to watch —\nproduct tours, talks, tutorials, announcements — presented as a poster\nwith one play control. Slot exactly one native `<video>` carrying its own\n`poster`, sources and `<track>` captions, omit `controls` (the component\nenables the native chrome the moment the facade yields, FR-002), and give\nthe control a `label` (required: the accessible name of the play button)."
    }
  },
  "elementsVersion": "0.0.0"
} as const;
