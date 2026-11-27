// GENERATED FILE (spec 027, Art. I) — never edit by hand.
// Sources: packages/elements/generated/custom-elements.json and component.json opt-ins.
// Generator: packages/catalog/scripts/generate-catalog.mjs. The catalog-sync gate
// fails any drift between this artifact and a fresh regeneration.
import type { Catalog } from '../validate.js';

/**
 * What the boundary checks and the renderer writes: every entry, with a
 * custom element's guidance prose blank (catalog-guidance.ts holds it).
 */
export const catalogStructure: Catalog = {
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
        "align": {"default":"stretch","description":"Cross-axis alignment of the children (flow-relative: `start` follows the writing direction).","type":"enum","values":["start","center","end","stretch"]},
        "direction": {"default":"column","description":"Main axis: `column` stacks the children in the block direction, `row` lines them up in the inline direction.","type":"enum","values":["column","row"]},
        "gap": {"default":"md","description":"Space between the children, one of the spacing token steps (`--ki-space-<step>`): zero, xs, sm, md, lg, xl, 3xl or 7xl.","type":"enum","values":["zero","xs","sm","md","lg","xl","3xl","7xl"]},
        "justify": {"default":"start","description":"Main-axis distribution of the children (flow-relative).","type":"enum","values":["start","center","end","space-between"]},
        "wrap": {"default":false,"description":"Whether the children wrap onto further lines when they do not fit.","type":"boolean"}
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
        "alt": {"allowEmpty":true,"description":"The text alternative: what the image shows, for people who cannot see it. Exactly \"\" marks a decorative image that assistive technology skips; white space alone is rejected.","required":true,"type":"string"},
        "height": {"description":"Intrinsic height in CSS pixels, a hint that reserves the aspect ratio before the image loads.","maximum":4096,"minimum":1,"type":"number"},
        "src": {"description":"The image URL: http(s) or a relative reference, and an allowed origin when the host declares origins. javascript:, data: and blob: URLs are rejected.","format":"url","required":true,"type":"string"},
        "width": {"description":"Intrinsic width in CSS pixels, a hint that reserves the aspect ratio before the image loads; the image still shrinks to fit its container.","maximum":4096,"minimum":1,"type":"number"}
      },
      "slots": {},
      "tag": "img",
      "whenNotToUse": "Do not use it for avatars (ki-avatar), for icons inside controls, for text set as an image, or as a button. Never bind an action.",
      "whenToUse": "Show a chart, a photo or an illustration that carries content (describe it in alt) or decoration (alt \"\")."
    },
    "ki-accordion": {
      "description": "",
      "events": {},
      "props": {
        "exclusive": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-accordion",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-ai-label": {
      "description": "",
      "events": {
        "ki-revert": ""
      },
      "props": {
        "explanation": {"type":"string","description":""},
        "generated-at": {"type":"string","description":""},
        "generated-at-label": {"type":"string","description":"","default":"Generated"},
        "label": {"type":"string","description":"","default":"AI"},
        "model": {"type":"string","description":""},
        "model-label": {"type":"string","description":"","default":"Model:"},
        "popover-label": {"type":"string","description":"","default":"About this content"},
        "revert-label": {"type":"string","description":"","default":"Revert to my text"},
        "revertible": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"sm"},
        "trigger-label": {"type":"string","description":"","default":"AI-generated: about this content"}
      },
      "slots": {},
      "tag": "ki-ai-label",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-alert": {
      "description": "",
      "events": {
        "ki-dismiss": ""
      },
      "props": {
        "dismiss-label": {"type":"string","description":"","default":"Dismiss"},
        "dismissed": {"type":"boolean","description":"","default":false},
        "dismissible": {"type":"boolean","description":"","default":false},
        "heading": {"type":"string","description":""},
        "tone": {"type":"enum","values":["danger","info","neutral","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": "",
        "actions": "",
        "icon": ""
      },
      "tag": "ki-alert",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-audio": {
      "description": "",
      "events": {
        "ended": ""
      },
      "props": {
        "error-label": {"type":"string","description":"","default":"Audio could not be played"},
        "mute-label": {"type":"string","description":"","default":"Mute"},
        "pause-label": {"type":"string","description":"","default":"Pause"},
        "play-label": {"type":"string","description":"","default":"Play"},
        "rates": {"type":"string","description":"","default":"0.75,1,1.25,1.5,2"},
        "seek-label": {"type":"string","description":"","default":"Seek"},
        "speed-label": {"type":"string","description":"","default":"Playback speed"},
        "src": {"type":"string","description":"","required":true,"format":"url"},
        "time-label": {"type":"string","description":"","default":"{elapsed} of {duration}"},
        "title": {"type":"string","description":"","default":"Audio player"},
        "transcript-href": {"type":"string","description":"","format":"url"},
        "transcript-label": {"type":"string","description":"","default":"Read the transcript"},
        "unmute-label": {"type":"string","description":"","default":"Unmute"}
      },
      "slots": {},
      "tag": "ki-audio",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-avatar": {
      "description": "",
      "events": {},
      "props": {
        "initials": {"type":"string","description":""},
        "label": {"type":"string","description":""},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs","xxs"],"description":"","default":"md"},
        "src": {"type":"string","description":"","format":"url"}
      },
      "slots": {
        "counter": ""
      },
      "tag": "ki-avatar",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-avatar-group": {
      "description": "",
      "events": {},
      "props": {
        "max": {"type":"number","description":""},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs","xxs"],"description":"","default":"md"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-avatar-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-badge": {
      "description": "",
      "events": {},
      "props": {
        "size": {"type":"enum","values":["md","sm","xs"],"description":"","default":"md"},
        "tone": {"type":"enum","values":["danger","info","neutral","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-badge",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-breadcrumb": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","default":"Breadcrumb"},
        "max-items": {"type":"number","description":""},
        "more-label": {"type":"string","description":"","default":"Show {n} more levels"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-breadcrumb",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-breadcrumb-item": {
      "description": "",
      "events": {},
      "props": {
        "current": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","format":"url"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-breadcrumb-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-button": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "command": {"type":"enum","values":["close","request-close","show-modal"],"description":""},
        "commandfor": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "download": {"type":"string","description":""},
        "href": {"type":"string","description":"","format":"url"},
        "loading": {"type":"boolean","description":"","default":false},
        "loading-label": {"type":"string","description":"","default":"Loading"},
        "name": {"type":"string","description":""},
        "rel": {"type":"string","description":""},
        "selected": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "target": {"type":"string","description":""},
        "toggle": {"type":"boolean","description":"","default":false},
        "tone": {"type":"enum","values":["danger","neutral","success"],"description":"","default":"neutral"},
        "type": {"type":"enum","values":["button"],"description":"","default":"button"},
        "value": {"type":"string","description":""},
        "variant": {"type":"enum","values":["ghost","outline","primary","quaternary","secondary"],"description":"","default":"secondary","deprecatedValues":["tertiary"]}
      },
      "slots": {
        "": "",
        "end": "",
        "start": ""
      },
      "tag": "ki-button",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-button-group": {
      "description": "",
      "events": {},
      "props": {
        "attached": {"type":"boolean","description":"","default":false},
        "label": {"type":"string","description":"","required":true},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":""},
        "toolbar": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-button-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-card": {
      "description": "",
      "events": {
        "ki-activate": ""
      },
      "props": {
        "href": {"type":"string","description":"","format":"url"},
        "interactive": {"type":"boolean","description":"","default":false},
        "variant": {"type":"enum","values":["default","elevated","filled","outlined"],"description":"","default":"default"}
      },
      "slots": {
        "": "",
        "footer": "",
        "header": "",
        "media": ""
      },
      "tag": "ki-card",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-carousel": {
      "description": "",
      "events": {
        "ki-slide-change": ""
      },
      "props": {
        "autoplay": {"type":"number","description":"","minimum":1,"maximum":2147483647},
        "carousel-role-description": {"type":"string","description":"","default":"carousel"},
        "current": {"type":"number","description":"","default":1,"minimum":1},
        "label": {"type":"string","description":"","required":true},
        "layout": {"type":"enum","values":["full-screen","hero","multi-browse","single","uncontained"],"description":"","default":"single"},
        "loop": {"type":"boolean","description":"","default":false},
        "navigation": {"type":"boolean","description":"","default":true},
        "next-label": {"type":"string","description":"","default":"Next slide"},
        "pagination": {"type":"boolean","description":"","default":true},
        "pause-label": {"type":"string","description":"","default":"Pause"},
        "play-label": {"type":"string","description":"","default":"Play"},
        "position-label": {"type":"string","description":"","default":"Slide position"},
        "previous-label": {"type":"string","description":"","default":"Previous slide"},
        "slide-label": {"type":"string","description":"","default":"{index} of {count}"},
        "slide-role-description": {"type":"string","description":"","default":"slide"},
        "slides-per-move": {"type":"number","description":"","default":1,"minimum":1},
        "slides-per-view": {"type":"number","description":"","default":1,"minimum":1}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-carousel",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-carousel-item": {
      "description": "",
      "events": {},
      "props": {},
      "slots": {
        "": "",
        "preview": ""
      },
      "tag": "ki-carousel-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-checkbox": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "checked": {"type":"boolean","description":"","default":false},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "indeterminate": {"type":"boolean","description":"","default":false},
        "label-hint": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "required": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm"],"description":"","default":"md"},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-checkbox",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-checkbox-group": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "label-hidden": {"type":"boolean","description":"","default":false},
        "max": {"type":"number","description":""},
        "min": {"type":"number","description":""},
        "name": {"type":"string","description":""},
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"vertical"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-checkbox-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-chip": {
      "description": "",
      "events": {
        "ki-activate": "",
        "ki-change": "",
        "ki-remove": ""
      },
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "removable": {"type":"boolean","description":"","default":false},
        "remove-label": {"type":"string","description":"","default":"Remove"},
        "selected": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"md"},
        "type": {"type":"enum","values":["assist","filter","input"],"description":""},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": "",
        "start": ""
      },
      "tag": "ki-chip",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-chip-group": {
      "description": "",
      "events": {
        "ki-reorder": ""
      },
      "props": {
        "focus-target": {"type":"string","description":"","format":"idref"},
        "label": {"type":"string","description":"","default":""},
        "reorder-announcement": {"type":"string","description":"","default":"{label} moved to position {position} of {total}."},
        "reorderable": {"type":"boolean","description":"","default":false},
        "type": {"type":"enum","values":["assist","filter","input"],"description":"","default":"filter"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-chip-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-citation": {
      "description": "",
      "events": {},
      "props": {
        "label-template": {"type":"string","description":"","default":"Source {number}: {title}"},
        "ref": {"type":"string","description":"","required":true}
      },
      "slots": {},
      "tag": "ki-citation",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-code-block": {
      "description": "",
      "events": {
        "ki-copy": ""
      },
      "props": {
        "copied-label": {"type":"string","description":"","default":"Copied"},
        "copy-error-label": {"type":"string","description":"","default":"Couldn't copy"},
        "copy-label": {"type":"string","description":"","default":"Copy code"},
        "copyable": {"type":"boolean","description":"","default":true},
        "filename": {"type":"string","description":""},
        "highlight": {"type":"string","description":""},
        "highlight-label": {"type":"string","description":"","default":"Highlighted lines"},
        "label": {"type":"string","description":"","default":"Code"},
        "language": {"type":"string","description":""},
        "line-numbers": {"type":"boolean","description":"","default":false},
        "wrap": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-code-block",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-code-input": {
      "description": "",
      "events": {
        "ki-complete": "",
        "ki-input": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "length": {"type":"number","description":"","default":6,"minimum":4,"maximum":8},
        "name": {"type":"string","description":""},
        "required": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"md"},
        "type": {"type":"enum","values":["alphanumeric","numeric"],"description":"","default":"numeric"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {},
      "tag": "ki-code-input",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-combobox": {
      "description": "",
      "activationEvent": "change",
      "events": {
        "change": "",
        "ki-input": ""
      },
      "props": {
        "add-label": {"type":"string","description":"","default":"Add “{text}”"},
        "allow-custom": {"type":"boolean","description":"","default":false},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "empty-label": {"type":"string","description":"","default":"No results"},
        "error-text": {"type":"string","description":""},
        "filter": {"type":"enum","values":["contains","none","starts-with"],"description":"","default":"contains"},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "loading": {"type":"boolean","description":"","default":false},
        "loading-label": {"type":"string","description":"","default":"Loading results"},
        "multiple": {"type":"boolean","description":"","default":false},
        "name": {"type":"string","description":""},
        "placeholder": {"type":"string","description":"","default":""},
        "remove-label": {"type":"string","description":"","default":"Remove {label}"},
        "required": {"type":"boolean","description":"","default":false},
        "result-count-label": {"type":"string","description":"","default":"{count} results"},
        "result-one-label": {"type":"string","description":"","default":"1 result"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-combobox",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-confirmation": {
      "description": "",
      "events": {
        "ki-approve": "",
        "ki-deny": ""
      },
      "props": {
        "action": {"type":"string","description":"","required":true,"format":"text"},
        "approve-label": {"type":"string","description":"","required":true},
        "approved-label": {"type":"string","description":"","default":"Approved"},
        "consequence": {"type":"string","description":""},
        "denied-label": {"type":"string","description":"","default":"Denied"},
        "deny-label": {"type":"string","description":"","required":true},
        "expired-label": {"type":"string","description":"","default":"Expired"},
        "heading": {"type":"string","description":"","required":true},
        "remember": {"type":"boolean","description":"","default":false},
        "remember-label": {"type":"string","description":"","default":"Allow this action for the rest of this conversation"},
        "resolved-at": {"type":"string","description":""},
        "resolved-by": {"type":"string","description":""},
        "state": {"type":"enum","values":["approved","denied","expired","pending"],"description":"","default":"pending"},
        "tone": {"type":"enum","values":["danger","neutral"],"description":"","default":"neutral"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-confirmation",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-conversation": {
      "description": "",
      "events": {},
      "props": {
        "jump-label": {"type":"string","description":"","default":"Jump to latest"},
        "label": {"type":"string","description":"","default":"Conversation"},
        "stick-to-bottom": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-conversation",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-copy-button": {
      "description": "",
      "events": {
        "ki-copy": ""
      },
      "props": {
        "copied-label": {"type":"string","description":"","default":"Copied"},
        "copy-error-label": {"type":"string","description":"","default":"Couldn't copy"},
        "feedback-duration": {"type":"number","description":"","default":1500,"minimum":0},
        "from": {"type":"string","description":"","format":"idref"},
        "label": {"type":"string","description":"","default":"Copy"},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "value": {"type":"string","description":""},
        "variant": {"type":"enum","values":["ghost","outline","primary","quaternary","secondary"],"description":"","default":"ghost"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-copy-button",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-counter": {
      "description": "",
      "events": {},
      "props": {
        "dot": {"type":"boolean","description":"","default":false},
        "for": {"type":"string","description":"","format":"idref"},
        "max": {"type":"number","description":"","default":99},
        "tone": {"type":"enum","values":["danger","neutral","primary","success"],"description":"","default":"danger"},
        "value": {"type":"number","description":""}
      },
      "slots": {},
      "tag": "ki-counter",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-date-picker": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "apply-label": {"type":"string","description":"","default":"Apply"},
        "cancel-label": {"type":"string","description":"","default":"Cancel"},
        "change-label": {"type":"string","description":"","default":"Change date, {date}"},
        "choose-label": {"type":"string","description":"","default":"Choose date"},
        "confirm": {"type":"boolean","description":"","default":false},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "first-day-of-week": {"type":"number","description":"","minimum":0,"maximum":6},
        "help-text": {"type":"string","description":""},
        "invalid-date-label": {"type":"string","description":"","default":"Enter a valid date within the allowed range."},
        "label": {"type":"string","description":"","required":true},
        "locale": {"type":"string","description":""},
        "max": {"type":"string","description":""},
        "min": {"type":"string","description":""},
        "mode": {"type":"enum","values":["range","single"],"description":"","default":"single"},
        "name": {"type":"string","description":""},
        "next-month-label": {"type":"string","description":"","default":"Next month"},
        "previous-month-label": {"type":"string","description":"","default":"Previous month"},
        "required": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {},
      "tag": "ki-date-picker",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-details": {
      "description": "",
      "events": {
        "ki-toggle": ""
      },
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "name": {"type":"string","description":""},
        "open": {"type":"boolean","description":"","default":false},
        "summary": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "summary": ""
      },
      "tag": "ki-details",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-dialog": {
      "description": "",
      "events": {
        "ki-close": "",
        "ki-confirm": ""
      },
      "props": {
        "close-label": {"type":"string","description":"","default":"Close"},
        "close-on-backdrop": {"type":"boolean","description":"","default":false},
        "confirm-label": {"type":"string","description":""},
        "fullscreen": {"type":"enum","values":["always","compact","never"],"description":"","default":"never"},
        "heading": {"type":"string","description":"","required":true},
        "open": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": "",
        "footer": ""
      },
      "tag": "ki-dialog",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-divider": {
      "description": "",
      "events": {},
      "props": {
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"horizontal"}
      },
      "slots": {},
      "tag": "ki-divider",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-drawer": {
      "description": "",
      "events": {
        "ki-close": ""
      },
      "props": {
        "close-label": {"type":"string","description":"","default":"Close"},
        "heading": {"type":"string","description":"","required":true},
        "modal": {"type":"boolean","description":"","default":true},
        "open": {"type":"boolean","description":"","default":false},
        "placement": {"type":"enum","values":["bottom","end","start"],"description":"","default":"end"},
        "size": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "footer": "",
        "header-actions": ""
      },
      "tag": "ki-drawer",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-empty-state": {
      "description": "",
      "events": {},
      "props": {
        "announce": {"type":"boolean","description":"","default":false},
        "heading": {"type":"string","description":"","required":true},
        "heading-level": {"type":"number","description":"","default":3,"minimum":2,"maximum":6},
        "icon-name": {"type":"string","description":""},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"md"},
        "tone": {"type":"enum","values":["danger","info","neutral","primary","primary-light","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": "",
        "actions": "",
        "media": ""
      },
      "tag": "ki-empty-state",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-fab": {
      "description": "",
      "events": {
        "click": ""
      },
      "props": {
        "collapse-on-scroll": {"type":"boolean","description":"","default":false},
        "extended": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","format":"url"},
        "icon-name": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "position": {"type":"enum","values":["fixed","static"],"description":"","default":"static"},
        "size": {"type":"enum","values":["lg","md","xl"],"description":"","default":"md"},
        "variant": {"type":"enum","values":["primary","secondary","surface"],"description":"","default":"secondary"}
      },
      "slots": {
        "icon": ""
      },
      "tag": "ki-fab",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-fab-menu": {
      "description": "",
      "events": {
        "ki-select": ""
      },
      "props": {
        "close-label": {"type":"string","description":"","default":"Close menu"},
        "icon-name": {"type":"string","description":"","default":"plus"},
        "label": {"type":"string","description":"","required":true},
        "open": {"type":"boolean","description":"","default":false},
        "position": {"type":"enum","values":["fixed","static"],"description":"","default":"static"},
        "scrim": {"type":"boolean","description":"","default":true},
        "variant": {"type":"enum","values":["primary","secondary","surface"],"description":"","default":"secondary"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-fab-menu",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-fab-menu-item": {
      "description": "",
      "events": {
        "ki-select": ""
      },
      "props": {
        "href": {"type":"string","description":"","format":"url"},
        "icon-name": {"type":"string","description":""},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-fab-menu-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-feature-icon": {
      "description": "",
      "events": {},
      "props": {
        "shape": {"type":"enum","values":["circle","square"],"description":"","default":"square"},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "tone": {"type":"enum","values":["danger","info","neutral","primary","primary-light","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-feature-icon",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-file-upload": {
      "description": "",
      "events": {
        "ki-file-cancel": "",
        "ki-file-remove": "",
        "ki-files-add": ""
      },
      "props": {
        "accept": {"type":"string","description":""},
        "browse-label": {"type":"string","description":"","default":"Browse files"},
        "cancel-label": {"type":"string","description":"","default":"Cancel upload of {file}"},
        "count-error": {"type":"string","description":"","default":"Too many files."},
        "disabled": {"type":"boolean","description":"","default":false},
        "done-label": {"type":"string","description":"","default":"Uploaded"},
        "drop-label": {"type":"string","description":"","default":"Drop files here or"},
        "error-text": {"type":"string","description":""},
        "failed-label": {"type":"string","description":"","default":"Upload failed."},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","default":"Upload files"},
        "list-label": {"type":"string","description":"","default":"Files"},
        "max-files": {"type":"number","description":""},
        "max-size": {"type":"string","description":""},
        "multiple": {"type":"boolean","description":"","default":false},
        "name": {"type":"string","description":""},
        "queued-label": {"type":"string","description":"","default":"Queued"},
        "remove-label": {"type":"string","description":"","default":"Remove {file}"},
        "required": {"type":"boolean","description":"","default":false},
        "required-label": {"type":"string","description":"","default":"Required"},
        "required-message": {"type":"string","description":"","default":"Select a file."},
        "size-error": {"type":"string","description":"","default":"This file is too large."},
        "type-error": {"type":"string","description":"","default":"This file type is not allowed."},
        "uploading-label": {"type":"string","description":"","default":"Uploading {file}"}
      },
      "slots": {
        "help": ""
      },
      "tag": "ki-file-upload",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-format-date": {
      "description": "",
      "events": {},
      "props": {
        "date": {"type":"string","description":""},
        "date-style": {"type":"enum","values":["full","long","medium","short"],"description":""},
        "lang": {"type":"string","description":""},
        "time-style": {"type":"enum","values":["full","long","medium","short"],"description":""},
        "time-zone": {"type":"string","description":""}
      },
      "slots": {},
      "tag": "ki-format-date",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-format-number": {
      "description": "",
      "events": {},
      "props": {
        "currency": {"type":"string","description":""},
        "format-style": {"type":"enum","values":["decimal","percent","unit"],"description":""},
        "maximum-fraction-digits": {"type":"number","description":"","minimum":0},
        "minimum-fraction-digits": {"type":"number","description":"","minimum":0},
        "notation": {"type":"enum","values":["compact"],"description":""},
        "unit": {"type":"string","description":""},
        "value": {"type":"number","description":""}
      },
      "slots": {},
      "tag": "ki-format-number",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-grid": {
      "description": "",
      "events": {},
      "props": {
        "columns": {"type":"number","description":"","minimum":1},
        "gap": {"type":"enum","values":["10xl","11xl","12xl","13xl","14xl","15xl","16xl","17xl","18xl","19xl","20xl","21xl","22xl","23xl","24xl","25xl","26xl","2xl","3xl","4xl","5xl","6xl","7xl","8xl","9xl","lg","md","sm","xl","xs","xxs","zero"],"description":"","default":"xl"},
        "min-column": {"type":"string","description":"","default":"15rem"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-grid",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-icon": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":""},
        "name": {"type":"string","description":"","required":true},
        "size": {"type":"enum","values":["inherit","lg","md","sm"],"description":"","default":"inherit"}
      },
      "slots": {},
      "tag": "ki-icon",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-icon-button": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "command": {"type":"enum","values":["close","request-close","show-modal"],"description":""},
        "commandfor": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "expanded": {"type":"boolean","description":""},
        "label": {"type":"string","description":"","required":true},
        "loading": {"type":"boolean","description":"","default":false},
        "loading-label": {"type":"string","description":"","default":"Loading"},
        "pressed": {"type":"boolean","description":""},
        "selected": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "toggle": {"type":"boolean","description":"","default":false},
        "tone": {"type":"enum","values":["danger","neutral","success"],"description":"","default":"neutral"},
        "variant": {"type":"enum","values":["ghost","outline","primary","quaternary","secondary"],"description":"","default":"secondary","deprecatedValues":["tertiary"]}
      },
      "slots": {
        "": "",
        "counter": "",
        "selected": ""
      },
      "tag": "ki-icon-button",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-image": {
      "description": "",
      "events": {
        "ki-error": ""
      },
      "props": {
        "alt": {"type":"string","description":""},
        "decorative": {"type":"boolean","description":"","default":false},
        "fallback-label": {"type":"string","description":"","default":"Image unavailable"},
        "fit": {"type":"enum","values":["contain","cover"],"description":"","default":"cover"},
        "loading": {"type":"enum","values":["eager","lazy"],"description":"","default":"lazy"},
        "radius": {"type":"enum","values":["lg","md","none"],"description":"","default":"lg"},
        "ratio": {"type":"enum","values":["16:9","1:1","3:2","4:3","auto"],"description":"","default":"auto"},
        "src": {"type":"string","description":"","required":true,"format":"url"}
      },
      "slots": {
        "caption": ""
      },
      "tag": "ki-image",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-indicator": {
      "description": "",
      "events": {},
      "props": {
        "count": {"type":"number","description":"","minimum":0,"maximum":20},
        "current": {"type":"number","description":"","minimum":1,"maximum":20},
        "label": {"type":"string","description":"","required":true}
      },
      "slots": {},
      "tag": "ki-indicator",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-input": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "ai-suggestion-text": {"type":"string","description":"","default":"Suggested by AI"},
        "appearance": {"type":"enum","values":["default","filled","outlined"],"description":"","default":"default"},
        "autocomplete": {"type":"string","description":""},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "label-hint": {"type":"string","description":""},
        "maxlength": {"type":"number","description":"","minimum":0,"maximum":2147483647},
        "minlength": {"type":"number","description":"","minimum":0,"maximum":2147483647},
        "name": {"type":"string","description":""},
        "placeholder": {"type":"string","description":""},
        "readonly": {"type":"boolean","description":"","default":false},
        "required": {"type":"boolean","description":"","default":false},
        "show-count": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "type": {"type":"enum","values":["email","password","search","tel","text","url"],"description":"","default":"text"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "action": "",
        "end": "",
        "start": ""
      },
      "tag": "ki-input",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-link": {
      "description": "",
      "events": {},
      "props": {
        "download": {"type":"string","description":""},
        "external": {"type":"boolean","description":"","default":false},
        "external-label": {"type":"string","description":"","default":"(opens in a new tab)"},
        "href": {"type":"string","description":"","required":true,"format":"url"},
        "rel": {"type":"string","description":""},
        "target": {"type":"string","description":""},
        "underline": {"type":"enum","values":["always","hover"],"description":"","default":"always"},
        "variant": {"type":"enum","values":["neutral","primary"],"description":"","default":"primary"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-link",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-list": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "label": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "required": {"type":"boolean","description":"","default":false},
        "selection": {"type":"enum","values":["multiple","none","single"],"description":"","default":"none"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-list",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-list-item": {
      "description": "",
      "events": {},
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","format":"url"},
        "selected": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl"],"description":"","default":"md"},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "end": "",
        "secondary": "",
        "start": ""
      },
      "tag": "ki-list-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-markdown": {
      "description": "",
      "events": {},
      "props": {
        "allow-images": {"type":"boolean","description":"","default":false},
        "heading-offset": {"type":"number","description":"","default":2,"minimum":0,"maximum":5},
        "src-text": {"type":"string","description":""},
        "streaming": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-markdown",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-menu": {
      "description": "",
      "events": {
        "ki-select": ""
      },
      "props": {
        "anchor": {"type":"string","description":"","default":"","format":"idref"},
        "filter-label": {"type":"string","description":"","default":""},
        "filter-results-label": {"type":"string","description":"","default":"Matching actions: {count}"},
        "open": {"type":"boolean","description":"","default":false},
        "placement": {"type":"enum","values":["bottom-end","bottom-start","top-end","top-start"],"description":"","default":"bottom-start"}
      },
      "slots": {
        "": "",
        "header": ""
      },
      "tag": "ki-menu",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-menu-group": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-menu-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-menu-item": {
      "description": "",
      "events": {},
      "props": {
        "checked": {"type":"boolean","description":"","default":false},
        "disabled": {"type":"boolean","description":"","default":false},
        "shortcut": {"type":"string","description":"","default":""},
        "tone": {"type":"enum","values":["danger","neutral"],"description":"","default":"neutral"},
        "type": {"type":"enum","values":["checkbox","item","radio"],"description":"","default":"item"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": "",
        "start": ""
      },
      "tag": "ki-menu-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-message": {
      "description": "",
      "events": {
        "ki-branch-change": "",
        "ki-feedback": "",
        "ki-regenerate": ""
      },
      "props": {
        "actions-label": {"type":"string","description":""},
        "author": {"type":"string","description":""},
        "branch-count": {"type":"number","description":"","default":1},
        "branch-index": {"type":"number","description":"","default":1},
        "branch-status-label": {"type":"string","description":"","default":"Response {index} of {count}"},
        "feedback": {"type":"enum","values":["bad","good"],"description":""},
        "icon-name": {"type":"string","description":""},
        "message-role": {"type":"enum","values":["assistant","event","user"],"description":""},
        "next-branch-label": {"type":"string","description":"","default":"Next response"},
        "previous-branch-label": {"type":"string","description":"","default":"Previous response"},
        "streaming": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": "",
        "actions": "",
        "avatar": ""
      },
      "tag": "ki-message",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-mobile-nav": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","default":"Main"},
        "variant": {"type":"enum","values":["fixed","floating"],"description":"","default":"fixed"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-mobile-nav",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-mobile-nav-item": {
      "description": "",
      "events": {},
      "props": {
        "count": {"type":"number","description":""},
        "count-label": {"type":"string","description":"","default":"{count} new"},
        "current": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","required":true,"format":"url"},
        "icon-name": {"type":"string","description":"","required":true}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-mobile-nav-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-note": {
      "description": "",
      "events": {},
      "props": {
        "icon": {"type":"boolean","description":"","default":true},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"md"},
        "tone": {"type":"enum","values":["danger","info","neutral","primary","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": "",
        "icon": ""
      },
      "tag": "ki-note",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-number-input": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "decrease-label": {"type":"string","description":"","default":"Decrease {label}"},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "format": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "increase-label": {"type":"string","description":"","default":"Increase {label}"},
        "invalid-number-message": {"type":"string","description":"","default":"Enter a number."},
        "label": {"type":"string","description":"","required":true},
        "max": {"type":"number","description":""},
        "maximum-message": {"type":"string","description":"","default":"Value adjusted to the maximum of {value}."},
        "min": {"type":"number","description":""},
        "minimum-message": {"type":"string","description":"","default":"Value adjusted to the minimum of {value}."},
        "name": {"type":"string","description":""},
        "required": {"type":"boolean","description":"","default":false},
        "step": {"type":"number","description":"","default":1},
        "steppers": {"type":"boolean","description":"","default":false},
        "unit": {"type":"string","description":""},
        "value": {"type":"number","description":""}
      },
      "slots": {},
      "tag": "ki-number-input",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-option": {
      "description": "",
      "events": {},
      "props": {
        "description": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "start": ""
      },
      "tag": "ki-option",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-pagination": {
      "description": "",
      "activationEvent": "ki-page-change",
      "events": {
        "ki-load-more": "",
        "ki-page-change": ""
      },
      "props": {
        "boundaries": {"type":"number","description":"","default":1,"minimum":0,"maximum":10},
        "compact-label": {"type":"string","description":"","default":"Page {page} of {pages}"},
        "href-template": {"type":"string","description":"","format":"url"},
        "label": {"type":"string","description":"","default":"Pagination"},
        "load-more-label": {"type":"string","description":"","default":"Load more"},
        "next-label": {"type":"string","description":"","default":"Next page"},
        "page": {"type":"number","description":"","default":1,"minimum":1},
        "page-label": {"type":"string","description":"","default":"Page {page}"},
        "pages": {"type":"number","description":"","minimum":0},
        "previous-label": {"type":"string","description":"","default":"Previous page"},
        "shown": {"type":"number","description":"","minimum":0},
        "siblings": {"type":"number","description":"","default":1,"minimum":0,"maximum":10},
        "status-label": {"type":"string","description":"","default":"Showing {shown} of {total} results"},
        "total": {"type":"number","description":"","minimum":0},
        "variant": {"type":"enum","values":["compact","load-more","pages"],"description":"","default":"pages"}
      },
      "slots": {},
      "tag": "ki-pagination",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-popover": {
      "description": "",
      "events": {
        "ki-close": "",
        "ki-open": ""
      },
      "props": {
        "appearance": {"type":"enum","values":["default","rich"],"description":"","default":"default"},
        "arrow": {"type":"boolean","description":"","default":true},
        "for": {"type":"string","description":"","format":"idref"},
        "kind": {"type":"enum","values":["dialog","toggletip"],"description":"","default":"dialog"},
        "label": {"type":"string","description":"","default":"Popover"},
        "open": {"type":"boolean","description":"","default":false},
        "placement": {"type":"enum","values":["bottom","bottom-end","bottom-start","end","end-end","end-start","start","start-end","start-start","top","top-end","top-start"],"description":"","default":"bottom-start"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-popover",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-progress": {
      "description": "",
      "events": {},
      "props": {
        "indeterminate": {"type":"boolean","description":"","default":false},
        "label": {"type":"string","description":"","required":true},
        "max": {"type":"number","description":"","default":100},
        "shape": {"type":"enum","values":["circular","linear"],"description":"","default":"linear"},
        "value": {"type":"number","description":"","default":0}
      },
      "slots": {},
      "tag": "ki-progress",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-prompt-input": {
      "description": "",
      "events": {
        "ki-stop": "",
        "ki-submit": ""
      },
      "props": {
        "accept": {"type":"string","description":"","default":""},
        "attach-label": {"type":"string","description":"","default":"Attach files"},
        "attachments-label": {"type":"string","description":"","default":"Attachments"},
        "disabled": {"type":"boolean","description":"","default":false},
        "file-count-message": {"type":"string","description":"","default":"{name} exceeds the maximum number of attachments."},
        "file-size-message": {"type":"string","description":"","default":"{name} exceeds the file size limit."},
        "file-type-message": {"type":"string","description":"","default":"{name} has an unsupported file type."},
        "label": {"type":"string","description":"","required":true},
        "max-files": {"type":"number","description":""},
        "max-size": {"type":"number","description":""},
        "name": {"type":"string","description":""},
        "placeholder": {"type":"string","description":""},
        "remove-label": {"type":"string","description":"","default":"Remove"},
        "send-label": {"type":"string","description":"","default":"Send"},
        "status": {"type":"enum","values":["idle","streaming","submitted"],"description":"","default":"idle"},
        "stop-label": {"type":"string","description":"","default":"Stop generating"},
        "submit-on": {"type":"enum","values":["enter","mod-enter"],"description":"","default":"enter"},
        "value": {"type":"string","description":"","default":""},
        "writing-message": {"type":"string","description":"","default":"Writing…"}
      },
      "slots": {
        "attachments": "",
        "tools": ""
      },
      "tag": "ki-prompt-input",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-qr": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":""},
        "value": {"type":"string","description":""}
      },
      "slots": {},
      "tag": "ki-qr",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-radio": {
      "description": "",
      "events": {},
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":"","default":"on"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-radio",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-radio-group": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "label-hidden": {"type":"boolean","description":"","default":false},
        "label-hint": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "required": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["md","sm"],"description":"","default":"md"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-radio-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-rating": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "icon-name": {"type":"string","description":"","default":"star"},
        "label": {"type":"string","description":"","required":true},
        "max": {"type":"number","description":"","default":5,"minimum":1,"maximum":10},
        "name": {"type":"string","description":""},
        "option-label": {"type":"string","description":"","default":"{value} stars"},
        "option-singular-label": {"type":"string","description":"","default":"{value} star"},
        "precision": {"type":"number","description":"","default":1},
        "rated-label": {"type":"string","description":"","default":"Rated {value} out of {max}"},
        "readonly": {"type":"boolean","description":"","default":false},
        "required": {"type":"boolean","description":"","default":false},
        "required-message": {"type":"string","description":"","default":"Select a rating."},
        "score-label": {"type":"string","description":"","default":"{value} of {max}"},
        "value": {"type":"number","description":"","default":0,"minimum":0,"maximum":10}
      },
      "slots": {},
      "tag": "ki-rating",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-reasoning": {
      "description": "",
      "events": {
        "ki-toggle": ""
      },
      "props": {
        "done-label": {"type":"string","description":"","default":"Thought"},
        "duration": {"type":"number","description":""},
        "duration-label": {"type":"string","description":"","default":"Thought for {seconds} seconds"},
        "open": {"type":"boolean","description":"","default":false},
        "singular-duration-label": {"type":"string","description":"","default":"Thought for {seconds} second"},
        "status": {"type":"enum","values":["done","thinking"],"description":"","default":"thinking"},
        "thinking-label": {"type":"string","description":"","default":"Thinking…"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-reasoning",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-relative-time": {
      "description": "",
      "events": {},
      "props": {
        "date": {"type":"string","description":""},
        "numeric": {"type":"enum","values":["always","auto"],"description":"","default":"auto"},
        "sync": {"type":"boolean","description":"","default":false},
        "threshold": {"type":"number","description":"","minimum":0}
      },
      "slots": {},
      "tag": "ki-relative-time",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-scroller": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","required":true},
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"vertical"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-scroller",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-search": {
      "description": "",
      "events": {
        "ki-clear": "",
        "ki-input": "",
        "ki-remove-recent": "",
        "ki-search": ""
      },
      "props": {
        "back-label": {"type":"string","description":"","default":"Back"},
        "clear-label": {"type":"string","description":"","default":"Clear search"},
        "highlight": {"type":"boolean","description":"","default":true},
        "label": {"type":"string","description":"","default":"Search"},
        "loading": {"type":"boolean","description":"","default":false},
        "loading-label": {"type":"string","description":"","default":"Loading suggestions"},
        "mode": {"type":"enum","values":["auto","docked","fullscreen"],"description":"","default":"auto"},
        "name": {"type":"string","description":""},
        "open": {"type":"boolean","description":"","default":false},
        "placeholder": {"type":"string","description":"","default":""},
        "recent-label": {"type":"string","description":"","default":"Recent searches"},
        "remove-recent-label": {"type":"string","description":"","default":"Remove {value}"},
        "suggestion-count-plural": {"type":"string","description":"","default":"{count} suggestions"},
        "suggestion-count-singular": {"type":"string","description":"","default":"1 suggestion"},
        "suggestions-label": {"type":"string","description":"","default":"Suggestions"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": "",
        "leading": "",
        "results": "",
        "trailing": ""
      },
      "tag": "ki-search",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-search-suggestion": {
      "description": "",
      "events": {},
      "props": {
        "description": {"type":"string","description":""},
        "recent": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-search-suggestion",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-segment": {
      "description": "",
      "events": {},
      "props": {
        "aria-label": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":"","required":true}
      },
      "slots": {
        "": "",
        "start": ""
      },
      "tag": "ki-segment",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-segmented-control": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "full-width": {"type":"boolean","description":"","default":false},
        "label": {"type":"string","description":"","required":true},
        "size": {"type":"enum","values":["md","sm","xs"],"description":"","default":"md"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-segmented-control",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-select": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "label-hint": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "placeholder": {"type":"string","description":"","default":""},
        "required": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-select",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-sidebar": {
      "description": "",
      "events": {
        "ki-sidebar-change": ""
      },
      "props": {
        "collapse-label": {"type":"string","description":"","default":"Collapse sidebar"},
        "collapsed": {"type":"boolean","description":"","default":false},
        "collapsible": {"type":"boolean","description":"","default":false},
        "expand-label": {"type":"string","description":"","default":"Expand sidebar"},
        "label": {"type":"string","description":"","default":"Main"}
      },
      "slots": {
        "": "",
        "brand": "",
        "footer": ""
      },
      "tag": "ki-sidebar",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-sidebar-group": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","required":true}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-sidebar-group",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-sidebar-item": {
      "description": "",
      "events": {},
      "props": {
        "count": {"type":"number","description":""},
        "count-label": {"type":"string","description":"","default":"{label}, {count} new"},
        "current": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","format":"url"},
        "icon-name": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "start": ""
      },
      "tag": "ki-sidebar-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-skeleton": {
      "description": "",
      "events": {},
      "props": {
        "animated": {"type":"boolean","description":"","default":true},
        "block-size": {"type":"string","description":""},
        "inline-size": {"type":"string","description":""},
        "lines": {"type":"number","description":"","default":1,"minimum":1,"maximum":20},
        "shape": {"type":"enum","values":["circle","rect","text"],"description":"","default":"text"},
        "size": {"type":"string","description":""}
      },
      "slots": {},
      "tag": "ki-skeleton",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-slider": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "centered": {"type":"boolean","description":"","default":false},
        "currency": {"type":"string","description":"","default":"EUR"},
        "disabled": {"type":"boolean","description":"","default":false},
        "format": {"type":"enum","values":["currency","number","percent"],"description":"","default":"number"},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","default":"Slider"},
        "marks": {"type":"number","description":"","default":0,"minimum":0,"maximum":100},
        "max": {"type":"number","description":"","default":100},
        "maximum-label": {"type":"string","description":"","default":"maximum"},
        "min": {"type":"number","description":"","default":0},
        "minimum-label": {"type":"string","description":"","default":"minimum"},
        "name": {"type":"string","description":""},
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"horizontal"},
        "range": {"type":"boolean","description":"","default":false},
        "step": {"type":"number","description":"","default":1},
        "value": {"type":"number-or-string","description":""}
      },
      "slots": {},
      "tag": "ki-slider",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-source": {
      "description": "",
      "events": {},
      "props": {
        "href": {"type":"string","description":"","required":true,"format":"url"},
        "snippet": {"type":"string","description":""},
        "source-id": {"type":"string","description":""},
        "title": {"type":"string","description":"","required":true}
      },
      "slots": {},
      "tag": "ki-source",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-sources": {
      "description": "",
      "events": {},
      "props": {
        "open": {"type":"boolean","description":"","default":false},
        "source-count-label": {"type":"string","description":"","default":"{count} source"},
        "sources-count-label": {"type":"string","description":"","default":"{count} sources"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-sources",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-spinner": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","required":true},
        "show-label": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm"],"description":"","default":"md"},
        "variant": {"type":"enum","values":["dots","ring"],"description":"","default":"ring"}
      },
      "slots": {},
      "tag": "ki-spinner",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-stack": {
      "description": "",
      "events": {},
      "props": {
        "align": {"type":"enum","values":["baseline","center","end","start","stretch"],"description":"","default":"stretch"},
        "direction": {"type":"enum","values":["column","row"],"description":"","default":"column"},
        "gap": {"type":"enum","values":["10xl","11xl","12xl","13xl","14xl","15xl","16xl","17xl","18xl","19xl","20xl","21xl","22xl","23xl","24xl","25xl","26xl","2xl","3xl","4xl","5xl","6xl","7xl","8xl","9xl","lg","md","sm","xl","xs","xxs","zero"],"description":"","default":"md"},
        "justify": {"type":"enum","values":["between","center","end","start"],"description":"","default":"start"},
        "wrap": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-stack",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-stat": {
      "description": "",
      "events": {},
      "props": {
        "delta": {"type":"number","description":""},
        "delta-label": {"type":"string","description":""},
        "direction": {"type":"enum","values":["higher-is-better","lower-is-better","neutral"],"description":"","default":"higher-is-better"},
        "down-label": {"type":"string","description":"","default":"down"},
        "label": {"type":"string","description":"","required":true},
        "unit": {"type":"string","description":""},
        "up-label": {"type":"string","description":"","default":"up"},
        "value": {"type":"number","description":"","required":true}
      },
      "slots": {
        "chart": ""
      },
      "tag": "ki-stat",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-status": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":""},
        "ring": {"type":"boolean","description":"","default":false},
        "tone": {"type":"enum","values":["danger","info","neutral","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {},
      "tag": "ki-status",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-step": {
      "description": "",
      "events": {},
      "props": {
        "description": {"type":"string","description":""},
        "href": {"type":"string","description":"","format":"url"},
        "state": {"type":"enum","values":["current","done","error","upcoming"],"description":"","default":"upcoming"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-step",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-stepper": {
      "description": "",
      "events": {},
      "props": {
        "count-label": {"type":"string","description":"","default":"Steps ({total})"},
        "current-label": {"type":"string","description":"","default":"Current"},
        "done-label": {"type":"string","description":"","default":"Completed"},
        "error-label": {"type":"string","description":"","default":"Error"},
        "label": {"type":"string","description":"","required":true},
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"horizontal"},
        "summary-label": {"type":"string","description":"","default":"Step {current} of {total}"},
        "upcoming-label": {"type":"string","description":"","default":"Not started"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-stepper",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-suggestion": {
      "description": "",
      "events": {},
      "props": {
        "description": {"type":"string","description":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-suggestion",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-suggestions": {
      "description": "",
      "events": {
        "ki-select": ""
      },
      "props": {
        "label": {"type":"string","description":"","required":true},
        "mode": {"type":"enum","values":["fill","send"],"description":"","default":"send"},
        "variant": {"type":"enum","values":["cards","chips"],"description":"","default":"chips"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-suggestions",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-switch": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "checked": {"type":"boolean","description":"","default":false},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "help-text": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "size": {"type":"enum","values":["lg","md","sm","xl"],"description":"","default":"md"},
        "value": {"type":"string","description":""}
      },
      "slots": {
        "": "",
        "end": ""
      },
      "tag": "ki-switch",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tab": {
      "description": "",
      "events": {},
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "selected": {"type":"boolean","description":"","default":false},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": "",
        "end": "",
        "icon": "",
        "start": ""
      },
      "tag": "ki-tab",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tab-panel": {
      "description": "",
      "events": {},
      "props": {
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-tab-panel",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-table": {
      "description": "",
      "events": {
        "ki-selection-change": "",
        "ki-sort": ""
      },
      "props": {
        "density": {"type":"enum","values":["compact","default"],"description":"","default":"default"},
        "loading": {"type":"boolean","description":"","default":false},
        "row-selection-label": {"type":"string","description":"","default":"Select {row}"},
        "select-all-label": {"type":"string","description":"","default":"Select all rows"},
        "selectable": {"type":"boolean","description":"","default":false},
        "sticky-header": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-table",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tabs": {
      "description": "",
      "events": {
        "ki-change": ""
      },
      "props": {
        "icon-layout": {"type":"enum","values":["inline","stacked"],"description":""},
        "label": {"type":"string","description":""},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "value": {"type":"string","description":"","default":""},
        "variant": {"type":"enum","values":["primary","secondary"],"description":"","default":"primary"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-tabs",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-textarea": {
      "description": "",
      "events": {
        "change": ""
      },
      "props": {
        "appearance": {"type":"enum","values":["default","filled","outlined"],"description":"","default":"default"},
        "autocomplete": {"type":"string","description":""},
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "label": {"type":"string","description":"","required":true},
        "label-hint": {"type":"string","description":""},
        "maxlength": {"type":"number","description":"","minimum":0,"maximum":2147483647},
        "maxlength-error-text": {"type":"string","description":"","default":"Shorten the text to fit the character limit."},
        "minlength": {"type":"number","description":"","minimum":0,"maximum":2147483647},
        "name": {"type":"string","description":""},
        "placeholder": {"type":"string","description":""},
        "readonly": {"type":"boolean","description":"","default":false},
        "required": {"type":"boolean","description":"","default":false},
        "rows": {"type":"number","description":"","default":2},
        "show-count": {"type":"boolean","description":"","default":false},
        "size": {"type":"enum","values":["lg","md","sm","xl","xs"],"description":"","default":"md"},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {},
      "tag": "ki-textarea",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-time-input": {
      "description": "",
      "events": {
        "change": "",
        "ki-change": ""
      },
      "props": {
        "custom-error": {"type":"string","description":""},
        "disabled": {"type":"boolean","description":"","default":false},
        "error-text": {"type":"string","description":""},
        "help-text": {"type":"string","description":""},
        "invalid-time-text": {"type":"string","description":"","default":"Enter a valid time within the allowed range."},
        "label": {"type":"string","description":"","required":true},
        "list-label": {"type":"string","description":"","default":"Suggested times"},
        "max": {"type":"string","description":""},
        "min": {"type":"string","description":""},
        "name": {"type":"string","description":""},
        "picker-label": {"type":"string","description":"","default":"Choose time"},
        "required": {"type":"boolean","description":"","default":false},
        "step": {"type":"number","description":"","default":30},
        "time-zone": {"type":"string","description":""},
        "value": {"type":"string","description":"","default":""}
      },
      "slots": {
        "start": ""
      },
      "tag": "ki-time-input",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-timeline": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":""},
        "order": {"type":"enum","values":["newest-first","oldest-first"],"description":"","default":"newest-first"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-timeline",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-timeline-item": {
      "description": "",
      "events": {},
      "props": {
        "datetime": {"type":"string","description":""},
        "details-label": {"type":"string","description":"","default":"Details"},
        "icon-name": {"type":"string","description":""},
        "tone": {"type":"enum","values":["danger","neutral","primary","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": "",
        "details": "",
        "start": ""
      },
      "tag": "ki-timeline-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-toast": {
      "description": "",
      "events": {
        "ki-dismiss": ""
      },
      "props": {
        "dismiss-label": {"type":"string","description":"","default":"Dismiss"},
        "dismissed": {"type":"boolean","description":"","default":false},
        "dismissible": {"type":"boolean","description":"","default":true},
        "duration": {"type":"number","description":"","minimum":0},
        "heading": {"type":"string","description":""},
        "queued": {"type":"boolean","description":"","default":false},
        "tone": {"type":"enum","values":["danger","info","neutral","success","warning"],"description":"","default":"neutral"}
      },
      "slots": {
        "": "",
        "action": ""
      },
      "tag": "ki-toast",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-toaster": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","default":"Notifications"},
        "max": {"type":"number","description":"","default":3,"minimum":1},
        "placement": {"type":"enum","values":["bottom-center","bottom-end","top-center","top-end"],"description":"","default":"bottom-end"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-toaster",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tool-call": {
      "description": "",
      "events": {
        "ki-tool-retry": ""
      },
      "props": {
        "approval-label": {"type":"string","description":"","default":"Needs approval"},
        "done-label": {"type":"string","description":"","default":"Done"},
        "duration": {"type":"number","description":"","minimum":0},
        "error-label": {"type":"string","description":"","default":"Error"},
        "failed-label": {"type":"string","description":"","default":"Failed"},
        "input-label": {"type":"string","description":"","default":"Input"},
        "locale": {"type":"string","description":"","default":"en"},
        "name": {"type":"string","description":"","required":true},
        "open": {"type":"boolean","description":""},
        "output-label": {"type":"string","description":"","default":"Output"},
        "pending-label": {"type":"string","description":"","default":"Pending"},
        "retry-label": {"type":"string","description":"","default":"Retry"},
        "retryable": {"type":"boolean","description":"","default":false},
        "running-label": {"type":"string","description":"","default":"Running"},
        "status": {"type":"enum","values":["approval","done","failed","pending","running"],"description":"","default":"pending"},
        "title": {"type":"string","description":""}
      },
      "slots": {
        "error": "",
        "input": "",
        "output": ""
      },
      "tag": "ki-tool-call",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-toolbar": {
      "description": "",
      "events": {},
      "props": {
        "hide-on-scroll": {"type":"boolean","description":"","default":false},
        "label": {"type":"string","description":"","required":true},
        "orientation": {"type":"enum","values":["horizontal","vertical"],"description":"","default":"horizontal"},
        "tone": {"type":"enum","values":["standard","vibrant"],"description":"","default":"standard"},
        "variant": {"type":"enum","values":["docked","floating"],"description":"","default":"floating"}
      },
      "slots": {
        "": "",
        "fab": ""
      },
      "tag": "ki-toolbar",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tooltip": {
      "description": "",
      "events": {},
      "props": {
        "for": {"type":"string","description":"","format":"idref"},
        "heading": {"type":"string","description":""},
        "label": {"type":"string","description":"","default":""},
        "placement": {"type":"enum","values":["bottom","end","start","top"],"description":"","default":"top"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-tooltip",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-top-nav": {
      "description": "",
      "events": {},
      "props": {
        "collapse-at": {"type":"string","description":"","default":"48rem"},
        "heading-level": {"type":"number","description":"","default":1},
        "label": {"type":"string","description":"","default":"Main"},
        "navigation-label": {"type":"string","description":"","default":"Open navigation"},
        "overflow-label": {"type":"string","description":"","default":"More actions"},
        "scroll-behavior": {"type":"enum","values":["collapse","elevate","none"],"description":"","default":"elevate"},
        "size": {"type":"enum","values":["lg","md","sm","xl"],"description":"","default":"md"},
        "sticky": {"type":"boolean","description":"","default":false},
        "subtitle": {"type":"string","description":"","default":""},
        "title": {"type":"string","description":"","default":""},
        "title-align": {"type":"enum","values":["center","start"],"description":"","default":"start"},
        "variant": {"type":"enum","values":["app-bar","header"],"description":"","default":"header"}
      },
      "slots": {
        "": "",
        "actions": "",
        "brand": "",
        "leading": "",
        "search": ""
      },
      "tag": "ki-top-nav",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tree": {
      "description": "",
      "events": {
        "ki-selection-change": ""
      },
      "props": {
        "label": {"type":"string","description":"","default":"Tree"},
        "selection": {"type":"enum","values":["multiple","none","single"],"description":"","default":"single"}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-tree",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-tree-item": {
      "description": "",
      "events": {
        "ki-collapse": "",
        "ki-expand": "",
        "ki-load": ""
      },
      "props": {
        "disabled": {"type":"boolean","description":"","default":false},
        "expanded": {"type":"boolean","description":"","default":false},
        "href": {"type":"string","description":"","format":"url"},
        "icon-name": {"type":"string","description":""},
        "lazy": {"type":"boolean","description":"","default":false},
        "loading-label": {"type":"string","description":"","default":"Loading"},
        "selected": {"type":"boolean","description":"","default":false}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-tree-item",
      "whenNotToUse": "",
      "whenToUse": ""
    },
    "ki-video": {
      "description": "",
      "events": {},
      "props": {
        "label": {"type":"string","description":"","required":true}
      },
      "slots": {
        "": ""
      },
      "tag": "ki-video",
      "whenNotToUse": "",
      "whenToUse": ""
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
        "scope": {"description":"What the cell heads: `col` for the column below it, `row` for the rest of its row. Optional: without it the browser infers it.","type":"enum","values":["col","row"]}
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
  }
};
