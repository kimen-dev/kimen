// GENERATED FILE (spec 027, Art. I) — never edit by hand.
// Sources: packages/elements/generated/custom-elements.json and component.json opt-ins.
// Generator: packages/catalog/scripts/generate-catalog.mjs. The catalog-sync gate
// fails any drift between this artifact and a fresh regeneration.
import { withGuidance } from '../guidance.js';
import { catalogGuidance } from './catalog-guidance.js';
import { catalogStructure } from './catalog-structure.js';

/** The whole catalog: the structure with its guidance prose written back. */
export const catalogData = /* @__PURE__ */ withGuidance(
  catalogStructure,
  catalogGuidance,
  "0.6.0",
) as {
  readonly catalogSchemaVersion: "1.9.0";
  readonly components: {
    readonly caption: {
      readonly description: "The native caption of a table (`<caption>`): its title, which names the table for assistive technology.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "caption";
      readonly whenNotToUse: "Do not use it outside a table, after its thead or tbody, or twice in one table. Never bind an action.";
      readonly whenToUse: "Title every table, as its first child, so the table has an accessible name.";
    };
    readonly div: {
      readonly description: "A native layout container (`<div>`) that lays its children out as a flex column or row, separated by a spacing token. It has no visual identity of its own: no background, border or padding.";
      readonly events: {};
      readonly props: {
        readonly align: {
          readonly default: "stretch";
          readonly description: "Cross-axis alignment of the children (flow-relative: `start` follows the writing direction).";
          readonly type: "enum";
          readonly values: readonly ["start", "center", "end", "stretch"];
        };
        readonly direction: {
          readonly default: "column";
          readonly description: "Main axis: `column` stacks the children in the block direction, `row` lines them up in the inline direction.";
          readonly type: "enum";
          readonly values: readonly ["column", "row"];
        };
        readonly gap: {
          readonly default: "md";
          readonly description: "Space between the children, one of the spacing token steps (`--ki-space-<step>`): zero, xs, sm, md, lg, xl, 3xl or 7xl.";
          readonly type: "enum";
          readonly values: readonly ["zero", "xs", "sm", "md", "lg", "xl", "3xl", "7xl"];
        };
        readonly justify: {
          readonly default: "start";
          readonly description: "Main-axis distribution of the children (flow-relative).";
          readonly type: "enum";
          readonly values: readonly ["start", "center", "end", "space-between"];
        };
        readonly wrap: {
          readonly default: false;
          readonly description: "Whether the children wrap onto further lines when they do not fit.";
          readonly type: "boolean";
        };
      };
      readonly slots: {
        readonly "": "The children, laid out in order: text, native primitives and catalog components.";
      };
      readonly tag: "div";
      readonly whenNotToUse: "Do not use it as a card, a panel with a surface, a list or a clickable area (use ki-card, ki-list or ki-button). Never bind an action.";
      readonly whenToUse: "Group content into a column or a row: the root of a generated panel, a toolbar of buttons, a figure next to its caption.";
    };
    readonly em: {
      readonly description: "Native stress emphasis (`<em>`) inside a heading, a paragraph or another emphasis element.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "em";
      readonly whenNotToUse: "Do not use it for whole paragraphs, for headings or merely to italicize. Never bind an action.";
      readonly whenToUse: "Stress one word or phrase so a sentence reads with its intended emphasis.";
    };
    readonly h2: {
      readonly description: "A native level-2 heading (`<h2>`) that takes the host page's typography.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "h2";
      readonly whenNotToUse: "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.";
      readonly whenToUse: "Title a generated panel or one of its main sections; use h3 and h4 for subsections, in order.";
    };
    readonly h3: {
      readonly description: "A native level-3 heading (`<h3>`) that takes the host page's typography.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "h3";
      readonly whenNotToUse: "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.";
      readonly whenToUse: "Title a subsection under an h2, such as the heading of one card or group.";
    };
    readonly h4: {
      readonly description: "A native level-4 heading (`<h4>`) that takes the host page's typography.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "h4";
      readonly whenNotToUse: "Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.";
      readonly whenToUse: "Title a subsection under an h3, the deepest level a generated panel may use.";
    };
    readonly img: {
      readonly description: "A native image (`<img>`) loaded from a URL that passes the URL policy. It is sent without a referrer and never grows wider than its container.";
      readonly events: {};
      readonly props: {
        readonly alt: {
          readonly allowEmpty: true;
          readonly description: "The text alternative: what the image shows, for people who cannot see it. Exactly \"\" marks a decorative image that assistive technology skips; white space alone is rejected.";
          readonly required: true;
          readonly type: "string";
        };
        readonly height: {
          readonly description: "Intrinsic height in CSS pixels, a hint that reserves the aspect ratio before the image loads.";
          readonly maximum: 4096;
          readonly minimum: 1;
          readonly type: "number";
        };
        readonly src: {
          readonly description: "The image URL: http(s) or a relative reference, and an allowed origin when the host declares origins. javascript:, data: and blob: URLs are rejected.";
          readonly format: "url";
          readonly required: true;
          readonly type: "string";
        };
        readonly width: {
          readonly description: "Intrinsic width in CSS pixels, a hint that reserves the aspect ratio before the image loads; the image still shrinks to fit its container.";
          readonly maximum: 4096;
          readonly minimum: 1;
          readonly type: "number";
        };
      };
      readonly slots: {};
      readonly tag: "img";
      readonly whenNotToUse: "Do not use it for avatars (ki-avatar), for icons inside controls, for text set as an image, or as a button. Never bind an action.";
      readonly whenToUse: "Show a chart, a photo or an illustration that carries content (describe it in alt) or decoration (alt \"\").";
    };
    readonly "ki-accordion": {
      readonly description: "A set of native disclosure panels with a shared frame.";
      readonly events: {};
      readonly props: {
        readonly exclusive: {
          readonly type: "boolean";
          readonly description: "Whether the accordion allows at most one direct member to be open.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Direct ki-details members in reading order.";
      };
      readonly tag: "ki-accordion";
      readonly whenNotToUse: "switch between views or make the panels advance a workflow.";
      readonly whenToUse: "group related FAQ answers, settings or expandable sections.\nEnable exclusive when readers benefit from one open section at a time.";
    };
    readonly "ki-ai-label": {
      readonly description: "A compact provenance mark for AI-generated content, with optional details\nand a user-initiated request to restore their original text.";
      readonly events: {
        readonly "ki-revert": "Bubbles when a person requests their original text. Use this request\nto restore the original from application state.";
      };
      readonly props: {
        readonly explanation: {
          readonly type: "string";
          readonly description: "Plain-text explanation of how the content was generated. Supply a\nnonblank explanation to offer disclosure. Omit it for a static mark.";
        };
        readonly "generated-at": {
          readonly type: "string";
          readonly description: "Optional generation date or time, displayed as supplied.";
        };
        readonly "generated-at-label": {
          readonly type: "string";
          readonly description: "Visible prefix for the generation date or time.";
          readonly default: "Generated";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Short visible provenance text. Localize it with the trigger name.";
          readonly default: "AI";
        };
        readonly model: {
          readonly type: "string";
          readonly description: "Optional plain-text model name shown in the explanation.";
        };
        readonly "model-label": {
          readonly type: "string";
          readonly description: "Visible prefix for the model name.";
          readonly default: "Model:";
        };
        readonly "popover-label": {
          readonly type: "string";
          readonly description: "Accessible name of the non-modal explanation panel.";
          readonly default: "About this content";
        };
        readonly "revert-label": {
          readonly type: "string";
          readonly description: "Visible text and accessible name of the revert action.";
          readonly default: "Revert to my text";
        };
        readonly revertible: {
          readonly type: "boolean";
          readonly description: "Offer the revert action inside the explanation. Enable it when the\napplication has the original text and handles `ki-revert`.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Size of the painted mark. Unknown values use the small metrics.";
          readonly default: "sm";
        };
        readonly "trigger-label": {
          readonly type: "string";
          readonly description: "Accessible name of the disclosure button. Include the visible label.";
          readonly default: "AI-generated: about this content";
        };
      };
      readonly slots: {};
      readonly tag: "ki-ai-label";
      readonly whenNotToUse: "Use a status component for active generation or processing,\nand an application action for changes that do not restore the person's text.";
      readonly whenToUse: "Mark text or a value generated by AI. Include the source in\n`explanation` when people can inspect how it was generated. In a `ki-input`,\nplace the label in the `end` slot to describe the field's provenance.";
    };
    readonly "ki-alert": {
      readonly description: "A persistent inline status message with token-backed tone semantics.";
      readonly events: {
        readonly "ki-dismiss": "Fired once after the user dismisses the alert — emitted after the alert is\nhidden and focus has been handed to the next control. `detail` is `null`\nand the event is not cancelable (the alert is already gone when it runs).\nWhen to use: record acknowledgement, or advance an application flow after a\nuser closes the alert.\nWhen NOT to use: do not treat it as a veto point, and do not expect it for\nprogrammatic `dismissed` changes — it fires only for user activation.";
      };
      readonly props: {
        readonly "dismiss-label": {
          readonly type: "string";
          readonly description: "Accessible name for the dismiss button. Override for localization; the\ndefault English string is the component's only built-in user-visible text.\n\nWhen to use: provide a localized action name whenever the document language\nis not English.\nWhen NOT to use: do not put the alert message here; use the default slot.";
          readonly default: "Dismiss";
        };
        readonly dismissed: {
          readonly type: "boolean";
          readonly description: "Reflected dismissed state. User dismissal sets it; applications may also\nset or clear it. While true, the host remains in the document but renders no\nalert subtree and leaves the accessibility tree. Clearing it re-shows the\nalert and creates a dynamic live-region appearance.\n\nWhen to use: persist or restore acknowledgement state from application\ndata.\nWhen NOT to use: do not listen for programmatic changes as dismissal\nevents; `ki-dismiss` is only for user activation.";
          readonly default: false;
        };
        readonly dismissible: {
          readonly type: "boolean";
          readonly description: "Renders one native dismiss button when true. The button sits outside the\nlive-region boundary, so its accessible name is not announced as part of\nthe alert message. When false, the alert adds no tab stop.\n\nWhen to use: allow a person to acknowledge and clear a persistent message.\nWhen NOT to use: do not use dismissible for auto-expiring messages; those\nbelong to `ki-toast`.";
          readonly default: false;
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Optional emphasized text rendered before the message inside the live\nregion. Empty strings render no heading. The heading is a `strong`\nelement, not a document heading, so it never changes page outline.\n\nWhen to use: add a short label when it helps identify the status message.\nWhen NOT to use: do not use heading for page structure; use a real heading\noutside the alert when the document needs one.";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "success", "warning"];
          readonly description: "Semantic intent for visual styling and live-region urgency. `danger` and\n`warning` expose `role=\"alert\"`; `neutral`, `success`, `info`, absent, and\nunrecognized values expose `role=\"status\"`. Unknown values keep rendering\nand fall back to the neutral token matrix by CSS construction.\n\nWhen to use: choose the tone that describes the page or section state.\nWhen NOT to use: do not use tone for layout, density, or filled-vs-outlined\nstyling; those are token/theme decisions.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Message body. It lives inside the live-region boundary.";
        readonly actions: "Optional responses to this message, in a row at the bottom\nof the card, outside the live region. Slot `size=\"sm\"` buttons. The alert\nnever activates them and an action does not dismiss the alert; the\napplication does, by setting `dismissed`. When NOT to use: a response the\nperson cannot skip belongs in `ki-dialog`.";
        readonly icon: "Optional decorative glyph shown in a round frame at the top of\nthe card, in the tone's colors. Hidden from assistive technology: it never\ncarries meaning the heading and message lack. Without one, a non-neutral\nalert draws its tone's default glyph. When to use: replace the default\nglyph, or give a neutral alert one. When NOT to use: never as the only cue\nfor the message.";
      };
      readonly tag: "ki-alert";
      readonly whenNotToUse: "transient confirmations that expire on their own belong to\n`ki-toast`, raised into a `ki-toaster`; tiny status descriptors attached to\nanother element belong to `ki-badge`; blocking decisions belong to\n`ki-dialog`; inline field-level validation belongs to the form control.\n\nAssistive technology note: alerts that must be announced should be inserted\ndynamically, or re-shown by clearing `dismissed`; alerts present at initial\npage load are exposed with their role but platform announcement is not\nguaranteed.\n\nEvery non-neutral alert draws its tone's glyph in the icon frame (`info`,\n`circle-check`, `triangle-alert`, `octagon-alert`) unless an icon is slotted.";
      readonly whenToUse: "show a persistent inline message about the state of a page or\nsection, such as a failed save, completed operation, or service notice, that\nremains until the condition is resolved or the person dismisses it. Express\nseverity with `tone`, never custom styling.";
    };
    readonly "ki-audio": {
      readonly description: "A recording player with play, pause, a seek timeline, elapsed and total time,\nplayback speed, mute, and an optional transcript link.";
      readonly events: {
        readonly ended: "Forwarded when the recording ends. The catalog can bind a declared action here.";
      };
      readonly props: {
        readonly "error-label": {
          readonly type: "string";
          readonly description: "Message shown if playback cannot start or the recording fails to load.";
          readonly default: "Audio could not be played";
        };
        readonly "mute-label": {
          readonly type: "string";
          readonly description: "Accessible name of the mute button.";
          readonly default: "Mute";
        };
        readonly "pause-label": {
          readonly type: "string";
          readonly description: "Accessible name of the pause button.";
          readonly default: "Pause";
        };
        readonly "play-label": {
          readonly type: "string";
          readonly description: "Accessible name of the play button.";
          readonly default: "Play";
        };
        readonly rates: {
          readonly type: "string";
          readonly description: "Comma-separated playback speeds between 0.25 and 4. Normal speed (1) is always available.";
          readonly default: "0.75,1,1.25,1.5,2";
        };
        readonly "seek-label": {
          readonly type: "string";
          readonly description: "Accessible name of the timeline slider.";
          readonly default: "Seek";
        };
        readonly "speed-label": {
          readonly type: "string";
          readonly description: "Accessible label for the playback-rate picker.";
          readonly default: "Playback speed";
        };
        readonly src: {
          readonly type: "string";
          readonly description: "Source URL for the recording. Use an HTTP(S) URL or a relative URL.";
          readonly required: true;
          readonly format: "url";
        };
        readonly "time-label": {
          readonly type: "string";
          readonly description: "Accessible time template. Keep the {elapsed} and {duration} placeholders.";
          readonly default: "{elapsed} of {duration}";
        };
        readonly title: {
          readonly type: "string";
          readonly description: "Visible title and accessible name of the player.";
          readonly default: "Audio player";
        };
        readonly "transcript-href": {
          readonly type: "string";
          readonly description: "URL for the recording's text transcript. Use an HTTP(S) URL or a relative URL.";
          readonly format: "url";
        };
        readonly "transcript-label": {
          readonly type: "string";
          readonly description: "Text of the transcript link.";
          readonly default: "Read the transcript";
        };
        readonly "unmute-label": {
          readonly type: "string";
          readonly description: "Accessible name of the unmute button.";
          readonly default: "Unmute";
        };
      };
      readonly slots: {};
      readonly tag: "ki-audio";
      readonly whenNotToUse: "show video (use ki-video), play an ambient loop or start playback automatically, or record audio.";
      readonly whenToUse: "play a voice note, interview, or other prerecorded audio that a person deliberately starts. Provide a title and the equivalent text transcript URL when available.";
    };
    readonly "ki-avatar": {
      readonly description: "A static identity visual that shows a person or entity at a glance through\na fallback chain: portrait, then initials, then a built-in generic figure.";
      readonly events: {};
      readonly props: {
        readonly initials: {
          readonly type: "string";
          readonly description: "Initials rendered verbatim as the second fallback step — never derived\nfrom the label, never truncated (FR-003). Catalog guidance: one to two\ncharacters. With a label present the initials are presentational;\nassistive technology receives the label alone.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the identity (\"Ana García\"). With a label the avatar\nis exposed as a named non-interactive image (role `img`) in every content\nmode — the portrait never carries a second alternative text of its own.\nWithout a label the avatar is decorative and contributes nothing to the\naccessibility tree; the identity must then live in adjacent visible text\n(FR-002).";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs", "xxs"];
          readonly description: "Size step over the shared scale; per-size metrics (box, initials font,\nfigure glyph) are per-theme component tokens, never hardcoded (FR-004).\nAn unrecognized value matches no style selector, so the avatar keeps the\ndefault medium metrics (fallback by CSS construction, FR-007).";
          readonly default: "md";
        };
        readonly src: {
          readonly type: "string";
          readonly description: "Portrait URL, the first step of the fallback chain. When it fails to\nload — initially or at runtime — the avatar silently falls back to the\ninitials (or the generic figure) with no error, no layout change and no\nevent (FR-001). Loading policy follows the platform image defaults.";
          readonly format: "url";
        };
      };
      readonly slots: {
        readonly counter: "Decorative ki-counter. Counts sit at block-start inline-end\nand dots at block-end inline-end. Include its meaning in the avatar label.";
      };
      readonly tag: "ki-avatar";
      readonly whenNotToUse: "as a clickable control (compose the avatar inside an\ninteractive host such as ki-button), for logos or arbitrary illustrations\n(plain `img`), or unlabeled when no adjacent text names the identity.\nUse the counter slot for a decorative count or presence dot.";
      readonly whenToUse: "a compact identity visual for a person or entity — a comment\nauthor, a contact list item, a project member. Set `label` whenever the\navatar is the only carrier of the identity (no adjacent visible name);\ncompose several into `ki-avatar-group` for a compact \"who is involved\"\nstack with overflow.";
    };
    readonly "ki-avatar-group": {
      readonly description: "A token-styled companion container that stacks `ki-avatar` children as one\noverlapping row with a configurable visible cap and a static \"+N\" overflow\ncounter.";
      readonly events: {};
      readonly props: {
        readonly max: {
          readonly type: "number";
          readonly description: "Visible cap for the member stack. When the member count exceeds it, the\nfirst `max` members render followed by a \"+N\" counter accounting exactly\nfor the hidden rest. Without it — or when it is not a positive whole\nnumber — every member renders and no counter appears; malformed\nagent-generated markup never breaks the page (FR-009, S14, S15).";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs", "xxs"];
          readonly description: "Size step governing the metrics of every visible member and the counter\n(avatar vocabulary, FR-010). Member-declared sizes are overridden inside\na group so the stack stays uniform (S6). An unrecognized value matches\nno style selector, so the group keeps the default medium metrics\n(FR-007).";
          readonly default: "md";
        };
      };
      readonly slots: {
        readonly "": "`ki-avatar` members, stacked in source order. Members beyond the\nvisible cap are neither rendered nor exposed to assistive technology.";
      };
      readonly tag: "ki-avatar-group";
      readonly whenNotToUse: "as a member picker or expandable overflow (future interactive\ngrouping — the counter is static text, never a button), for a single\nidentity (use `ki-avatar` alone), or with children other than `ki-avatar`\n(foreign markup is unsupported and not repaired, 016 precedent).";
      readonly whenToUse: "a compact \"who is involved\" stack — the members of a shared\ndocument, project card or event row — where space deserves only the first\nfew identities and an exact \"+N\" counter accounts for the rest.";
    };
    readonly "ki-badge": {
      readonly description: "A static, non-interactive status pill.";
      readonly events: {};
      readonly props: {
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm", "xs"];
          readonly description: "Metric scale (`--ki-badge-{size}-*` tokens): 20, 24 or 28px tall in\nonmars, with 12px text at every size. An unrecognized value falls back to\nthe `md` metrics the same way.";
          readonly default: "md";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "success", "warning"];
          readonly description: "Semantic intent, never appearance: each tone resolves its colors from\nthe `--ki-badge-{tone}-*` tokens. An unrecognized value matches no\nstyle selector, so the badge keeps the neutral appearance (fallback by\nCSS construction — no validation code).";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "The label: short status text, the sole carrier of meaning.";
      };
      readonly tag: "ki-badge";
      readonly whenNotToUse: "feedback that must be announced (that is\nki-alert's job — the badge has no live region), an interactive\nchip, filter or button, empty content (the label IS the meaning), or a\nnotification-counter overlay (use ki-counter).";
      readonly whenToUse: "annotate an entity with short status text (a state, a\ncategory) whose meaning is carried by the label itself; the tone color\nonly reinforces the text, it never replaces it.";
    };
    readonly "ki-breadcrumb": {
      readonly description: "A path of ancestor links ending at the current page, with optional overflow.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the navigation landmark.";
          readonly default: "Breadcrumb";
        };
        readonly "max-items": {
          readonly type: "number";
          readonly description: "Optional overflow threshold. Above it, keep the first and last two levels\nvisible. Positive values are rounded down and clamped to four. Omit this\nprop, or pass a non-positive or non-finite value, to show the full trail.";
        };
        readonly "more-label": {
          readonly type: "string";
          readonly description: "Localizable name of the overflow control. Use {n} for the hidden level count.";
          readonly default: "Show {n} more levels";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-breadcrumb-item children in hierarchy order.";
      };
      readonly tag: "ki-breadcrumb";
      readonly whenNotToUse: "switch between peer routes, toggle peer panels, or display progress through a form.";
      readonly whenToUse: "show the current page in a deeper hierarchy using direct ki-breadcrumb-item children ordered from root to current.";
    };
    readonly "ki-breadcrumb-item": {
      readonly description: "One declarative level in a breadcrumb path.";
      readonly events: {};
      readonly props: {
        readonly current: {
          readonly type: "boolean";
          readonly description: "Explicitly marks the final level as current. The owning breadcrumb treats\nits final level as current by position, including when this marker is omitted.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Native destination for an ancestor level. Leaves the label as text when omitted.\nThe final level never links away from the current page.";
          readonly format: "url";
        };
      };
      readonly slots: {
        readonly "": "Plain-text label mirrored by the owning breadcrumb.";
      };
      readonly tag: "ki-breadcrumb-item";
      readonly whenNotToUse: "render a standalone link or display an interactive control inside the label.";
      readonly whenToUse: "declare a direct child of ki-breadcrumb in hierarchy order. Give ancestors an href and use short text labels. The last level is the current page.";
    };
    readonly "ki-button": {
      readonly description: "A token-styled action button with native button semantics.";
      readonly events: {
        readonly "ki-change": "Emitted after toggle activation with the new selected state.";
      };
      readonly props: {
        readonly command: {
          readonly type: "enum";
          readonly values: readonly ["close", "request-close", "show-modal"];
          readonly description: "Dialog action to run for `commandfor`. Use `show-modal` to open,\n`close` for direct dismissal, or `request-close` for guarded dismissal.\nChoose a command for local dialog control and omit it for other actions.";
        };
        readonly commandfor: {
          readonly type: "string";
          readonly description: "ID of a ki-dialog in the same document or shadow tree as this button.\nSet it together with `command` to connect a dialog declaratively.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents activation, removes the button from keyboard reach, and exposes\nthe unavailable state through the internal native button. Wins over\n`loading` when both are set.\nWhen NOT to use: do not use disabled for pending/loading semantics; use\n`loading`.";
          readonly default: false;
        };
        readonly download: {
          readonly type: "string";
          readonly description: "File name to download `href` as; empty lets the browser choose.";
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Destination URL. Nonblank, it renders a native link with the same look;\ntoggle, form and dialog props are then ignored.";
          readonly format: "url";
        };
        readonly loading: {
          readonly type: "boolean";
          readonly description: "Pending state of the action this button started (saving, sending).\nWhile set, every activation is blocked (pointer, Enter and Space) and the\nbutton neither submits nor resets its form, but it stays focusable, in\nthe Tab order and at its width: the label stays laid out, transparent,\nand a spinner is drawn in its place. The internal native button is\nexposed with `aria-disabled=\"true\"` and keeps its name, and\n`loadingLabel` is announced as a polite status message. `disabled`, and\na disabled fieldset, win over it. The application sets it when the\naction starts and clears it when the action ends.\nWhen to use: while the work a click on this button started is running,\nso a second activation cannot repeat it.\nWhen NOT to use: for a button the person cannot use yet (use\n`disabled`), or for the progress of a page or region (use ki-progress).";
          readonly default: false;
        };
        readonly "loading-label": {
          readonly type: "string";
          readonly description: "Text of the polite status message announced while `loading` is set.\nOverride for localization; the default English string is the button's\nonly built-in user-visible text.\nWhen to use: provide a localized message whenever the document language\nis not English, or a more specific one (\"Saving\").\nWhen NOT to use: do not repeat the button's label here; the person\nalready hears it on focus.";
          readonly default: "Loading";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key contributed when this button submits its form.\nWhen NOT to use: omit when no submitter value should be sent.";
        };
        readonly rel: {
          readonly type: "string";
          readonly description: "Link relationships for `href`.";
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "Current press state in toggle mode. Set this to initialize or synchronize\nthe state programmatically without emitting a change.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed button size. Every size keeps at least the minimum pointer\ntarget; choose the size that matches the density of the surrounding UI.\nWhen NOT to use: do not use `ki-button` for icon-only compact controls.";
          readonly default: "md";
        };
        readonly target: {
          readonly type: "string";
          readonly description: "Browsing context for `href`; `_blank` alone gets `rel=\"noreferrer noopener\"`.";
        };
        readonly toggle: {
          readonly type: "boolean";
          readonly description: "Enables persistent press state for an action such as Bold. The native\nbutton exposes `aria-pressed` and each activation switches `selected`.\nUse the same label in both states. A toggle does not submit or reset a form.";
          readonly default: false;
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral", "success"];
          readonly description: "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions. Toggle\npalettes are specific to the variant.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.";
          readonly default: "neutral";
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["button"];
          readonly description: "Native form action type: `submit` submits the owning form (running\nconstraint validation and contributing `name`/`value` to the form data),\n`reset` restores field defaults, and `button` leaves the form alone.\nToggle mode and configured dialog commands take precedence over form actions.\nCancel a submission from the form's `submit` event (`preventDefault()`);\nunlike a native button, `preventDefault()` on the `click` event does not\ncancel it. During submission `event.submitter` is a transient native\nbutton carrying this element's `name`/`value`, not the `ki-button` host.\nWhen NOT to use: use `button` when the action must never submit a form.";
          readonly default: "button";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Form-data value paired with `name` when this button submits its form.\nWhen NOT to use: omit when the default empty submitter value is intended.";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["ghost", "outline", "primary", "quaternary", "secondary"];
          readonly description: "Visual hierarchy for the action. Use filled `primary` for the single main\naction, outlined `secondary` for supporting actions, `quaternary` for\nneutral text actions, `ghost` for accent text actions and `outline` for\nan unfilled action with a visible boundary.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.";
          readonly default: "secondary";
          readonly deprecatedValues: readonly ["tertiary"];
        };
      };
      readonly slots: {
        readonly "": "Label content. This is the accessible name source.";
        readonly end: "Trailing icon or media in writing direction. Uses the start slot's sizing.";
        readonly start: "Leading icon or media in writing direction. Button tokens size a ki-icon glyph, overriding its size.";
      };
      readonly tag: "ki-button";
      readonly whenNotToUse: "links in text (ki-link), icon-only actions, form values, or\nthe progress of a page or region (use ki-progress).";
      readonly whenToUse: "trigger the single main action of a view, supporting actions\nin descending hierarchy, confirming/destructive actions through tone,\npersistent actions such as Bold with `toggle`, or with `href` a call to\naction that navigates.\nWhile the action a button started is in progress, set `loading` on that\nbutton instead of disabling it.";
    };
    readonly "ki-button-group": {
      readonly description: "Arranges related actions as a spaced group, attached group, or keyboard toolbar.";
      readonly events: {};
      readonly props: {
        readonly attached: {
          readonly type: "boolean";
          readonly description: "Joins neighboring actions at their inner edges. Buttons share the first\nbutton's variant and use its size when the group has no explicit size.\nUse for a closely related set of actions or for a split button.";
          readonly default: false;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Required accessible name for the group or toolbar (for example, \"Text formatting\").\nProvide a localized name that describes the actions' shared purpose.";
          readonly required: true;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Applies one token-backed size to each button while it belongs to the group.\nOmit it to keep individual sizes in spaced mode.";
        };
        readonly toolbar: {
          readonly type: "boolean";
          readonly description: "Gives the group toolbar semantics, a framed surface and one Tab stop.\nHorizontal arrows, Home and End move between the toolbar's actions.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Related ki-button and ki-icon-button controls, in reading order.\nWrap labeled icon actions in ki-tooltip with the same label to show the\nlabel on focus and hover. A toolbar can also include vertical separators.";
      };
      readonly tag: "ki-button-group";
      readonly whenNotToUse: "for a single-choice setting, unrelated actions, or navigation.\nUse a segmented control for a single-choice setting and links for navigation.";
      readonly whenToUse: "place two to five related actions together, present a primary\naction with a menu of alternatives, or give formatting tools one Tab stop.";
    };
    readonly "ki-card": {
      readonly description: "A card surface for grouping related content, with an optional primary link or action.";
      readonly events: {
        readonly "ki-activate": "Fires once when the user activates an action card by pointer or keyboard.";
      };
      readonly props: {
        readonly href: {
          readonly type: "string";
          readonly description: "Destination for the card's title link. Supply a text heading in the\nheader slot. A nonblank href takes precedence over interactive.";
          readonly format: "url";
        };
        readonly interactive: {
          readonly type: "boolean";
          readonly description: "Gives a titled card a primary button that emits ki-activate. Use href\nfor navigation. Keep other actions in separate controls in the card.";
          readonly default: false;
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["default", "elevated", "filled", "outlined"];
          readonly description: "Surface treatment. Choose elevated for a raised panel, filled for a\ntinted group or outlined for a bordered surface. Use default to follow\nthe theme's existing card treatment.";
          readonly default: "default";
        };
      };
      readonly slots: {
        readonly "": "Body region for supporting text or arbitrary composed content.";
        readonly footer: "Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.";
        readonly header: "Title region. Supply one nonempty text heading at the surrounding document level for a clickable card.";
        readonly media: "Leading visual region for an image, video or illustration.";
      };
      readonly tag: "ki-card";
      readonly whenNotToUse: "as a form field, fieldset, page landmark, section replacement\nor nested card. Use a standalone button or link for a control without\nsupporting content.";
      readonly whenToUse: "group related media, a title, supporting text and actions into\none scannable surface. Set `href` for navigation or `interactive` for a\ndeclared action. Give a clickable card one text heading in the header\nslot and place secondary controls in the body or footer.";
    };
    readonly "ki-carousel": {
      readonly description: "An ordered, swipeable sequence with previous and next controls and position feedback.";
      readonly events: {
        readonly "ki-slide-change": "Reports the one-based index when the leading slide changes, also on\nautoplay or a new `current`: it can fire without a gesture.";
      };
      readonly props: {
        readonly autoplay: {
          readonly type: "number";
          readonly description: "Rotation interval in milliseconds. Omitting it leaves rotation off. Values\nbelow 5000 rotate every 5000 ms.";
          readonly minimum: 1;
          readonly maximum: 2147483647;
        };
        readonly "carousel-role-description": {
          readonly type: "string";
          readonly description: "Accessible role description of the region.";
          readonly default: "carousel";
        };
        readonly current: {
          readonly type: "number";
          readonly description: "One-based leading slide. Setting it moves the carousel and clamps the index to\nthe available leading positions.";
          readonly default: 1;
          readonly minimum: 1;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Required accessible name of the carousel region.";
          readonly required: true;
        };
        readonly layout: {
          readonly type: "enum";
          readonly values: readonly ["full-screen", "hero", "multi-browse", "single", "uncontained"];
          readonly description: "Item arrangement. Full-screen uses a vertical, full-viewport slide.";
          readonly default: "single";
        };
        readonly loop: {
          readonly type: "boolean";
          readonly description: "Whether navigating past one endpoint wraps to the other.";
          readonly default: false;
        };
        readonly navigation: {
          readonly type: "boolean";
          readonly description: "Whether to show the Previous and Next buttons. The viewport stays keyboard-operable.";
          readonly default: true;
        };
        readonly "next-label": {
          readonly type: "string";
          readonly description: "Accessible label of the Next button.";
          readonly default: "Next slide";
        };
        readonly pagination: {
          readonly type: "boolean";
          readonly description: "Whether to show the noninteractive slide position indicator.";
          readonly default: true;
        };
        readonly "pause-label": {
          readonly type: "string";
          readonly description: "Visible and accessible label of the Pause button.";
          readonly default: "Pause";
        };
        readonly "play-label": {
          readonly type: "string";
          readonly description: "Visible and accessible label of the Play button.";
          readonly default: "Play";
        };
        readonly "position-label": {
          readonly type: "string";
          readonly description: "Accessible label of the position indicator.";
          readonly default: "Slide position";
        };
        readonly "previous-label": {
          readonly type: "string";
          readonly description: "Accessible label of the Previous button.";
          readonly default: "Previous slide";
        };
        readonly "slide-label": {
          readonly type: "string";
          readonly description: "Spoken slide name and announcement. Use {index} and {count} as placeholders.";
          readonly default: "{index} of {count}";
        };
        readonly "slide-role-description": {
          readonly type: "string";
          readonly description: "Accessible role description of each slide group.";
          readonly default: "slide";
        };
        readonly "slides-per-move": {
          readonly type: "number";
          readonly description: "Number of positions advanced by Previous, Next and automatic rotation.";
          readonly default: 1;
          readonly minimum: 1;
        };
        readonly "slides-per-view": {
          readonly type: "number";
          readonly description: "Number of slides visible together in the single layout. Material 3 layouts\ndetermine their own item widths.";
          readonly default: 1;
          readonly minimum: 1;
        };
      };
      readonly slots: {
        readonly "": "Direct ki-carousel-item children in reading order.";
      };
      readonly tag: "ki-carousel";
      readonly whenNotToUse: "hide essential content behind rotation, replace ordinary page navigation,\nor present slides that readers need to compare side by side at the same time.";
      readonly whenToUse: "show a short set of related highlights, onboarding steps or media panels.\nGive the carousel a meaningful label and supply one ki-carousel-item per slide.";
    };
    readonly "ki-carousel-item": {
      readonly description: "A slide in an ordered ki-carousel sequence.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "The full slide content, including any links and controls.";
        readonly preview: "Decorative, noninteractive media shown when the item is a reduced preview.";
      };
      readonly tag: "ki-carousel-item";
      readonly whenNotToUse: "present a standalone card or a layout container outside a carousel.";
      readonly whenToUse: "supply a single slide to a ki-carousel. Put the full slide in the\ndefault slot and optional decorative preview media in the preview slot.";
    };
    readonly "ki-checkbox": {
      readonly description: "A form-associated checkbox for selecting independent options.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired once after a user toggle (pointer, slotted label or Space)\ncommits, composed across the shadow boundary; `checked` is already current\nwhen listeners run. `click()` from a script, or a page `<label>` for the\ncheckbox, toggles it like a native checkbox: one `input`, then one `change`. When to use: react to the committed selection. When NOT\nto use: do not expect it for programmatic `checked` writes, which are silent.";
      };
      readonly props: {
        readonly checked: {
          readonly type: "boolean";
          readonly description: "Live binary selection state. User activation by pointer, slotted label or\nSpace toggles it with native checkbox parity and emits composed `input`\nbefore composed `change`. Programmatic assignment is silent.\nWhen NOT to use: do not treat this reflected attribute as a native\n`defaultChecked`; reset uses the baseline captured at form association.";
          readonly default: false;
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted answer (\"This plan needs a signed contract\"). While it holds\ntext the checkbox is invalid, blocks its form, shows the text in place of\nthe help text at once and is announced as invalid. It stops counting when\nthe person toggles the checkbox, or when the form is reset, so it never\nblocks the corrected answer. It outranks `error-text` and an error set\nwith `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` checkbox left unchecked;\n`error-text` words that. Inside a `ki-checkbox-group`, set it on the\ngroup. Setting the same text again while the prop still holds it shows\nnothing: remove it first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents activation, removes the checkbox from keyboard reach, exposes the\nunavailable state, and excludes it from form data.\nWhen NOT to use: do not use disabled for validation errors or pending\nstate.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message shown in place of the help text once a `required` checkbox is\nleft unchecked, and its `validationMessage`. Say what checking it means\n(\"Accept the terms to continue\"). Without it the browser's own message\nshows, in the browser's language. An error set with `custom-error` or\n`setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the checkbox, read with it as its description:\nwhat checking it means or commits to.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`.";
        };
        readonly indeterminate: {
          readonly type: "boolean";
          readonly description: "Presentation-only mixed state. It renders the dash mark, is forwarded to\nthe internal native input for mixed assistive-technology exposure, and\nnever changes the submitted value. Any user toggle clears it and removes\nthe reflected attribute.\nWhen NOT to use: do not submit or persist `indeterminate` as a third\nvalue; model data remains binary through `checked`.";
          readonly default: false;
        };
        readonly "label-hint": {
          readonly type: "string";
          readonly description: "Short text shown after the slotted label and read with it as part of the\ncheckbox name, so people know before submitting whether they must check\nit: \"(required)\" on a consent the form cannot do without, \"(optional)\"\non one it can, in the page's own language. It changes no validation; set\n`required` for that, and keep the two consistent.\nWhen NOT to use: do not put what checking it commits to in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key contributed when the checkbox is checked.\nWhen NOT to use: omit when the checkbox should not submit a value.";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires the checkbox to be checked before form submission can proceed.\nThe invalid appearance appears after a blocked submission attempt or an\ninvalidating user toggle, never on initial render.\nWhen NOT to use: do not use required to express group-level rules; compose\nthose at the form/application layer.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm"];
          readonly description: "Token-backed size: the box is 18, 20 or 24px in onmars. `sm` also takes\nthe smaller label (13/20, 8px away); `md` and `lg` keep the 15px label.\nThe pointer target never drops under 24px. An unrecognized value matches\nno style rule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Form-data value paired with `name` when checked. If omitted, the submitted\nvalue is `on`, matching native checkbox behavior.\nWhen NOT to use: do not encode the unchecked state here; unchecked\ncheckboxes contribute no form entry.";
        };
      };
      readonly slots: {
        readonly "": "Visible label content. This is the accessible name source and a\nnative activation surface.";
      };
      readonly tag: "ki-checkbox";
      readonly whenNotToUse: "a single mutually exclusive choice, an immediate on/off\neffect, triggering an action, or unlabeled/icon-only usage.";
      readonly whenToUse: "selecting one or more independent options that a form submits\nlater, including a \"select all\" parent that presents partial selection with\n`indeterminate`. Always provide a visible label in the default slot.";
    };
    readonly "ki-checkbox-group": {
      readonly description: "A form-associated group of independently selectable checkboxes.";
      readonly events: {
        readonly "ki-change": "Fires once for a committed user toggle with a copy of the current selection.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted selection (\"Pick regions we deliver to\"). While it holds text\nthe group is invalid, blocks its form, shows the text in place of the\nhelp text at once and is announced as invalid. It stops counting when the\nperson toggles an option, or when the form is reset, so it never blocks\nthe corrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for the `min` and `max` limits the group\nenforces itself; `error-text` words those. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Makes the group unavailable and excludes it from form submission.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Localized message displayed for a failing selection limit.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of guidance displayed under the choices.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible legend and accessible name for these choices.\nWhen NOT to use: do not omit it unless the host's `aria-labelledby` names\nthe group from the page.\n\nNaming from the page: set `aria-labelledby` on the host to the ids of\nelements in the same document or shadow root, such as the heading that\nalready asks the question. The group then takes its name from them,\nfollowed by its own `label` when set. The ids are read when the group\nrenders and whenever the attribute changes.\nWhen to use: the question is written on the page above the options; omit\n`label` so the question is not shown, or read, twice.\nWhen NOT to use: do not reference elements inside another component's\nshadow root, which an id reference cannot reach.";
          readonly required: true;
        };
        readonly "label-hidden": {
          readonly type: "boolean";
          readonly description: "Hides the legend from view and from reading order while it stays the\ngroup's accessible name, so a screen reader announces it once, as the\ngroup's name.\nWhen to use: the layout already makes the question obvious to sighted\npeople but the group still needs a name of its own.\nWhen NOT to use: do not hide a legend that repeats a question already on\nthe page; point `aria-labelledby` at that question instead.";
          readonly default: false;
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Maximum number of checked options, as a nonnegative integer.";
        };
        readonly min: {
          readonly type: "number";
          readonly description: "Minimum number of checked options, as a nonnegative integer.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key repeated for each selected option.";
        };
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Lays choices out vertically or in a wrapping horizontal row.";
          readonly default: "vertical";
        };
      };
      readonly slots: {
        readonly "": "Direct `ki-checkbox` options, each with its own visible label and value.\nPut form naming and constraints on the group.";
      };
      readonly tag: "ki-checkbox-group";
      readonly whenNotToUse: "mutually exclusive choices (use `ki-radio-group`) or an\nimmediate on/off setting (use `ki-switch`). Provide a group label.";
      readonly whenToUse: "people may select several visible options that share a question,\nform field, and optional selection limits.";
    };
    readonly "ki-chip": {
      readonly description: "A compact filter toggle, removable picked value, or contextual action.";
      readonly events: {
        readonly "ki-activate": "Emitted by an assist chip when its native button is activated.";
        readonly "ki-change": "Emitted after a filter chip changes its pressed state.";
        readonly "ki-remove": "Remove request for an input chip. Cancel it to keep application ownership of the chip.";
      };
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents activation, removal and moving the chip.";
          readonly default: false;
        };
        readonly removable: {
          readonly type: "boolean";
          readonly description: "Gives an input chip a trailing remove button and keyboard deletion.";
          readonly default: false;
        };
        readonly "remove-label": {
          readonly type: "string";
          readonly description: "Localized action prefix in the remove button's accessible name, followed by the chip label.";
          readonly default: "Remove";
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "The pressed state of a filter chip. The user can toggle it in place.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Visual size of the pill, 24 CSS px for sm and 32 CSS px for md at standard text spacing.";
          readonly default: "md";
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["assist", "filter", "input"];
          readonly description: "Chip kind. Inherits the immediate chip group's type when omitted. Standalone chips default to filter.";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Value sent with removal, contextual activation and reorder events.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "The visible text label. Use text or non-interactive markup.";
        readonly start: "One decorative glyph or extra-extra-small avatar. A filter check\nreplaces it when selected. Do not slot controls.";
      };
      readonly tag: "ki-chip";
      readonly whenNotToUse: "static status (ki-badge), primary actions (ki-button), suggested\nprompts, or mutually exclusive choices (ki-radio-group).";
      readonly whenToUse: "apply independent filters, represent values selected in an entry\nfield, or offer a small contextual action alongside content.";
    };
    readonly "ki-chip-group": {
      readonly description: "A named collection of filter, input or assist chips, with optional ordering.";
      readonly events: {
        readonly "ki-reorder": "Emitted after moving a chip. Indices are zero-based positions in the visible chip collection.";
      };
      readonly props: {
        readonly "focus-target": {
          readonly type: "string";
          readonly description: "ID of the entry field in the same document or shadow root for focus after the last chip.";
          readonly format: "idref";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the group or list.";
          readonly default: "";
        };
        readonly "reorder-announcement": {
          readonly type: "string";
          readonly description: "Localized polite message using {label}, {position} and {total}. Position is one-based.";
          readonly default: "{label} moved to position {position} of {total}.";
        };
        readonly reorderable: {
          readonly type: "boolean";
          readonly description: "Enables dragging, pointer pick-and-place and Alt+Left/Right to move chips.";
          readonly default: false;
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["assist", "filter", "input"];
          readonly description: "Shared chip kind and collection semantics. Input chips are presented as a list.";
          readonly default: "filter";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-chip children in reading order.";
      };
      readonly tag: "ki-chip-group";
      readonly whenNotToUse: "choose exactly one option or submit a form value.";
      readonly whenToUse: "label related chips or let people change their reading order.";
    };
    readonly "ki-citation": {
      readonly description: "A numbered inline link from an answer to a source card.";
      readonly events: {};
      readonly props: {
        readonly "label-template": {
          readonly type: "string";
          readonly description: "Localized link name with `{number}` and `{title}` placeholders.";
          readonly default: "Source {number}: {title}";
        };
        readonly ref: {
          readonly type: "string";
          readonly description: "ID or source-id of the source. Use the `ref` attribute in HTML and\n`citationRef` in JSX so framework refs remain available.";
          readonly required: true;
        };
      };
      readonly slots: {};
      readonly tag: "ki-citation";
      readonly whenNotToUse: "To cite a source outside this tree or replace a standalone\nlink. Use `ki-link` for direct navigation.";
      readonly whenToUse: "Next to a claim supported by a `ki-source` in the same document\nor shadow root. Repeat the same reference for subsequent mentions.";
    };
    readonly "ki-code-block": {
      readonly description: "Presents source code with a named header, syntax colors, line controls and\nclipboard feedback.";
      readonly events: {
        readonly "ki-copy": "Emitted after a successful clipboard write. Detail is `{ value: string }` with the exact copied source.";
      };
      readonly props: {
        readonly "copied-label": {
          readonly type: "string";
          readonly description: "Polite announcement after a successful clipboard write.";
          readonly default: "Copied";
        };
        readonly "copy-error-label": {
          readonly type: "string";
          readonly description: "Polite announcement after a failed clipboard write.";
          readonly default: "Couldn't copy";
        };
        readonly "copy-label": {
          readonly type: "string";
          readonly description: "Accessible name of the copy button.";
          readonly default: "Copy code";
        };
        readonly copyable: {
          readonly type: "boolean";
          readonly description: "Show the copy control. Set `copyable=\"false\"` in HTML to hide it.";
          readonly default: true;
        };
        readonly filename: {
          readonly type: "string";
          readonly description: "File name shown in the header beside the language.";
        };
        readonly highlight: {
          readonly type: "string";
          readonly description: "Comma-separated lines or inclusive ranges, for example `\"3,5-7\"`.";
        };
        readonly "highlight-label": {
          readonly type: "string";
          readonly description: "Localizable prefix for the accessible description of highlighted lines.";
          readonly default: "Highlighted lines";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Figure and scroll area label when there is no language or filename.";
          readonly default: "Code";
        };
        readonly language: {
          readonly type: "string";
          readonly description: "Visible language label and syntax grammar. Supports JavaScript, TypeScript, JSON and Gherkin (English and Spanish).";
        };
        readonly "line-numbers": {
          readonly type: "boolean";
          readonly description: "Show decorative one-based line numbers.";
          readonly default: false;
        };
        readonly wrap: {
          readonly type: "boolean";
          readonly description: "Soft-wrap long lines within the available width.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Literal source text. Escape markup in HTML or supply a text node.";
      };
      readonly tag: "ki-code-block";
      readonly whenNotToUse: "when the reader should edit the source or when the code belongs\ninline in a sentence. Use an editor or a native inline code element.";
      readonly whenToUse: "display a multiline example, generated code or a tool result that\nreaders should be able to inspect and copy.";
    };
    readonly "ki-code-input": {
      readonly description: "A form-associated verification field with one native text input and a visual box per character.";
      readonly events: {
        readonly "ki-complete": "Emitted after the input event when the edited code fills all the cells.";
        readonly "ki-input": "Emitted when a user edit changes the code.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted code (\"This code has expired\"). While it holds text the field\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit of the code, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for an incomplete code, which the field\nreports itself; `error-text` words that. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disable editing, sequential focus and form participation.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message for a failing code constraint. Omit to use the browser's message. A `custom-error` outranks it.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Instructions saying where the code was sent and how long it is valid.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible accessible name. Supply a label in the language of the form.";
          readonly required: true;
        };
        readonly length: {
          readonly type: "number";
          readonly description: "Number of cells and maximum code length. Unsupported lengths fall back to six.";
          readonly default: 6;
          readonly minimum: 4;
          readonly maximum: 8;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Key for the single value submitted to the enclosing form.";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Require a complete code before submitting. An optional field may be empty.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Medium or small cells. The form region's density adjusts both sizes.";
          readonly default: "md";
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["alphanumeric", "numeric"];
          readonly description: "Allowed characters and keyboard hint. Alphanumeric mode preserves ASCII letter case.";
          readonly default: "numeric";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "The current code, including leading zeros. Use the attribute to declare\nthe reset value. Programmatic assignments are normalized and silent.";
          readonly default: "";
        };
      };
      readonly slots: {};
      readonly tag: "ki-code-input";
      readonly whenNotToUse: "Use ki-input for passwords, long codes or free text.";
      readonly whenToUse: "Collect a one-time code of four to eight characters for sign-in or verification.";
    };
    readonly "ki-combobox": {
      readonly description: "An editable, form-associated combobox with local or remote filtering,\nsingle or multiple selection, and optional free entry.";
      readonly activationEvent: "change";
      readonly events: {
        readonly change: "Composed event after a user changes the committed selection.\nRead the committed value from the host.";
        readonly "ki-input": "Reports a raw text edit in `detail.value`. Listen to it to request remote results.";
      };
      readonly props: {
        readonly "add-label": {
          readonly type: "string";
          readonly description: "Localizable free-entry offer. {text} is replaced by the trimmed query.";
          readonly default: "Add “{text}”";
        };
        readonly "allow-custom": {
          readonly type: "boolean";
          readonly description: "Offers to add trimmed query text when no known or selected choice already matches it.";
          readonly default: false;
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"Ana is on leave this week\"). While it holds text the\nfield is invalid, blocks its form, shows the text in place of the help\ntext at once and is announced as invalid. It stops counting when the\nperson commits another selection (choosing, removing or clearing a\nchoice; typing filter text is not a change), or when the form is reset,\nso it never blocks the corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` field left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables editing, navigation and form submission.";
          readonly default: false;
        };
        readonly "empty-label": {
          readonly type: "string";
          readonly description: "Localizable status when there are no choices to display.";
          readonly default: "No results";
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message used when a required selection is missing, in place of the browser's message. A `custom-error` outranks it.";
        };
        readonly filter: {
          readonly type: "enum";
          readonly values: readonly ["contains", "none", "starts-with"];
          readonly description: "Filters by label. Set to none when the application provides results from a remote search.";
          readonly default: "contains";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Guidance shown below the field and read as its description.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label and accessible name. Supply it even when placeholder text is also set.";
          readonly required: true;
        };
        readonly loading: {
          readonly type: "boolean";
          readonly description: "Replaces visible options with a loading indicator while a search is pending.";
          readonly default: false;
        };
        readonly "loading-label": {
          readonly type: "string";
          readonly description: "Localizable status while waiting for a result set.";
          readonly default: "Loading results";
        };
        readonly multiple: {
          readonly type: "boolean";
          readonly description: "Enables ordered multiple selection and renders selected values as tags.";
          readonly default: false;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key. Multiple choices contribute one entry each under this name.";
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Hint shown in the text input when it is empty.";
          readonly default: "";
        };
        readonly "remove-label": {
          readonly type: "string";
          readonly description: "Localizable removal button label. {label} is replaced by the selected label.";
          readonly default: "Remove {label}";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires a committed choice to submit the form.";
          readonly default: false;
        };
        readonly "result-count-label": {
          readonly type: "string";
          readonly description: "Localizable status for several choices. {count} is replaced by the result count.";
          readonly default: "{count} results";
        };
        readonly "result-one-label": {
          readonly type: "string";
          readonly description: "Localizable status for one available choice.";
          readonly default: "1 result";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Committed value. Use a string for single selection and an array of strings\nfor multiple selection. In HTML and catalog specs, encode multiple values\nas a JSON array string in the value attribute, or supply one literal value.\nAssign a new array to change multiple selections programmatically.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "Declarative ki-option children. Supply unique values and a human-readable label.";
      };
      readonly tag: "ki-combobox";
      readonly whenNotToUse: "use a select-only control for a short closed set or a plain\ntext field for unrestricted input with no choices.";
      readonly whenToUse: "choose from a long list of options, let people search an option\nsource, or allow multiple selections that remain visible as tags.";
    };
    readonly "ki-confirmation": {
      readonly description: "An inline prompt for a decision about a proposed assistant action.";
      readonly events: {
        readonly "ki-approve": "Explicit approval, with the conversation preference at the time of the decision.";
        readonly "ki-deny": "Explicit refusal of the pending request.";
      };
      readonly props: {
        readonly action: {
          readonly type: "string";
          readonly description: "Tool identifier shown to the person and available for reporting by the host.";
          readonly required: true;
          readonly format: "text";
        };
        readonly "approve-label": {
          readonly type: "string";
          readonly description: "Verb or short phrase that describes what approval does, such as \"Send email\".";
          readonly required: true;
        };
        readonly "approved-label": {
          readonly type: "string";
          readonly description: "Localized outcome text when the host marks the request approved.";
          readonly default: "Approved";
        };
        readonly consequence: {
          readonly type: "string";
          readonly description: "Cost or irreversible effect to read before deciding, displayed as a warning note.";
        };
        readonly "denied-label": {
          readonly type: "string";
          readonly description: "Localized outcome text when the host marks the request denied.";
          readonly default: "Denied";
        };
        readonly "deny-label": {
          readonly type: "string";
          readonly description: "Verb or short phrase for refusal, such as \"Keep draft\".";
          readonly required: true;
        };
        readonly "expired-label": {
          readonly type: "string";
          readonly description: "Localized outcome text when the host marks the request expired.";
          readonly default: "Expired";
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Question naming the proposed action. Provide it before asking for a decision.";
          readonly required: true;
        };
        readonly remember: {
          readonly type: "boolean";
          readonly description: "Offers an unchecked preference limited to this action in the current conversation.";
          readonly default: false;
        };
        readonly "remember-label": {
          readonly type: "string";
          readonly description: "Localized conversation permission label. Name the specific permission when possible.";
          readonly default: "Allow this action for the rest of this conversation";
        };
        readonly "resolved-at": {
          readonly type: "string";
          readonly description: "Display-ready, localized resolution time from the host, if known.";
        };
        readonly "resolved-by": {
          readonly type: "string";
          readonly description: "Display-ready name of the person or service that resolved the request, if known.";
        };
        readonly state: {
          readonly type: "enum";
          readonly values: readonly ["approved", "denied", "expired", "pending"];
          readonly description: "Host-controlled outcome. Resolve after recording a decision or expiring the request.";
          readonly default: "pending";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral"];
          readonly description: "Use danger when approval is destructive. Unknown values use neutral.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Details the person needs to make the decision. Use readable text or\nsemantic markup such as a description list.";
      };
      readonly tag: "ki-confirmation";
      readonly whenNotToUse: "Report a completed action without a preceding request, or\nblock the rest of the interface with a modal decision (use ki-dialog).\nThe displayed action identifier is text and carries no execution authority.";
      readonly whenToUse: "Show the exact action and the details a person needs before\ngranting permission. A trusted host maps the two decision events to its\ndeclared actions and records the outcome in state.";
    };
    readonly "ki-conversation": {
      readonly description: "An accessible chat transcript with optional following as messages arrive.";
      readonly events: {};
      readonly props: {
        readonly "jump-label": {
          readonly type: "string";
          readonly description: "Visible and accessible label for the control that resumes following.";
          readonly default: "Jump to latest";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the transcript. Supply a distinct label when several logs share a page.";
          readonly default: "Conversation";
        };
        readonly "stick-to-bottom": {
          readonly type: "boolean";
          readonly description: "Follow new or growing messages until the reader scrolls away from the end.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "The chronological transcript, normally ki-message elements.";
      };
      readonly tag: "ki-conversation";
      readonly whenNotToUse: "Collect input, send messages or present a static sequence of\ncards. Place the composer outside the transcript.";
      readonly whenToUse: "Display chronological user, assistant and event messages. Give\nthe host a block-size constraint to keep scrolling within the transcript.";
    };
    readonly "ki-copy-button": {
      readonly description: "Copies text to the clipboard and confirms the result in the same button.";
      readonly events: {
        readonly "ki-copy": "Fired after a successful clipboard write. The detail carries the exact text copied.";
      };
      readonly props: {
        readonly "copied-label": {
          readonly type: "string";
          readonly description: "Polite announcement after a successful write. Override for localized interfaces.";
          readonly default: "Copied";
        };
        readonly "copy-error-label": {
          readonly type: "string";
          readonly description: "Polite announcement after a failed write or missing source. Override for localized interfaces.";
          readonly default: "Couldn't copy";
        };
        readonly "feedback-duration": {
          readonly type: "number";
          readonly description: "Milliseconds to show feedback after a write settles. Zero keeps the\noutcome visible until the next result. Invalid values use 1500 ms.";
          readonly default: 1500;
          readonly minimum: 0;
        };
        readonly from: {
          readonly type: "string";
          readonly description: "ID of a source in this button's document or shadow root. A nonempty ID\ntakes precedence over `value`. The source's current string value or\nits text content is read on activation.";
          readonly format: "idref";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the icon-only control. Visible slot text supplies the name when present.";
          readonly default: "Copy";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed button size. Match the size of adjacent controls.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Exact clipboard text, including whitespace. Supply it when the text is known directly.";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["ghost", "outline", "primary", "quaternary", "secondary"];
          readonly description: "Button emphasis. Use ghost for compact actions and secondary for a visible supporting action.";
          readonly default: "ghost";
        };
      };
      readonly slots: {
        readonly "": "Optional visible text, which supplies the accessible name and\nplaces the icon at the inline start. Use plain text or non-interactive markup.";
      };
      readonly tag: "ki-copy-button";
      readonly whenNotToUse: "submit a form, navigate, or trigger an action with no clipboard\nwrite. Use a button or link for those actions.";
      readonly whenToUse: "let a person copy a link, identifier, token or code sample. Supply\na direct value or point to a source in the same document or shadow root.";
    };
    readonly "ki-counter": {
      readonly description: "A decorative count or dot over a trigger or avatar.";
      readonly events: {};
      readonly props: {
        readonly dot: {
          readonly type: "boolean";
          readonly description: "Show a dot independently of the count, including when the value is zero.";
          readonly default: false;
        };
        readonly for: {
          readonly type: "string";
          readonly description: "Literal ID of a trigger in the same document or shadow root. Places the\nindicator at its block-start inline-end corner and hides it while the\ntrigger is unavailable. For a named host slot, omit this property.";
          readonly format: "idref";
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Largest count displayed in full. Higher values display the cap with a\nplus sign. Fractional caps round down; invalid caps use 99.";
          readonly default: 99;
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral", "primary", "success"];
          readonly description: "Semantic palette of the pill or dot. An unknown tone uses danger.";
          readonly default: "danger";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Count of unread or pending items. Finite values are rounded down.\nValues below one and non-finite values hide the count.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-counter";
      readonly whenNotToUse: "for an object's status (use ki-badge), a count inside a list\nrow (use text or ki-badge), or an announcement that needs its own semantics.";
      readonly whenToUse: "mark unread or pending items on a trigger, or presence on an\navatar. Supply the full meaning in the host's accessible name and use a\npage-owned polite live region for important updates.";
    };
    readonly "ki-date-picker": {
      readonly description: "A locale-aware date field with an anchored keyboard-operable calendar.";
      readonly events: {
        readonly "ki-change": "Reports a changed, committed value in canonical ISO form. Use this for calendar and typed changes.";
      };
      readonly props: {
        readonly "apply-label": {
          readonly type: "string";
          readonly description: "Localized label of the confirmation button that saves a complete draft.";
          readonly default: "Apply";
        };
        readonly "cancel-label": {
          readonly type: "string";
          readonly description: "Localized label of the confirmation button that discards a draft.";
          readonly default: "Cancel";
        };
        readonly "change-label": {
          readonly type: "string";
          readonly description: "Localized name of the trigger when a date is saved. Use {date} for the current selection.";
          readonly default: "Change date, {date}";
        };
        readonly "choose-label": {
          readonly type: "string";
          readonly description: "Localized name of the calendar dialog and of the trigger when no date is saved.";
          readonly default: "Choose date";
        };
        readonly confirm: {
          readonly type: "boolean";
          readonly description: "Require Apply before saving picks made in the calendar.";
          readonly default: false;
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted date (\"No flights on that day\"). While it holds text the field\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit of the text or pick of another date, or when the form is reset, so\nit never blocks the corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a missing, unreadable or out-of-bounds\ndate, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables the text entry and calendar button and excludes the field from form data.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Overrides the message shown when a date is missing, invalid or outside the bounds. A `custom-error` outranks it.";
        };
        readonly "first-day-of-week": {
          readonly type: "number";
          readonly description: "First weekday, where Sunday is 0 and Saturday is 6. Defaults to the locale's week start.";
          readonly minimum: 0;
          readonly maximum: 6;
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "A format hint or explanation read with the field. It is replaced by a visible error.";
        };
        readonly "invalid-date-label": {
          readonly type: "string";
          readonly description: "Localized fallback message for an impossible, incomplete or out-of-bounds date.";
          readonly default: "Enter a valid date within the allowed range.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible text and accessible name of the date field. Provide a label for every field.";
          readonly required: true;
        };
        readonly locale: {
          readonly type: "string";
          readonly description: "BCP 47 language tag for localized dates and weekday order. Defaults to the page language.";
        };
        readonly max: {
          readonly type: "string";
          readonly description: "Latest selectable date, inclusive. Use YYYY-MM-DD.";
        };
        readonly min: {
          readonly type: "string";
          readonly description: "Earliest selectable date, inclusive. Use YYYY-MM-DD.";
        };
        readonly mode: {
          readonly type: "enum";
          readonly values: readonly ["range", "single"];
          readonly description: "Select one date or a range with a start and an end date.";
          readonly default: "single";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key. A range is submitted as a single value.";
        };
        readonly "next-month-label": {
          readonly type: "string";
          readonly description: "Localized accessible name of the next-month button.";
          readonly default: "Next month";
        };
        readonly "previous-month-label": {
          readonly type: "string";
          readonly description: "Localized accessible name of the previous-month button.";
          readonly default: "Previous month";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires a complete date or pair of dates for native form submission.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Current ISO date, ISO start/end pair or empty string. The value attribute is the reset default.";
          readonly default: "";
        };
      };
      readonly slots: {};
      readonly tag: "ki-date-picker";
      readonly whenNotToUse: "Enter a known distant date, such as a birth date, or choose a time.";
      readonly whenToUse: "Choose a nearby date or date range when the weekday matters, such as\na booking, a deadline or a schedule.";
    };
    readonly "ki-details": {
      readonly description: "A native disclosure for supporting information that can stay collapsed.";
      readonly events: {
        readonly "ki-toggle": "Emitted when the native disclosure toggles or an exclusive peer closes it.";
      };
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables summary activation. The page can still set open.";
          readonly default: false;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Nonempty name for exclusive disclosures in the same document or shadow root.";
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the panel is open. Native changes reflect back to this property.";
          readonly default: false;
        };
        readonly summary: {
          readonly type: "string";
          readonly description: "Plain label for the control. Supply the summary slot for a rich label.";
        };
      };
      readonly slots: {
        readonly "": "Content shown when the disclosure is open.";
        readonly summary: "Rich summary text or an authored heading, replacing the summary prop.";
      };
      readonly tag: "ki-details";
      readonly whenNotToUse: "hide the primary action or information needed to complete a task.\nFor script-free HTML, author native details and summary directly.";
      readonly whenToUse: "reveal a short explanation, FAQ answer, settings section or tool\noutput on demand. Use ki-accordion for related disclosures.";
    };
    readonly "ki-dialog": {
      readonly description: "A modal dialog for an interrupting decision or a focused task.";
      readonly events: {
        readonly "ki-close": "Call `preventDefault()` to veto fullscreen Escape or the header close\nbutton, which report `escape` and `method` respectively. On every other\npath (centered Escape, backdrop, invoker commands, `close()` or clearing\n`open`) the event reports after close and focus restoration. A veto has\nno effect there, and the event can fire without a gesture.";
        readonly "ki-confirm": "The user activated the confirmation button. Handle validation, submission\nand dismissal in the application.";
      };
      readonly props: {
        readonly "close-label": {
          readonly type: "string";
          readonly description: "Accessible name for the fullscreen close button. Localize it or describe\nthe effect of dismissing, for example \"Discard and close\".";
          readonly default: "Close";
        };
        readonly "close-on-backdrop": {
          readonly type: "boolean";
          readonly description: "Opts into backdrop light-dismiss. Omit this attribute for critical\nconfirmations.\nWhen to use: low-risk dialogs where an outside click may safely dismiss.\nWhen NOT to use: destructive confirmations or decisions that should not be\nlost to a stray click; omit the attribute entirely rather than setting it\nto `\"false\"`.";
          readonly default: false;
        };
        readonly "confirm-label": {
          readonly type: "string";
          readonly description: "Label for the optional confirmation button. Use an action verb such as\n\"Save\". The button is in the fullscreen header or the centered footer.";
        };
        readonly fullscreen: {
          readonly type: "enum";
          readonly values: readonly ["always", "compact", "never"];
          readonly description: "Layout for the native modal. Use `compact` to fill windows narrower than\n600 CSS pixels, or `always` to fill any window. Use `never` for a centered\ndialog at every width.";
          readonly default: "never";
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Visible dialog title and accessible-name source. Always provide a heading;\nan empty value intentionally leaves the native dialog unnamed.\nWhen to use: name the interrupting decision, for example \"Delete\naccount?\". When NOT to use: do not omit it for production dialogs; APG\nmodal dialogs require an accessible name.";
          readonly required: true;
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Reflected live modal state. Add it or call `show()` to open; remove it or\ncall `close()` to close. When open, the native dialog enters the top layer\nand the page behind is inert.\nWhen to use: bind application state to the dialog's modal lifecycle.\nWhen NOT to use: do not set the internal native `<dialog open>` attribute;\nthe host attribute is the only public source of truth.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Dialog body content.";
        readonly footer: "Dialog actions. Dismiss using an invoker command or `close()`.";
      };
      readonly tag: "ki-dialog";
      readonly whenNotToUse: "non-blocking feedback (`ki-alert`, `ki-toast`),\nsupplementary hints (`ki-tooltip`), multi-step flows that need their own\npage, menus, or pickers.";
      readonly whenToUse: "destructive confirmations, blocking choices, and brief\ncritical input that must be resolved before returning to the page. Always\nprovide a `heading`, place actions in the `footer` slot, wire each\ndismissal to `close()` or a close command, and in destructive confirmations put `autofocus` on\nthe least destructive action. Use `fullscreen=\"compact\"` for longer tasks\nthat need the whole window on compact screens.";
    };
    readonly "ki-divider": {
      readonly description: "A static, decorative rule that visually separates adjacent content.";
      readonly events: {};
      readonly props: {
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Layout axis of the rule: `horizontal` spans the available inline size\nbetween stacked content; `vertical` stretches to the cross size its\nlayout context provides, between side-by-side content. A structural\naxis, never appearance — thickness, color, end caps and gutter are\nper-theme `--ki-divider-*` tokens. An unrecognized value matches no\nstyle selector, so the divider keeps the default horizontal rendering\n(fallback by CSS construction — no validation code).";
          readonly default: "horizontal";
        };
      };
      readonly slots: {};
      readonly tag: "ki-divider";
      readonly whenNotToUse: "between list items (separation is a ki-list theme-token\ndecision), semantic thematic breaks in running prose (native `<hr>`\ncarries those semantics — the divider is deliberately decorative and\ncontributes no role, name or announcement), as a border or outline\nsubstitute (surface/border tokens), or purely decorative flourishes\n(prefer white space).";
      readonly whenToUse: "visually separate adjacent content when spacing alone is not\nenough: grouped settings sections, toolbar action groups, distinct\nregions inside a card — horizontal between stacked content, vertical\nbetween side-by-side content.";
    };
    readonly "ki-drawer": {
      readonly description: "An edge-aligned sheet for a focused task that keeps the current page in context.";
      readonly events: {
        readonly "ki-close": "Requests dismissal before the drawer closes, also on `close()` or a cleared `open`: it\ncan fire without a gesture. Call preventDefault() to keep it open, for example when\nedits are unsaved. The event carries the reason in detail.reason.";
      };
      readonly props: {
        readonly "close-label": {
          readonly type: "string";
          readonly description: "Accessible name for the built-in Close button. Translate this for localized interfaces.";
          readonly default: "Close";
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Title and accessible name. Provide a heading whenever the drawer opens.";
          readonly required: true;
        };
        readonly modal: {
          readonly type: "boolean";
          readonly description: "Makes the page behind the sheet inert. Set modal=\"false\" for continued page interaction.";
          readonly default: true;
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Reflected live state. Setting it to false requests dismissal and may be vetoed.";
          readonly default: false;
        };
        readonly placement: {
          readonly type: "enum";
          readonly values: readonly ["bottom", "end", "start"];
          readonly description: "Logical edge. Use bottom for an action sheet with a swipe handle. Unknown values use end.";
          readonly default: "end";
        };
        readonly size: {
          readonly type: "string";
          readonly description: "Optional CSS length. Overrides the 18rem themed width or bottom height cap.";
        };
      };
      readonly slots: {
        readonly "": "The drawer's content, such as fields or a short list of actions.";
        readonly footer: "Optional actions such as Save. Wire these in the application.";
        readonly "header-actions": "Optional actions between the heading and Close button.";
      };
      readonly tag: "ki-drawer";
      readonly whenNotToUse: "Menus, hover hints, permanent navigation, or work that needs a\nfull page. For a short interrupting decision in the center, use ki-dialog.";
      readonly whenToUse: "Edit an item beside its list or offer a short set of actions in a\nbottom sheet. Supply a heading and wire slotted actions in the application.\nUse non-modal mode if people need to interact with the page while editing.";
    };
    readonly "ki-empty-state": {
      readonly description: "A short explanation and next step for an empty view.";
      readonly events: {};
      readonly props: {
        readonly announce: {
          readonly type: "boolean";
          readonly description: "Put the heading and description in a polite status, with actions outside\nthe region. Set before mounting a message that reports changed results.";
          readonly default: false;
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Localized heading that identifies the empty view. Blank text omits the heading.";
          readonly required: true;
        };
        readonly "heading-level": {
          readonly type: "number";
          readonly description: "Native heading level for the surrounding document outline. Only integers\nfrom 2 through 6 are valid; unsupported values use level 3.";
          readonly default: 3;
          readonly minimum: 2;
          readonly maximum: 6;
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Optional decorative Lucide glyph. Register it with a per-icon import before\nmounting. A supplied illustration takes precedence.";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Use small inside a table or narrow panel. Unrecognized sizes use the medium layout.";
          readonly default: "md";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "primary", "primary-light", "success", "warning"];
          readonly description: "FeatureIcon tone. Unrecognized tones use the neutral tile.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Localized supporting text with a reason or recovery advice.";
        readonly actions: "Optional controls for the next step, with at most one\nprimary action. In a guarded surface, bind actions to these controls.";
        readonly media: "Optional decorative illustration in place of the icon. Use\nan image with empty alt text or a decorative SVG. Keep this slot free of controls.";
      };
      readonly tag: "ki-empty-state";
      readonly whenNotToUse: "signal that results are loading or draw attention to an error\nthat needs acknowledgement. Use ki-spinner or ki-alert for those states.";
      readonly whenToUse: "explain an empty list, table, search result, or first-run view.\nSupply a localized heading that names what is empty and a short next step.\nUse announce for results that change after an interaction.";
    };
    readonly "ki-fab": {
      readonly description: "The primary action of a screen, as an icon or an extended control with a visible label.";
      readonly events: {
        readonly click: "Native activation click. The page or guarded renderer handles the declared action.";
      };
      readonly props: {
        readonly "collapse-on-scroll": {
          readonly type: "boolean";
          readonly description: "Compact an extended FAB on viewport scroll down and restore on scroll up.";
          readonly default: false;
        };
        readonly extended: {
          readonly type: "boolean";
          readonly description: "Show the action label next to its icon.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "A nonempty destination renders an anchor. Relative URLs and fragments retain native resolution.";
          readonly format: "url";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Registered Lucide name. Import the icon module before rendering. The icon slot takes precedence.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the action. Also the visible text in the extended state.";
          readonly required: true;
        };
        readonly position: {
          readonly type: "enum";
          readonly values: readonly ["fixed", "static"];
          readonly description: "Fixed sits at the viewport's block-end inline-end corner. Reserve page clearance there.";
          readonly default: "static";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "xl"];
          readonly description: "Square footprint when icon-only, and minimum size when extended.";
          readonly default: "md";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["primary", "secondary", "surface"];
          readonly description: "Surface and ink: strong primary, tinted secondary or raised surface.";
          readonly default: "secondary";
        };
      };
      readonly slots: {
        readonly icon: "Decorative, noninteractive icon replacing the named glyph.";
      };
      readonly tag: "ki-fab";
      readonly whenNotToUse: "for secondary or destructive actions, for multiple actions on the same screen, or on a desktop screen that already has a visible primary ki-button.";
      readonly whenToUse: "give a mobile screen one primary action, such as composing a draft or creating a project. Supply a descriptive label and a registered icon or decorative icon slot. Reserve page clearance for fixed placement, and leave the action binding unset for native link navigation.";
    };
    readonly "ki-fab-menu": {
      readonly description: "An icon FAB that opens two to six related actions above its trigger.";
      readonly events: {
        readonly "ki-select": "Emits the selected item's value or its trimmed label. Native links retain their destination.";
      };
      readonly props: {
        readonly "close-label": {
          readonly type: "string";
          readonly description: "Localized accessible name of the trigger when it becomes the close control.";
          readonly default: "Close menu";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Registered Lucide glyph for the closed trigger. The plus glyph ships with the component.";
          readonly default: "plus";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the closed trigger and of the menu.";
          readonly required: true;
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the action stack is open. Reflected when the user opens or dismisses it.";
          readonly default: false;
        };
        readonly position: {
          readonly type: "enum";
          readonly values: readonly ["fixed", "static"];
          readonly description: "Static anchors to the host. Fixed anchors to the viewport's block-end inline-end corner.";
          readonly default: "static";
        };
        readonly scrim: {
          readonly type: "boolean";
          readonly description: "Dim the viewport and dismiss on a scrim click. Use the boolean property or scrim=\"false\" to opt out.";
          readonly default: true;
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["primary", "secondary", "surface"];
          readonly description: "Closed FAB surface. The open trigger always uses primary.";
          readonly default: "secondary";
        };
      };
      readonly slots: {
        readonly "": "Two to six direct ki-fab-menu-item children, in top-to-bottom order.";
      };
      readonly tag: "ki-fab-menu";
      readonly whenNotToUse: "for a single primary action, long lists, or site navigation.";
      readonly whenToUse: "group related creation or screen actions behind one floating button.";
    };
    readonly "ki-fab-menu-item": {
      readonly description: "A labeled command or native link within a floating action menu.";
      readonly events: {
        readonly "ki-select": "Local command selection for a direct action binding. Links use native navigation.";
      };
      readonly props: {
        readonly href: {
          readonly type: "string";
          readonly description: "A nonempty destination renders a native link and preserves relative URL resolution.";
          readonly format: "url";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Registered Lucide glyph. Import the desired icon before rendering.";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Stable selection identifier. When omitted, the menu reports the trimmed visible label.";
        };
      };
      readonly slots: {
        readonly "": "The visible action label.";
      };
      readonly tag: "ki-fab-menu-item";
      readonly whenNotToUse: "for a standalone action, a form control, or a container of interactive content.";
      readonly whenToUse: "as a direct child of ki-fab-menu, with a short, visible action label.";
    };
    readonly "ki-feature-icon": {
      readonly description: "A decorative glyph centered on a tinted tile.";
      readonly events: {};
      readonly props: {
        readonly shape: {
          readonly type: "enum";
          readonly values: readonly ["circle", "square"];
          readonly description: "Rounded square or circle. Unknown values use square.";
          readonly default: "square";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Tile size. At a 16px root, the steps are 24, 32, 40, 48 and 64px. Unknown values use md.";
          readonly default: "md";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "primary", "primary-light", "success", "warning"];
          readonly description: "Colour pair for the tile and its glyph. Unknown values use neutral.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "One Lucide glyph. Supply an inline SVG using currentColor or a ki-icon with inherited size. Guarded surfaces use a registered ki-icon.";
      };
      readonly tag: "ki-feature-icon";
      readonly whenNotToUse: "For an action (use ki-icon-button), a status (use ki-badge),\nor the sole label of a section.";
      readonly whenToUse: "Place a decorative icon beside the visible heading of a feature,\nempty state or settings section. The heading carries the meaning.";
    };
    readonly "ki-file-upload": {
      readonly description: "A form-associated picker and drop zone with local selection validation and a\nlist of file upload outcomes.";
      readonly events: {
        readonly "ki-file-cancel": "Requests that the application cancel the identified upload.";
        readonly "ki-file-remove": "Reports a row removed by the user, after updating the file list.";
        readonly "ki-files-add": "Reports the accepted rows in one picker or drop batch, each with its original File.";
      };
      readonly props: {
        readonly accept: {
          readonly type: "string";
          readonly description: "Comma-separated extensions, MIME types and MIME wildcards allowed in new selections.";
        };
        readonly "browse-label": {
          readonly type: "string";
          readonly description: "Visible text of the native file picker button.";
          readonly default: "Browse files";
        };
        readonly "cancel-label": {
          readonly type: "string";
          readonly description: "Accessible name template for cancellation. Use {file} for the displayed filename.";
          readonly default: "Cancel upload of {file}";
        };
        readonly "count-error": {
          readonly type: "string";
          readonly description: "Rejection text for a file beyond selection capacity.";
          readonly default: "Too many files.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables the picker and file actions and excludes the field from submission.";
          readonly default: false;
        };
        readonly "done-label": {
          readonly type: "string";
          readonly description: "Status text for a completed upload.";
          readonly default: "Uploaded";
        };
        readonly "drop-label": {
          readonly type: "string";
          readonly description: "Drop instruction shown just before the Browse button.";
          readonly default: "Drop files here or";
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Application validation error. Clear it to allow form submission again.";
        };
        readonly "failed-label": {
          readonly type: "string";
          readonly description: "Fallback status text for a failed upload without a supplied error.";
          readonly default: "Upload failed.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Guidance for file formats, limits or the purpose of this field.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label and accessible name of the upload group.";
          readonly default: "Upload files";
        };
        readonly "list-label": {
          readonly type: "string";
          readonly description: "Accessible name of the list of files.";
          readonly default: "Files";
        };
        readonly "max-files": {
          readonly type: "number";
          readonly description: "Maximum accepted local files as a nonnegative integer. Single-file mode also caps this at one.";
        };
        readonly "max-size": {
          readonly type: "string";
          readonly description: "Maximum size per selected file in bytes or decimal B, KB, MB or GB, such as \"10MB\".";
        };
        readonly multiple: {
          readonly type: "boolean";
          readonly description: "Allows a selection of more than one file.";
          readonly default: false;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key repeated for each accepted original file.";
        };
        readonly "queued-label": {
          readonly type: "string";
          readonly description: "Status text for an accepted file waiting to upload.";
          readonly default: "Queued";
        };
        readonly "remove-label": {
          readonly type: "string";
          readonly description: "Accessible name template for removal. Use {file} for the displayed filename.";
          readonly default: "Remove {file}";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires at least one original accepted file to submit the form.";
          readonly default: false;
        };
        readonly "required-label": {
          readonly type: "string";
          readonly description: "Visible annotation for a required file field.";
          readonly default: "Required";
        };
        readonly "required-message": {
          readonly type: "string";
          readonly description: "Validation message when the form requires a file and none is selected.";
          readonly default: "Select a file.";
        };
        readonly "size-error": {
          readonly type: "string";
          readonly description: "Rejection text for a file larger than max-size.";
          readonly default: "This file is too large.";
        };
        readonly "type-error": {
          readonly type: "string";
          readonly description: "Rejection text for a file that does not match accept.";
          readonly default: "This file type is not allowed.";
        };
        readonly "uploading-label": {
          readonly type: "string";
          readonly description: "Progress indicator name template. Use {file} for the displayed filename.";
          readonly default: "Uploading {file}";
        };
      };
      readonly slots: {
        readonly help: "Plain-language guidance for the picker, in place of help-text.";
      };
      readonly tag: "ki-file-upload";
      readonly whenNotToUse: "transfer files without an application handler, collect a URL,\nor use client-side type and size checks as upload authorization.";
      readonly whenToUse: "collect local attachments, media or imports, and optionally show\napplication-managed upload progress and results.";
    };
    readonly "ki-format-date": {
      readonly description: "Displays an ISO date or timestamp in the reader's language.";
      readonly events: {};
      readonly props: {
        readonly date: {
          readonly type: "string";
          readonly description: "ISO calendar date (YYYY-MM-DD) or ISO date-time. A timestamp without an offset uses local time.";
        };
        readonly "date-style": {
          readonly type: "enum";
          readonly values: readonly ["full", "long", "medium", "short"];
          readonly description: "Date detail. Defaults to medium when neither date style nor time style is supplied.";
        };
        readonly lang: {
          readonly type: "string";
          readonly description: "Language tag for the formatted date. Inherits the nearest HTML lang declaration when omitted.";
        };
        readonly "time-style": {
          readonly type: "enum";
          readonly values: readonly ["full", "long", "medium", "short"];
          readonly description: "Time detail. Omit to show the date alone.";
        };
        readonly "time-zone": {
          readonly type: "string";
          readonly description: "IANA time zone for a timestamp. A calendar date keeps its day in every zone.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-format-date";
      readonly whenNotToUse: "For an editable date or an elapsed time that should change as the clock advances.";
      readonly whenToUse: "For raw date and timestamp values in tables, records and prose.";
    };
    readonly "ki-format-number": {
      readonly description: "Displays a raw number using local number conventions and tabular figures.";
      readonly events: {};
      readonly props: {
        readonly currency: {
          readonly type: "string";
          readonly description: "ISO 4217 currency code, such as EUR. Selects currency output when format-style is omitted.";
        };
        readonly "format-style": {
          readonly type: "enum";
          readonly values: readonly ["decimal", "percent", "unit"];
          readonly description: "Decimal, percent or unit output. Without this option, currency selects currency output and other values use decimal.";
        };
        readonly "maximum-fraction-digits": {
          readonly type: "number";
          readonly description: "Maximum number of fraction digits.";
          readonly minimum: 0;
        };
        readonly "minimum-fraction-digits": {
          readonly type: "number";
          readonly description: "Minimum number of fraction digits.";
          readonly minimum: 0;
        };
        readonly notation: {
          readonly type: "enum";
          readonly values: readonly ["compact"];
          readonly description: "Use compact notation for abbreviated large numbers. Omit for standard notation.";
        };
        readonly unit: {
          readonly type: "string";
          readonly description: "Intl unit identifier, such as celsius or kilometer. Use with format-style=\"unit\".";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Raw finite number. A percent uses a ratio, so 0.49 displays as 49%.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-format-number";
      readonly whenNotToUse: "For numeric input or values that already include localized formatting.";
      readonly whenToUse: "For numeric data, currency amounts, ratios and measurements in content.";
    };
    readonly "ki-grid": {
      readonly description: "A passive responsive grid for content items.";
      readonly events: {};
      readonly props: {
        readonly columns: {
          readonly type: "number";
          readonly description: "Positive whole track count. Below 30rem of available inline size the fixed\ngrid uses one column. Omit columns for automatic tracks.";
          readonly minimum: 1;
        };
        readonly gap: {
          readonly type: "enum";
          readonly values: readonly ["10xl", "11xl", "12xl", "13xl", "14xl", "15xl", "16xl", "17xl", "18xl", "19xl", "20xl", "21xl", "22xl", "23xl", "24xl", "25xl", "26xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "lg", "md", "sm", "xl", "xs", "xxs", "zero"];
          readonly description: "Kimen spacing step, xl by default. Unsupported values keep the default gap.";
          readonly default: "xl";
        };
        readonly "min-column": {
          readonly type: "string";
          readonly description: "Minimum automatic track size as a CSS length. Defaults to 15rem and is ignored with fixed columns.";
          readonly default: "15rem";
        };
      };
      readonly slots: {
        readonly "": "The content in reading order. A direct child with data-span=\"2\" spans two tracks when they fit.";
      };
      readonly tag: "ki-grid";
      readonly whenNotToUse: "for page shells, painted grouping (use ki-card), or a data grid.";
      readonly whenToUse: "lay out items on responsive tracks with consistent token spacing.";
    };
    readonly "ki-icon": {
      readonly description: "A static Lucide glyph selected by name from the application's per-icon imports.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for a meaningful glyph. Omit it when nearby text already conveys the meaning.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Lucide name made available by a per-icon import. An unavailable name draws no glyph.";
          readonly required: true;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["inherit", "lg", "md", "sm"];
          readonly description: "Glyph size. Inherit follows the surrounding text at 1em.";
          readonly default: "inherit";
        };
      };
      readonly slots: {};
      readonly tag: "ki-icon";
      readonly whenNotToUse: "make an icon interactive, accept arbitrary SVG or URLs, or\nreplace the accessible name of a control. Use the control's own label.";
      readonly whenToUse: "show a named glyph next to text, or give a standalone meaningful\nglyph an accessible label. Import `@kimen/elements/icons/<name>` before\nmounting the component or rendering a guarded surface.";
    };
    readonly "ki-icon-button": {
      readonly description: "A token-styled, icon-only action button with native button semantics and a\nmandatory accessible name.";
      readonly events: {
        readonly "ki-change": "Emitted after toggle activation with the new selected state.";
      };
      readonly props: {
        readonly command: {
          readonly type: "enum";
          readonly values: readonly ["close", "request-close", "show-modal"];
          readonly description: "Dialog action to run for `commandfor`. Use `show-modal` to open,\n`close` for direct dismissal, or `request-close` for guarded dismissal.\nChoose a command for local dialog control and omit it for other actions.";
        };
        readonly commandfor: {
          readonly type: "string";
          readonly description: "ID of a ki-dialog in the same document or shadow tree as this button.\nSet it together with `command` to connect a dialog declaratively.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents activation, removes the icon button from keyboard reach, and\nexposes the unavailable state through the internal native button. Wins\nover `loading` when both are set.\nWhen NOT to use: do not use disabled for pending/loading semantics; use\n`loading`.";
          readonly default: false;
        };
        readonly expanded: {
          readonly type: "boolean";
          readonly description: "Application-owned disclosure state for a trigger that opens a popup.\nThe native icon button exposes this as `aria-expanded`. Use with\n`aria-haspopup=\"menu\"` for a menu trigger. Omit for other actions.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the internal focusable button (\"Close\", \"Play\").\nRequired in the catalog. When slotted as a trailing list control, the\nrow text supplies a fallback through the host aria-label.\nUse ki-button when the action has a visible label.";
          readonly required: true;
        };
        readonly loading: {
          readonly type: "boolean";
          readonly description: "Pending state of the action this icon button started (refreshing,\nsending). While set, every activation is blocked (pointer, Enter and\nSpace), but the icon button stays focusable, in the Tab order and at its\nsize: the icon stays laid out, transparent, and a spinner is drawn in its\nplace. The internal native button is exposed with `aria-disabled=\"true\"`\nand keeps its `label`, and `loadingLabel` is announced as a polite status\nmessage. `disabled` wins over it. The application sets it when the\naction starts and clears it when the action ends.\nWhen to use: while the work a click on this icon button started is\nrunning, so a second activation cannot repeat it.\nWhen NOT to use: for an icon button the person cannot use yet (use\n`disabled`), or for the progress of a page or region (use ki-progress).";
          readonly default: false;
        };
        readonly "loading-label": {
          readonly type: "string";
          readonly description: "Text of the polite status message announced while `loading` is set.\nOverride for localization; the default English string is the icon\nbutton's only built-in user-visible text.\nWhen to use: provide a localized message whenever the document language\nis not English, or a more specific one (\"Refreshing\").\nWhen NOT to use: do not repeat `label` here; the person already hears it\non focus.";
          readonly default: "Loading";
        };
        readonly pressed: {
          readonly type: "boolean";
          readonly description: "Application-owned toggle state. The native icon button exposes this as\n`aria-pressed` when `toggle` is off. Omit for a momentary action.";
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "Current press state in toggle mode. Set this to initialize or synchronize\nthe state programmatically without emitting a change.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed square size. Every size keeps at least the 24×24 minimum\npointer target (`xs` sits exactly on it); choose the size that matches\nthe density of the surrounding UI.\nWhen NOT to use: do not shrink below `xs` through tokens; no theme may\ngo under the WCAG 2.2 pointer-target floor.";
          readonly default: "md";
        };
        readonly toggle: {
          readonly type: "boolean";
          readonly description: "Enables persistent press state for an action such as Bookmark. The\nnative button exposes `aria-pressed` and each activation switches\n`selected`. Keep the same accessible label in both states.";
          readonly default: false;
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral", "success"];
          readonly description: "Semantic intent for the action, independent of hierarchy. Use `success`\nfor confirming actions and `danger` for destructive actions. Toggle\npalettes are specific to the variant.\nWhen NOT to use: do not use tone for visual hierarchy; use `variant`.";
          readonly default: "neutral";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["ghost", "outline", "primary", "quaternary", "secondary"];
          readonly description: "Visual hierarchy for the action. Use filled `primary` for the single main\naction, outlined `secondary` for supporting actions, `quaternary` for\nneutral icon actions, `ghost` for accent icon actions and `outline` for\nan unfilled action with a visible boundary.\nWhen NOT to use: do not use variant to signal success or danger; use\n`tone` for intent.";
          readonly default: "secondary";
          readonly deprecatedValues: readonly ["tertiary"];
        };
      };
      readonly slots: {
        readonly "": "Exactly one decorative icon. The slot is presentational: its\ncontent is hidden from assistive technology and never contributes to the\naccessible name. Supply `label` or use a named trailing list control.\nButton tokens size ki-icon glyphs in both slots, overriding their size.";
        readonly counter: "Decorative ki-counter in the block-start inline-end corner.\nInclude its meaning in the button label.";
        readonly selected: "Optional decorative icon shown when the toggle is selected.\nIf omitted, the default icon stays visible and an inline SVG takes a current-colour fill.";
      };
      readonly tag: "ki-icon-button";
      readonly whenNotToUse: "whenever a visible label fits (use ki-button),\nnavigation (use a link), or form\nsubmit/reset (ki-icon-button is not form-associated; use ki-button, whose\nvisible label communicates the consequence).";
      readonly whenToUse: "a compact, widely understood action where space precludes a\nvisible label: toolbars, card and dialog corners (close), media transport,\ndata-row actions. Always supply `label`; usually pair with ki-tooltip for\nsighted discoverability. Enable `toggle` for persistent actions such as\nBookmark. While the action it started is in progress, set `loading`.";
    };
    readonly "ki-image": {
      readonly description: "Displays one accessible image in a reserved frame, with an optional caption\nand a fallback if the source is refused or fails to load.";
      readonly events: {
        readonly "ki-error": "Reports a load failure or rejected URL once per source attempt. Bubbles\nand crosses shadow boundaries so consumers can observe it on a surface.";
      };
      readonly props: {
        readonly alt: {
          readonly type: "string";
          readonly description: "Describe what the image shows for the task at hand. Required and nonblank\nfor an informative image. Omit it for a decorative image.";
        };
        readonly decorative: {
          readonly type: "boolean";
          readonly description: "Hide the media from assistive technology when it conveys no information.";
          readonly default: false;
        };
        readonly "fallback-label": {
          readonly type: "string";
          readonly description: "Localizable fallback label. An informative fallback appends the image's\ndescription, when available, to this label.";
          readonly default: "Image unavailable";
        };
        readonly fit: {
          readonly type: "enum";
          readonly values: readonly ["contain", "cover"];
          readonly description: "Cover fills the frame. Contain preserves the whole image in it.";
          readonly default: "cover";
        };
        readonly loading: {
          readonly type: "enum";
          readonly values: readonly ["eager", "lazy"];
          readonly description: "Native loading hint. Use eager for a critical image above the fold.";
          readonly default: "lazy";
        };
        readonly radius: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "none"];
          readonly description: "Corner radius of the media frame.";
          readonly default: "lg";
        };
        readonly ratio: {
          readonly type: "enum";
          readonly values: readonly ["16:9", "1:1", "3:2", "4:3", "auto"];
          readonly description: "An explicit ratio reserves the same frame before load and on failure.\nAuto reserves 16:9 first and uses the intrinsic ratio after load.";
          readonly default: "auto";
        };
        readonly src: {
          readonly type: "string";
          readonly description: "Relative or HTTP(S) image URL. Refused sources are left unloaded.";
          readonly required: true;
          readonly format: "url";
        };
      };
      readonly slots: {
        readonly caption: "Optional visible context displayed below the media in a figcaption.";
      };
      readonly tag: "ki-image";
      readonly whenNotToUse: "for a background decoration, a video, or an interactive\ncontrol. Use a separate control to open or otherwise act on an image.";
      readonly whenToUse: "to show a photo, illustration, or diagram with a predictable\nlayout. Supply task-relevant alt text, or mark purely decorative media as\ndecorative. Set an explicit ratio when the layout must stay fixed.";
    };
    readonly "ki-indicator": {
      readonly description: "A non-interactive page-position indicator: one dot per position of a\nbounded sequence, exactly one highlighted as current.";
      readonly events: {};
      readonly props: {
        readonly count: {
          readonly type: "number";
          readonly description: "Number of positions (non-negative integer): one dot renders per\nposition, in position order. A missing, non-numeric or negative value\nrenders zero dots — an authoring mistake by catalog guidance, never an\nerror state or a rendering failure (FR-002; empty ki-list precedent).\nAt most 20 positions render, and the catalog accepts no more: the\nindicator serves a short sequence of peer views, 20 dots are the longest\nrow that fits a 320 CSS px viewport (the WCAG reflow width) in both\nshipped themes, and one dot renders per position, so the bound also caps\nthe work a single node can demand. A larger value renders 20.";
          readonly minimum: 0;
          readonly maximum: 20;
        };
        readonly current: {
          readonly type: "number";
          readonly description: "The current position, 1-based to match the exposed position text\n(\"2 / 5\"). Exactly one dot presents the current appearance whenever\n`count` >= 1: values above `count` clamp to the last position, values\nbelow 1 and non-numeric values fall back to the first (FR-003). Updates\nre-render in place — the highlight and the exposed text follow\nimmediately, re-applying the normalization (FR-004). The catalog accepts\n1 to 20, the positions a bounded `count` can have.";
          readonly minimum: 1;
          readonly maximum: 20;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the sequence (\"Slide position\"). The exposed name\ncombines it with the wordless numeric position —\n\"<label>, <current> / <count>\" — on a single non-interactive graphic;\nwithout a label the name degrades to the bare position text (documented\nas required authoring, FR-005). The label is never rendered visually\nand position changes are never announced (no live region, FR-006).";
          readonly required: true;
        };
      };
      readonly slots: {};
      readonly tag: "ki-indicator";
      readonly whenNotToUse: "section navigation (ki-tabs), task completion or loading\n(ki-progress), labeled step flows (ki-stepper), interactive pagination\n(ki-pagination — the indicator takes no focus and no input; navigation\nbelongs to the composing carousel's own controls), or conveying quantity\nwithout a current position. Position\nchanges are never announced by the indicator itself (no live region): the\ncomposing carousel owns announcements.";
      readonly whenToUse: "show the current position within a bounded, sequential set of\npeer views whose navigation lives elsewhere: carousel slides, unlabeled\nonboarding steps, gallery pages. Wire `count` and `current` (1-based) to\nthe sequence the consumer renders and give it a `label` (required\nauthoring: assistive technology reads one graphic named\n\"<label>, <current> / <count>\"). Below two positions an indicator carries\nno information.";
    };
    readonly "ki-input": {
      readonly description: "A token-styled single-line text field with native input semantics.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired when the user commits an edited value (native text-field\ntiming, such as on blur), composed across the shadow boundary; `value` is\nalready current when listeners run. When to use: react to a committed\nvalue. When NOT to use: do not use it for per-keystroke updates; the native\n`input` event carries those.";
      };
      readonly props: {
        readonly "ai-suggestion-text": {
          readonly type: "string";
          readonly description: "Localized provenance description read alongside help or an error when\nthe end slot contains an AI label. Use this to translate the description.";
          readonly default: "Suggested by AI";
        };
        readonly appearance: {
          readonly type: "enum";
          readonly values: readonly ["default", "filled", "outlined"];
          readonly description: "Field appearance. `default` uses the current theme, `outlined` draws a\nfull border, and `filled` uses a tinted surface and bottom indicator.\nThe visible label stays above the field.\nWhen to use: set an explicit appearance when fields must share a shape\nacross themes.";
          readonly default: "default";
        };
        readonly autocomplete: {
          readonly type: "string";
          readonly description: "Native autocomplete detail token forwarded to the internal input.\nWhen NOT to use: omit when no autofill entry purpose is known.";
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side or cross-field\nverdict on the submitted answer (\"Already registered\"). While it holds\ntext the field is invalid, blocks its form, shows the text in place of\nthe help text at once and is announced as invalid. It stops counting at\nthe person's next change of the answer, or when the form is reset, so it\nnever blocks the corrected answer. It outranks `error-text` and an error\nset with `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required` or other constraints the\nfield enforces itself; `error-text` words those. Setting the same text\nagain while the prop still holds it shows nothing: remove it first, then\nset it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents editing, removes the field from keyboard reach and exposes the\nunavailable state through the internal native input.\nWhen NOT to use: do not use disabled for readonly reference values.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message shown in place of the help text once the person's answer fails a\nconstraint (`required`, `type` or a length limit), and the field's `validationMessage`. Say\nhow to fix the answer (\"Enter an email address like name@example.com\").\nWithout it the browser's own message shows, in the browser's language. An\nerror set with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the field, read with it as its description: the\nformat expected, or why the answer is asked. While an error shows, the\nerror takes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label rendered next to the entry area and used as the accessible\nname. This is mandatory for valid usage.\nWhen NOT to use: never use `placeholder` as a label substitute.";
          readonly required: true;
        };
        readonly "label-hint": {
          readonly type: "string";
          readonly description: "Short text shown after the label and read with it as part of the field's\nname, so people know before submitting whether to answer: \"(optional)\" on\nthe few optional fields of a mostly required form, or \"(required)\" the\nother way round, in the page's own language. It changes no validation;\nset `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions or formats in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label.";
        };
        readonly maxlength: {
          readonly type: "number";
          readonly description: "Native maximum length in UTF-16 code units. The input prevents user entry\npast this limit.\nWhen to use: cap the number of characters people can enter.";
          readonly minimum: 0;
          readonly maximum: 2147483647;
        };
        readonly minlength: {
          readonly type: "number";
          readonly description: "Native minimum length in UTF-16 code units for a nonempty user edit.\nWhen to use: require a minimum number of characters in an answer.";
          readonly minimum: 0;
          readonly maximum: 2147483647;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key for the submitted value.\nWhen NOT to use: omit when the field must not contribute named form data.";
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Hint shown when the field is empty.\nWhen NOT to use: do not use placeholder as the accessible name.";
        };
        readonly readonly: {
          readonly type: "boolean";
          readonly description: "Makes the value focusable and selectable while rejecting edits.\nWhen NOT to use: use `disabled` when the value must be unavailable and\nexcluded from forms.";
          readonly default: false;
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Marks the field as required for native constraint validation.\nWhen NOT to use: do not use required on optional fields.";
          readonly default: false;
        };
        readonly "show-count": {
          readonly type: "boolean";
          readonly description: "Shows the current count and maximum next to the help or error text and\nannounces reaching or exceeding the limit. Requires `maxlength`.\nWhen to use: give people feedback while writing to a limit.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed field size (`--ki-input-{size}-*` tokens): the field box is\n24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and\nicon box; the label and help text follow in three steps. An unrecognized\nvalue matches no style rule and keeps the medium metrics.\nWhen to use: match the size of the buttons and fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["email", "password", "search", "tel", "text", "url"];
          readonly description: "Entry kind with native single-line input semantics. Unknown runtime\nvalues fall back to `text`; `number` is not a v1 input kind.\nWhen NOT to use: use future numeric controls for locale-aware number entry.";
          readonly default: "text";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Live text value. The attribute declares the initial default; the property\nis the current value and programmatic assignments are silent.\nDeviation from native (deliberate, research D2): assigning the ATTRIBUTE\nprogrammatically also replaces the displayed value, silently — native\ninputs would keep the user's dirty value. Form reset restores the\nattribute's current value.\nWhen NOT to use: do not observe user edits by polling; listen for `input`\nand `change` (both re-dispatched composed across the shadow boundary).";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly action: "One small submit action inside the field after the end adornment.\nUse for one-field forms such as search or subscribe. Place a named\n`ki-button size=\"sm\" type=\"submit\"` here, or wire a labeled\n`ki-icon-button size=\"sm\"` to request form submission. The action has its own tab\nstop. Use the end slot for clear or reveal controls.";
        readonly end: "Trailing icon or text affix inside the field. Follows writing direction.\nA directly slotted AI label also describes the field as suggested by AI.";
        readonly start: "Leading icon or text affix inside the field. Follows writing direction.";
      };
      readonly tag: "ki-input";
      readonly whenNotToUse: "multiline text, predefined choices, boolean state, numeric\nstepper entry, or placeholder-only labeling.";
      readonly whenToUse: "collect one line of free text from a person, always with a\nvisible `label`; choose the `type` and `autocomplete` that match the entry\npurpose.";
    };
    readonly "ki-link": {
      readonly description: "A native navigation link with Kimen ink, underline, and focus styles.";
      readonly events: {};
      readonly props: {
        readonly download: {
          readonly type: "string";
          readonly description: "Native download attribute. Set it to an empty string to let the browser\nchoose the file name, or supply a suggested file name.";
        };
        readonly external: {
          readonly type: "boolean";
          readonly description: "Requests a new tab with noopener and adds an icon and an accessible\nannouncement. An explicit download still follows native download rules.";
          readonly default: false;
        };
        readonly "external-label": {
          readonly type: "string";
          readonly description: "Localizable text appended to the accessible name in external mode.";
          readonly default: "(opens in a new tab)";
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Destination URL. Relative URLs and fragments use native anchor resolution.";
          readonly required: true;
          readonly format: "url";
        };
        readonly rel: {
          readonly type: "string";
          readonly description: "Space-separated native link relationships. External links always include noopener.";
        };
        readonly target: {
          readonly type: "string";
          readonly description: "Native browsing-context name. External links use _blank.";
        };
        readonly underline: {
          readonly type: "enum";
          readonly values: readonly ["always", "hover"];
          readonly description: "Keep the underline in running text. Use hover for standalone navigation,\nwhere placement identifies the link and keyboard focus still underlines it.";
          readonly default: "always";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["neutral", "primary"];
          readonly description: "Ink role. Primary uses accent ink and neutral uses body ink.";
          readonly default: "primary";
        };
      };
      readonly slots: {
        readonly "": "Descriptive link text. Use phrasing content without nested interactive controls.";
      };
      readonly tag: "ki-link";
      readonly whenNotToUse: "perform an action on the current page. Use ki-button variant=\"ghost\" for that.";
      readonly whenToUse: "navigate to a page, section, or resource. Use a descriptive label and keep the default underline in running text. Leave the action binding unset for native navigation.";
    };
    readonly "ki-list": {
      readonly description: "A vertical list of read-only entries, navigation links, settings controls,\nor options in a single- or multiple-selection listbox.";
      readonly events: {
        readonly "ki-change": "Fires once per user selection change, after updating the form value.";
      };
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for a list with links, options or trailing controls.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form field name. Multiple selection submits repeated entries under this name.";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires at least one enabled choice in a selection list.";
          readonly default: false;
        };
        readonly selection: {
          readonly type: "enum";
          readonly values: readonly ["multiple", "none", "single"];
          readonly description: "Enables single or multiple selection. The default supports static, link and control rows.";
          readonly default: "none";
        };
      };
      readonly slots: {
        readonly "": "Direct `ki-list-item` children.";
      };
      readonly tag: "ki-list";
      readonly whenNotToUse: "popup action menus, tabular data, or rows with several actions.";
      readonly whenToUse: "settings, contacts, results, navigation or visible choices composed\nfrom primary text, supporting text and optional media. Name interactive lists.";
    };
    readonly "ki-list-item": {
      readonly description: "A row inside `ki-list`, composed from leading media, primary text,\noptional secondary text and trailing content.";
      readonly events: {};
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Excludes this option from focus, selection by the user, and form data.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Native row link destination. Use outside selection lists, with no\nslotted interactive content.";
          readonly format: "url";
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "Whether this row is selected in a single- or multiple-selection list.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl"];
          readonly description: "Token-backed row size (`--ki-list-item-{size}-*` tokens): minimum height\n(48, 56, 64 or 72px with a secondary line in onmars), padding, gap and\ntext. Slotted start and end content keeps the size its author gave it.\nAn unrecognized value matches no style rule and keeps the medium metrics.\nWhen to use: give every row of one list the same size.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Submitted option value. The primary row text supplies the default.";
        };
      };
      readonly slots: {
        readonly "": "Primary text line.";
        readonly end: "Trailing media, meta text or the only control of a settings row.";
        readonly secondary: "Supporting text below the primary line. Its presence\nselects the multi-line min-height token.";
        readonly start: "Leading media such as an icon, avatar or image.";
      };
      readonly tag: "ki-list-item";
      readonly whenNotToUse: "as a menu item, tabular row, or row with several actions.";
      readonly whenToUse: "as a direct child of `ki-list`, for a static entry, link,\nselection option, or a settings row with one control.";
    };
    readonly "ki-markdown": {
      readonly description: "Displays Markdown as Kimen components and native HTML semantics.";
      readonly events: {};
      readonly props: {
        readonly "allow-images": {
          readonly type: "boolean";
          readonly description: "Render Markdown images that pass the URL policy. Otherwise show their alternative text.";
          readonly default: false;
        };
        readonly "heading-offset": {
          readonly type: "number";
          readonly description: "Add zero through five levels to source headings. The output stops at level six. Invalid values use two.";
          readonly default: 2;
          readonly minimum: 0;
          readonly maximum: 5;
        };
        readonly "src-text": {
          readonly type: "string";
          readonly description: "Markdown source. A supplied value, including an empty string, takes precedence over the default text slot.";
        };
        readonly streaming: {
          readonly type: "boolean";
          readonly description: "Keep established blocks mounted while an answer grows. Turn it off when the source is complete.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Literal Markdown source. Set a text node or escape markup when writing HTML.";
      };
      readonly tag: "ki-markdown";
      readonly whenNotToUse: "Present an editable document or apply trusted authored HTML. Use native markup for structured page content.";
      readonly whenToUse: "Show a formatted reply, readme excerpt or progressively received text from a person or model.";
    };
    readonly "ki-menu": {
      readonly description: "A popup of actions opened by a button in the same document or shadow root.";
      readonly events: {
        readonly "ki-select": "Reports the selected action and, for a checkbox or radio, its new checked state.";
      };
      readonly props: {
        readonly anchor: {
          readonly type: "string";
          readonly description: "Literal ID of the menu button in the same document or containing shadow root.";
          readonly default: "";
          readonly format: "idref";
        };
        readonly "filter-label": {
          readonly type: "string";
          readonly description: "Accessible name and placeholder of the filter. Omit to hide the field.";
          readonly default: "";
        };
        readonly "filter-results-label": {
          readonly type: "string";
          readonly description: "Polite results message. The menu substitutes the number of matches for `{count}`.";
          readonly default: "Matching actions: {count}";
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the popup is open. Reflected when the user opens or dismisses it.";
          readonly default: false;
        };
        readonly placement: {
          readonly type: "enum";
          readonly values: readonly ["bottom-end", "bottom-start", "top-end", "top-start"];
          readonly description: "Preferred side and logical alignment. Flips when the opposite side has more room.";
          readonly default: "bottom-start";
        };
      };
      readonly slots: {
        readonly "": "Place ki-menu-item, ki-menu-group, and ki-divider here.";
        readonly header: "Informational content above the actions, such as account details.";
      };
      readonly tag: "ki-menu";
      readonly whenNotToUse: "form values, navigation destinations, or long action lists.";
      readonly whenToUse: "row actions, account commands, split buttons, and overflow actions.";
    };
    readonly "ki-menu-group": {
      readonly description: "A named group of related actions in a ki-menu.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Visible and accessible group name.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "The ki-menu-item and ki-divider children of the group.";
      };
      readonly tag: "ki-menu-group";
      readonly whenNotToUse: "standalone sections or nested menus.";
      readonly whenToUse: "name a set of related actions or scope exclusive radio items in a menu.";
    };
    readonly "ki-menu-item": {
      readonly description: "A pointer and keyboard action within a ki-menu.";
      readonly events: {};
      readonly props: {
        readonly checked: {
          readonly type: "boolean";
          readonly description: "Checked state for checkbox and radio actions.";
          readonly default: false;
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disabled actions remain discoverable via menu navigation.";
          readonly default: false;
        };
        readonly shortcut: {
          readonly type: "string";
          readonly description: "Display-only keyboard shortcut. Applications own shortcut registration.";
          readonly default: "";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral"];
          readonly description: "Apply the danger tone to a destructive action.";
          readonly default: "neutral";
        };
        readonly type: {
          readonly type: "enum";
          readonly values: readonly ["checkbox", "item", "radio"];
          readonly description: "Action role. A checkbox stays open. A radio selects one action within its group.";
          readonly default: "item";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Action identifier reported by the parent menu.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "The action's visible label.";
        readonly start: "One decorative icon or avatar before the label.";
      };
      readonly tag: "ki-menu-item";
      readonly whenNotToUse: "standalone controls, navigational links, or form options.";
      readonly whenToUse: "a command, independent checkbox action, or exclusive radio action in a menu.";
    };
    readonly "ki-message": {
      readonly description: "A user message, assistant reply or event.";
      readonly events: {
        readonly "ki-branch-change": "Requests a branch by its one-based index.";
        readonly "ki-feedback": "Reports the selected rating.";
        readonly "ki-regenerate": "Requests a new reply on Regenerate.";
      };
      readonly props: {
        readonly "actions-label": {
          readonly type: "string";
          readonly description: "Names and enables the assistant toolbar.";
        };
        readonly author: {
          readonly type: "string";
          readonly description: "Accessible article name. Defaults by role.";
        };
        readonly "branch-count": {
          readonly type: "number";
          readonly description: "Total replies. Shows a picker for two or more.";
          readonly default: 1;
        };
        readonly "branch-index": {
          readonly type: "number";
          readonly description: "One-based reply index. Update after accepting a branch request.";
          readonly default: 1;
        };
        readonly "branch-status-label": {
          readonly type: "string";
          readonly description: "Branch announcement template with {index} and {count}.";
          readonly default: "Response {index} of {count}";
        };
        readonly feedback: {
          readonly type: "enum";
          readonly values: readonly ["bad", "good"];
          readonly description: "Good or bad rating. Restore it when switching branches.";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Decorative event icon. Search is built in. Import other icons before use.";
        };
        readonly "message-role": {
          readonly type: "enum";
          readonly values: readonly ["assistant", "event", "user"];
          readonly description: "Trailing user bubble, leading assistant avatar or centered event.";
        };
        readonly "next-branch-label": {
          readonly type: "string";
          readonly description: "Next branch button label.";
          readonly default: "Next response";
        };
        readonly "previous-branch-label": {
          readonly type: "string";
          readonly description: "Previous branch button label.";
          readonly default: "Previous response";
        };
        readonly streaming: {
          readonly type: "boolean";
          readonly description: "Show a caret and mark the article busy.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "Text or formatted content.";
        readonly actions: "App controls. With actions-label, use direct buttons or a layout-only\nki-button-group. Mark regenerate and rating buttons with data-message-action.";
        readonly avatar: "Overrides the decorative assistant avatar.";
      };
      readonly tag: "ki-message";
      readonly whenNotToUse: "Prompt input, page alerts or tool execution.";
      readonly whenToUse: "Display an entry in ki-conversation.";
    };
    readonly "ki-mobile-nav": {
      readonly description: "A fixed or floating navigation bar for the main destinations of a phone layout.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the landmark. Supply a distinct name when the page\nhas more than one navigation landmark.";
          readonly default: "Main";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["fixed", "floating"];
          readonly description: "Place the bar edge to edge or inset it as a raised pill.";
          readonly default: "fixed";
        };
      };
      readonly slots: {
        readonly "": "Three to five direct ki-mobile-nav-item destinations.";
      };
      readonly tag: "ki-mobile-nav";
      readonly whenNotToUse: "Use buttons for actions. Use TopNav or Sidebar on wide layouts or when there are more than five destinations.";
      readonly whenToUse: "Place after the main content of a narrow layout. Supply three to five direct ki-mobile-nav-item children and mark the current page on its item. The host reserves room for the bar in normal flow.";
    };
    readonly "ki-mobile-nav-item": {
      readonly description: "An icon and visible label for one mobile navigation destination.";
      readonly events: {};
      readonly props: {
        readonly count: {
          readonly type: "number";
          readonly description: "Optional count of new items. Only finite counts of at least one are shown.\nThe painted count is abbreviated above 99.";
        };
        readonly "count-label": {
          readonly type: "string";
          readonly description: "Localized suffix for the link name. Use {count} for the full rounded count.";
          readonly default: "{count} new";
        };
        readonly current: {
          readonly type: "boolean";
          readonly description: "Marks this link as the current page.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Destination URL. Relative paths and fragments use native anchor resolution.";
          readonly required: true;
          readonly format: "url";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Registered icon name. The visible destination text supplies the link name.";
          readonly required: true;
        };
      };
      readonly slots: {
        readonly "": "Visible destination text. Use plain text or noninteractive phrasing content.";
      };
      readonly tag: "ki-mobile-nav-item";
      readonly whenNotToUse: "For a command on the current page, use a button. For inline navigation outside a bottom bar, use ki-link.";
      readonly whenToUse: "Place directly in ki-mobile-nav. Register a decorative icon and supply a short visible text label. Leave the catalog click action unset for native navigation.";
    };
    readonly "ki-note": {
      readonly description: "A compact, static explanation beside a control or inside a card.";
      readonly events: {};
      readonly props: {
        readonly icon: {
          readonly type: "boolean";
          readonly description: "Shows the decorative icon. Set icon=\"false\" in HTML to hide it.";
          readonly default: true;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Uses caption text at sm and body text at md. Unknown values use md.";
          readonly default: "md";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "primary", "success", "warning"];
          readonly description: "Selects the background tint and decorative icon. Unknown values use neutral.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Short explanatory text that carries the full meaning.";
        readonly icon: "A decorative glyph that replaces the tone's built-in icon.";
      };
      readonly tag: "ki-note";
      readonly whenNotToUse: "For updates that must be announced, use ki-alert. Use Toast\nfor transient confirmations and the field's help-text for field guidance.";
      readonly whenToUse: "Add a short constraint, tip or consequence next to the content\nit explains. Put the consequence first when warning the reader.";
    };
    readonly "ki-number-input": {
      readonly description: "A form field for a numeric quantity with optional stepper buttons, bounds,\nlocale-aware formatting, and a visible unit.";
      readonly events: {
        readonly change: "Composed event fired when the person commits an edited or stepped value. Read the host's numeric value. Listen to native input for live edits.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted number (\"Only 40 seats left\"). While it holds text the field is\ninvalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nedit or step of the number, or when the form is reset, so it never blocks\nthe corrected answer. It outranks `error-text`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required`, the bounds or unreadable\ntext, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again.";
        };
        readonly "decrease-label": {
          readonly type: "string";
          readonly description: "Stepper's accessible name. The field label replaces {label}.";
          readonly default: "Decrease {label}";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents editing and excludes the control from form submission.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Validation hint to show when the entry fails a constraint. A `custom-error` outranks it.";
        };
        readonly format: {
          readonly type: "string";
          readonly description: "Intl.NumberFormat options for display. In HTML or a catalog spec, supply\nthese options as JSON text. The form value retains its original precision.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Context or instructions displayed beneath the field when it has no visible error.";
        };
        readonly "increase-label": {
          readonly type: "string";
          readonly description: "Stepper's accessible name. The field label replaces {label}.";
          readonly default: "Increase {label}";
        };
        readonly "invalid-number-message": {
          readonly type: "string";
          readonly description: "Default validation message for text that cannot be read as a number.";
          readonly default: "Enter a number.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible accessible name. Supply a meaningful label in the page language.";
          readonly required: true;
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Maximum permitted numeric value. Omit for an unbounded maximum.";
        };
        readonly "maximum-message": {
          readonly type: "string";
          readonly description: "Polite adjustment message after exceeding the maximum. The formatted bound replaces {value}.";
          readonly default: "Value adjusted to the maximum of {value}.";
        };
        readonly min: {
          readonly type: "number";
          readonly description: "Minimum permitted numeric value. Omit for an unbounded minimum.";
        };
        readonly "minimum-message": {
          readonly type: "string";
          readonly description: "Polite adjustment message after falling below the minimum. The formatted bound replaces {value}.";
          readonly default: "Value adjusted to the minimum of {value}.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key for the plain numeric value.";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Whether the user must enter a number before submitting the form.";
          readonly default: false;
        };
        readonly step: {
          readonly type: "number";
          readonly description: "Positive increment for arrows and buttons. Page keys and Shift+arrows move ten increments.";
          readonly default: 1;
        };
        readonly steppers: {
          readonly type: "boolean";
          readonly description: "Shows named decrease and increase buttons inside the field.";
          readonly default: false;
        };
        readonly unit: {
          readonly type: "string";
          readonly description: "Visible suffix such as seconds or seats, included in the accessible description.";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Current numeric value, or undefined when empty or unparseable. Use the\nattribute for the form reset value. Property assignments are silent.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-number-input";
      readonly whenNotToUse: "Use ki-input for identifiers, codes, or other text that only\nlooks numeric. Use a range control when relative position is the main cue.";
      readonly whenToUse: "Collect a number like a quantity, amount, or limit. Provide a\nvisible label and choose bounds and an increment when they have meaning.";
    };
    readonly "ki-option": {
      readonly description: "A declarative data option rendered by its owning `ki-select` or `ki-combobox`.";
      readonly events: {};
      readonly props: {
        readonly description: {
          readonly type: "string";
          readonly description: "Secondary text shown below the label in a combobox choice row.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Makes this option unavailable. Disabled options cannot be selected, are\nskipped by keyboard highlight, and are exposed unavailable by the select.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Submission and selection value for this option. When omitted, the value\nfalls back to the trimmed option text, matching native `<option>` parity.\nWhen NOT to use: do not use this as selection state; set `ki-select.value`.";
        };
      };
      readonly slots: {
        readonly "": "Text label mirrored by the owning choice field.";
        readonly start: "Decorative content shown before the label in a combobox row.";
      };
      readonly tag: "ki-option";
      readonly whenNotToUse: "`ki-option` standalone, authoring selection\non an option, or expecting it to paint its own row.";
      readonly whenToUse: "declare one choice inside a `ki-select` or `ki-combobox`; its text is the\nhuman-facing label and its `value` is the submitted value.";
    };
    readonly "ki-pagination": {
      readonly description: "Controls for moving among pages of results or appending the next batch.";
      readonly activationEvent: "ki-page-change";
      readonly events: {
        readonly "ki-load-more": "Requests another batch. Append results in place and update shown.";
        readonly "ki-page-change": "Requests a different page. Update results and move focus to their heading\nwhen they are ready. Cancelling the event also cancels a plain link click.";
      };
      readonly props: {
        readonly boundaries: {
          readonly type: "number";
          readonly description: "Number of pages to display at each end of the numbered list.";
          readonly default: 1;
          readonly minimum: 0;
          readonly maximum: 10;
        };
        readonly "compact-label": {
          readonly type: "string";
          readonly description: "Localized stepper label template. Include {page} and {pages}.";
          readonly default: "Page {page} of {pages}";
        };
        readonly "href-template": {
          readonly type: "string";
          readonly description: "Relative or HTTP(S) URL template for native navigation. Place {page} in\nthe path, query or fragment, for example \"?page={page}\".";
          readonly format: "url";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the navigation landmark. Distinguish multiple result sets.";
          readonly default: "Pagination";
        };
        readonly "load-more-label": {
          readonly type: "string";
          readonly description: "Localized visible label for the button that appends results.";
          readonly default: "Load more";
        };
        readonly "next-label": {
          readonly type: "string";
          readonly description: "Localized accessible name of the control that requests the next page.";
          readonly default: "Next page";
        };
        readonly page: {
          readonly type: "number";
          readonly description: "Current 1-based page. Update it when the requested results are ready.";
          readonly default: 1;
          readonly minimum: 1;
        };
        readonly "page-label": {
          readonly type: "string";
          readonly description: "Localized accessible name template for numbered controls. Include {page}.";
          readonly default: "Page {page}";
        };
        readonly pages: {
          readonly type: "number";
          readonly description: "Total number of result pages. Omit it until a page count is available.";
          readonly minimum: 0;
        };
        readonly "previous-label": {
          readonly type: "string";
          readonly description: "Localized accessible name of the control that requests the previous page.";
          readonly default: "Previous page";
        };
        readonly shown: {
          readonly type: "number";
          readonly description: "Displayed result count in load-more mode. Update it after appending results.";
          readonly minimum: 0;
        };
        readonly siblings: {
          readonly type: "number";
          readonly description: "Number of pages to display on each side of the current page.";
          readonly default: 1;
          readonly minimum: 0;
          readonly maximum: 10;
        };
        readonly "status-label": {
          readonly type: "string";
          readonly description: "Localized polite count template. Include {shown} and {total}.";
          readonly default: "Showing {shown} of {total} results";
        };
        readonly total: {
          readonly type: "number";
          readonly description: "Total result count in load-more mode. Required with shown for the count.";
          readonly minimum: 0;
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["compact", "load-more", "pages"];
          readonly description: "Numbered pages, a previous/next stepper, or a button to append results.\nNumbered pages switch to the stepper below 480 CSS pixels of available width.";
          readonly default: "pages";
        };
      };
      readonly slots: {};
      readonly tag: "ki-pagination";
      readonly whenNotToUse: "short lists that fit in one view or the steps of a task.";
      readonly whenToUse: "paged tables, search results or long lists. Use compact for\na previous/next stepper and load-more to append results in place.";
    };
    readonly "ki-popover": {
      readonly description: "A non-modal popover anchored to a button.";
      readonly events: {
        readonly "ki-close": "Emitted when the popover closes, also when `open` is cleared: it can fire\nwithout a gesture.";
        readonly "ki-open": "Emitted when the popover opens, also when `open` is set: it can fire\nwithout a gesture.";
      };
      readonly props: {
        readonly appearance: {
          readonly type: "enum";
          readonly values: readonly ["default", "rich"];
          readonly description: "Rich shares the tooltip's raised surface, body and heading styles. With\n`kind=\"toggletip\"` it enables actions and moves focus inside on open.";
          readonly default: "default";
        };
        readonly arrow: {
          readonly type: "boolean";
          readonly description: "Shows the arrow toward the trigger.";
          readonly default: true;
        };
        readonly for: {
          readonly type: "string";
          readonly description: "ID of the button in the same document or shadow tree.";
          readonly format: "idref";
        };
        readonly kind: {
          readonly type: "enum";
          readonly values: readonly ["dialog", "toggletip"];
          readonly description: "Use dialog for controls or toggletip for supplemental information. Rich toggletips can contain actions.";
          readonly default: "dialog";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of a dialog popover.";
          readonly default: "Popover";
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Visibility. Reflects activation and native dismissal.";
          readonly default: false;
        };
        readonly placement: {
          readonly type: "enum";
          readonly values: readonly ["bottom", "bottom-end", "bottom-start", "end", "end-end", "end-start", "start", "start-end", "start-start", "top", "top-end", "top-start"];
          readonly description: "Preferred side and logical alignment. Flips when room is limited.";
          readonly default: "bottom-start";
        };
      };
      readonly slots: {
        readonly "": "Dialog content or toggletip text. A rich toggletip also accepts actions.";
      };
      readonly tag: "ki-popover";
      readonly whenNotToUse: "Use ki-dialog for required decisions and ki-tooltip for hover or focus hints.";
      readonly whenToUse: "Show filters, details, a small form, or an explanation opened by click. Use a rich toggletip for a short explanation with actions.";
    };
    readonly "ki-progress": {
      readonly description: "A token-styled, non-interactive progress indicator for known or unknown\nduration work.";
      readonly events: {};
      readonly props: {
        readonly indeterminate: {
          readonly type: "boolean";
          readonly description: "Unknown-duration mode. When set, no completed fraction or current value is\nexposed. Its motion is declared only when reduced motion is not requested.\nWhen to use: show ongoing work whose duration or total cannot be measured.\nWhen NOT to use: do not use for known fractions; use `value` and `max`.";
          readonly default: false;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name applied to the internal progressbar. Always set this to\nwhat is progressing, such as \"Uploading report.pdf\". Without it the\nelement renders but exposes no accessible name, so the catalog contract\nrequires it.\nWhen NOT to use: do not use a generic label such as \"Loading\" when the\ntask can be named more specifically.";
          readonly required: true;
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Total amount. Non-finite, zero or negative values normalize to `100` for\npresentation and ARIA.\nWhen to use: set when a determinate task's total is not 100.\nWhen NOT to use: omit for conventional percentage-style progress.";
          readonly default: 100;
        };
        readonly shape: {
          readonly type: "enum";
          readonly values: readonly ["circular", "linear"];
          readonly description: "Structural presentation. Use `linear` in page flows and lists; use\n`circular` in compact or centered placements. Unknown values render linear.\nWhen NOT to use: do not use shape to encode semantic status or task intent.";
          readonly default: "linear";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Completed amount. Presentation and ARIA clamp this value to `0..max`;\nmalformed values fall back to `0`. Ignored while `indeterminate` is set.\nWhen to use: set with `max` for determinate task advancement.\nWhen NOT to use: do not set a fabricated value for unknown-duration work;\nset `indeterminate` instead.";
          readonly default: 0;
        };
      };
      readonly slots: {};
      readonly tag: "ki-progress";
      readonly whenNotToUse: "static measurements within a known range such as disk\nusage or scores (gauge/meter), step-by-step wizard navigation (stepper),\nskeleton placeholders while content loads, or operations that finish in\nunder about one second.";
      readonly whenToUse: "communicate advancement of an ongoing task such as upload,\ndownload, installation or multi-step processing. Use `value`/`max` when\nthe completed fraction is known; use `indeterminate` when work is ongoing\nbut its duration cannot be measured, including loading-indicator use cases.\nChoose `linear` in page flows and lists, and `circular` in compact or\ncentered placements. Always set `label` to what is progressing.";
    };
    readonly "ki-prompt-input": {
      readonly description: "A multiline assistant composer with local file attachments and send and stop requests.";
      readonly events: {
        readonly "ki-stop": "Requests that the application stop its streaming response.";
        readonly "ki-submit": "Requests a send with original text and a snapshot of accepted local files.";
      };
      readonly props: {
        readonly accept: {
          readonly type: "string";
          readonly description: "Comma-separated extensions or MIME types. Empty hides the attachment surface.";
          readonly default: "";
        };
        readonly "attach-label": {
          readonly type: "string";
          readonly description: "Accessible name of the file picker button.";
          readonly default: "Attach files";
        };
        readonly "attachments-label": {
          readonly type: "string";
          readonly description: "Accessible name of the attachment list.";
          readonly default: "Attachments";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Excludes the composer from interaction and native form data.";
          readonly default: false;
        };
        readonly "file-count-message": {
          readonly type: "string";
          readonly description: "Localized count rejection. The {name} marker is replaced with the file name.";
          readonly default: "{name} exceeds the maximum number of attachments.";
        };
        readonly "file-size-message": {
          readonly type: "string";
          readonly description: "Localized size rejection. The {name} marker is replaced with the file name.";
          readonly default: "{name} exceeds the file size limit.";
        };
        readonly "file-type-message": {
          readonly type: "string";
          readonly description: "Localized type rejection. The {name} marker is replaced with the file name.";
          readonly default: "{name} has an unsupported file type.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Required accessible name of the text field. Supply it even with a placeholder.";
          readonly required: true;
        };
        readonly "max-files": {
          readonly type: "number";
          readonly description: "Maximum count of attached files. Omit for no count limit.";
        };
        readonly "max-size": {
          readonly type: "number";
          readonly description: "Maximum attachment size in bytes per file. Omit for no size limit.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Optional key for the text in native form data. Files are carried by ki-submit.";
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Hint displayed while the text field is empty.";
        };
        readonly "remove-label": {
          readonly type: "string";
          readonly description: "Prefix of an attachment's remove button name, followed by the file name.";
          readonly default: "Remove";
        };
        readonly "send-label": {
          readonly type: "string";
          readonly description: "Accessible name of the Send button.";
          readonly default: "Send";
        };
        readonly status: {
          readonly type: "enum";
          readonly values: readonly ["idle", "streaming", "submitted"];
          readonly description: "Application-owned request state. Only idle can send; streaming exposes Stop.";
          readonly default: "idle";
        };
        readonly "stop-label": {
          readonly type: "string";
          readonly description: "Accessible name of the Stop button.";
          readonly default: "Stop generating";
        };
        readonly "submit-on": {
          readonly type: "enum";
          readonly values: readonly ["enter", "mod-enter"];
          readonly description: "Send with Enter or with Control/Command+Enter. Shift+Enter always adds a line.";
          readonly default: "enter";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Current draft text; the value attribute provides the form reset default.";
          readonly default: "";
        };
        readonly "writing-message": {
          readonly type: "string";
          readonly description: "Visible polite status while the assistant streams.";
          readonly default: "Writing…";
        };
      };
      readonly slots: {
        readonly attachments: "Supplemental list items, visible when accept is set. Composer-managed files appear in the same list and alone contribute to ki-submit.";
        readonly tools: "Application-owned toolbar controls, such as a model-picker trigger. Use non-submitting controls.";
      };
      readonly tag: "ki-prompt-input";
      readonly whenNotToUse: "Ordinary multiline form input without a send or stop interaction (`ki-textarea`), file uploads, or rich text editing.";
      readonly whenToUse: "Compose a message to an assistant, optionally attach local files, and let people interrupt the assistant's response.";
    };
    readonly "ki-qr": {
      readonly description: "A machine-scannable QR code that hands a declared value — a link, a\npairing payload — from the screen to a nearby camera, encoded locally\nand restyled entirely through tokens.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name stating the code's purpose (\"Open onmars.dev on your\nphone\"). The component exposes exactly one non-interactive image named\nby it, falling back to the encoded value when absent (FR-005) — never\nan unnamed graphic. The label is never rendered visually, and naming\nthe purpose is what tells assistive-technology users to look for the\naccessible alternative carrying the same payload (documented catalog\nguidance, FR-013).";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "The exact text the code encodes — the single source of the content,\nencoded locally as one UTF-8 byte segment at error-correction level M\n(non-ASCII text additionally carries the UTF-8 ECI designator, so real\nscanners decode the declared string rather than an ISO-8859-1\nmisreading), so an independent decoder recovers it byte-for-byte,\nincluding non-ASCII text (FR-001), and no network request is ever made — the value is\ndata, never behavior: the component never interprets, resolves,\nnavigates to or fetches it (FR-002). Changes re-encode in place. When\nabsent, empty or beyond the capacity of the densest symbol (~2,331\nbytes at level M), nothing renders and nothing errors (FR-003).";
        };
      };
      readonly slots: {};
      readonly tag: "ki-qr";
      readonly whenNotToUse: "data the person must read on this same screen (render text\nor a link), one-dimensional barcodes (out of scope), anything interactive\n(a QR code is not a button — pair it with a real control instead), secret\nvalues (anyone who can photograph the screen can decode them), or as the\nsole carrier of the payload (the accessible alternative is mandatory\nguidance). An always-empty ki-qr and a value beyond the ~2,331-byte\ncapacity are authoring mistakes: both render nothing, silently.";
      readonly whenToUse: "hand a URL or machine-readable payload from the screen to a\nnearby camera device: login pairing, tickets and passes, \"continue on\nmobile\" links, Wi-Fi sharing. Declare `value` (encoded verbatim, always\nlocally) and a purpose-stating `label` (\"Open onmars.dev on your phone\"),\nand always offer the same payload through an accessible alternative next\nto the code — a visible link or copyable text — because a QR code is only\nuseful to someone who can point a second device's camera at the screen.";
    };
    readonly "ki-radio": {
      readonly description: "One option in a token-styled radio group.";
      readonly events: {};
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents this option from being selected or focused. Disabled options are\nskipped by group arrow navigation and omitted from form submission when\nselected before becoming disabled.\nWhen NOT to use: do not use disabled as a temporary loading state.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Submission value projected by the parent `ki-radio-group` when this option\nis selected. Omit for native radio parity with value `\"on\"`.\nWhen NOT to use: do not use `value` to author selection; set the group's\n`value` property or attribute.";
          readonly default: "on";
        };
      };
      readonly slots: {
        readonly "": "Option label. This is the accessible name and activation surface.";
      };
      readonly tag: "ki-radio";
      readonly whenNotToUse: "`ki-radio` standalone, multiple selection,\nor authored selection state; set the parent group's `value` instead.";
      readonly whenToUse: "place inside `ki-radio-group` when a person must choose\nexactly one of a small visible set.";
    };
    readonly "ki-radio-group": {
      readonly description: "A token-styled radio group that owns selection, keyboard coordination and\nform participation for slotted `ki-radio` options.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired once after the user selects a different radio, composed\nacross the shadow boundary; `value` is already current when listeners run.\n`click()` on a `ki-radio` from a script selects it like a native radio: one\n`input`, then one `change`.\nWhen to use: react to the committed choice. When NOT to use: do not expect\nit for programmatic `value` writes, which are silent.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"This plan is sold out\"). While it holds text the group\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting when the person\nchooses another option, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` group left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Makes the whole group unavailable, skips it in Tab order and removes its\nform entry.\nWhen NOT to use: do not use disabled for pending/loading semantics.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message shown in place of the help text once a `required` group is left\nwithout a choice, and its `validationMessage` (\"Choose a plan\"). Without\nit the browser's own message shows, in the browser's language. An error\nset with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the options, read with the group as its\ndescription: what the choice decides. While an error shows, the error\ntakes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label and accessible-name source for the radiogroup.\nWhen NOT to use: do not omit it unless the host's `aria-labelledby` names\nthe group from the page; a group with neither fails accessibility gates.\n\nNaming from the page: set `aria-labelledby` on the host to the ids of\nelements in the same document or shadow root, such as the heading that\nalready asks the question. The group then takes its name from them,\nfollowed by its own `label` and `label-hint` when set. The ids are read\nwhen the group renders and whenever the attribute changes.\nWhen to use: the question is written on the page above the options; omit\n`label` so the question is not shown, or read, twice.\nWhen NOT to use: do not reference elements inside another component's\nshadow root, which an id reference cannot reach.";
          readonly required: true;
        };
        readonly "label-hidden": {
          readonly type: "boolean";
          readonly description: "Hides the `label` (and its hint) from view and from reading order while it\nstays the radiogroup's accessible name, so a screen reader announces it\nonce, as the group's name.\nWhen to use: the layout already makes the question obvious to sighted\npeople (a heading in a card, an icon row) but the group still needs a\nname of its own.\nWhen NOT to use: do not hide a label that repeats a question already on\nthe page; point `aria-labelledby` at that question instead. Do not hide\nthe only description of what a choice decides; that is `help-text`.";
          readonly default: false;
        };
        readonly "label-hint": {
          readonly type: "string";
          readonly description: "Short text shown after the group label and read with it as part of the\nradiogroup name, so people know before submitting whether to choose:\n\"(optional)\" on the few optional questions of a mostly required form, or\n\"(required)\" the other way round, in the page's own language. It changes\nno validation; set `required` for that, and keep the two consistent.\nWhen NOT to use: do not put what the choice decides in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key for the selected option's value. Omit when the group should\nnot contribute a form entry.\nWhen NOT to use: do not put `name` on `ki-radio` options; their internal\nnative inputs are intentionally unnamed.";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires one selected option for form submission. The group uses platform\n`valueMissing` from its internal native radio inputs.\nWhen NOT to use: do not use required when no answer is acceptable.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm"];
          readonly description: "Token-backed size of every `ki-radio` the group holds: the circle is 18\nor 20px in onmars, and `sm` takes the smaller option label (13/20, 8px\naway). The group decides for all its options; the group's own label,\nhelp and error keep their size. An unrecognized value matches no style\nrule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around the group.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Projection of the current selection. The initial attribute selects the\nfirst matching option; unmatched values leave the group unselected and\noperable. Assigning the property updates selection silently.\nWhen NOT to use: never author selection on `ki-radio`; set this value.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "`ki-radio` options. Document order is navigation order.";
      };
      readonly tag: "ki-radio-group";
      readonly whenNotToUse: "many options or tight space (use `ki-select`), independent\non/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or\nauthored selection on options; set this group's `value` instead.";
      readonly whenToUse: "a person must choose exactly one of a small set of mutually\nexclusive options that should all be visible at once.";
    };
    readonly "ki-rating": {
      readonly description: "Displays a score or collects one choice on a small rating scale.";
      readonly events: {
        readonly "ki-change": "Fires once when a person changes the selection. The detail contains the numeric value.";
      };
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Makes an editable rating unavailable and excludes it from form submission.";
          readonly default: false;
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Lucide icon name. Import custom names before mounting. Unavailable names use star.";
          readonly default: "star";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible question in input mode and accessible context in read-only mode. Always supply it.";
          readonly required: true;
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Highest score and number of glyphs. Use a whole number from 1 to 10.";
          readonly default: 5;
          readonly minimum: 1;
          readonly maximum: 10;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form field name for a selected editable score.";
        };
        readonly "option-label": {
          readonly type: "string";
          readonly description: "Accessible name pattern for the other choices. Use {value} for the choice.";
          readonly default: "{value} stars";
        };
        readonly "option-singular-label": {
          readonly type: "string";
          readonly description: "Accessible name pattern for the one-star choice. Use {value} for the choice.";
          readonly default: "{value} star";
        };
        readonly precision: {
          readonly type: "number";
          readonly description: "Choose 1 for whole steps or 0.5 for half steps. Other inputs use whole steps.";
          readonly default: 1;
        };
        readonly "rated-label": {
          readonly type: "string";
          readonly description: "Accessible name pattern for the read-only image. Use {value} and {max} for the scores.";
          readonly default: "Rated {value} out of {max}";
        };
        readonly readonly: {
          readonly type: "boolean";
          readonly description: "Displays a score without editing or submitting it.";
          readonly default: false;
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires an editable score before the form can be submitted.";
          readonly default: false;
        };
        readonly "required-message": {
          readonly type: "string";
          readonly description: "Validation message for an unanswered required rating.";
          readonly default: "Select a rating.";
        };
        readonly "score-label": {
          readonly type: "string";
          readonly description: "Visible score pattern in input mode. Use {value} and {max} for the scores.";
          readonly default: "{value} of {max}";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Current score. Zero means unanswered in input mode. Editable scores use\nthe nearest allowed step. Read-only scores retain their decimal precision.";
          readonly default: 0;
          readonly minimum: 0;
          readonly maximum: 10;
        };
      };
      readonly slots: {};
      readonly tag: "ki-rating";
      readonly whenNotToUse: "Use message actions for yes/no feedback and a slider for a\ncontinuous or large numeric range.";
      readonly whenToUse: "Show an average review score in readonly mode or ask people to rate\nan answer, experience, or product on a small scale.";
    };
    readonly "ki-reasoning": {
      readonly description: "A disclosure for the assistant's progress or plan, with a localized summary.";
      readonly events: {
        readonly "ki-toggle": "Emitted after a native disclosure toggle. Setting open from the application is silent.";
      };
      readonly props: {
        readonly "done-label": {
          readonly type: "string";
          readonly description: "Summary text when done and elapsed time is unavailable.";
          readonly default: "Thought";
        };
        readonly duration: {
          readonly type: "number";
          readonly description: "Optional elapsed milliseconds. Done displays finite, nonnegative values rounded to seconds.";
        };
        readonly "duration-label": {
          readonly type: "string";
          readonly description: "Summary template for zero or multiple elapsed seconds. The {seconds} placeholder receives the rounded time.";
          readonly default: "Thought for {seconds} seconds";
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the disclosure shows its steps. Native toggles update this reflected property.";
          readonly default: false;
        };
        readonly "singular-duration-label": {
          readonly type: "string";
          readonly description: "Summary template for one elapsed second. The {seconds} placeholder receives the rounded time.";
          readonly default: "Thought for {seconds} second";
        };
        readonly status: {
          readonly type: "enum";
          readonly values: readonly ["done", "thinking"];
          readonly description: "Use thinking while steps arrive and done once the assistant finishes.";
          readonly default: "thinking";
        };
        readonly "thinking-label": {
          readonly type: "string";
          readonly description: "Summary text while the assistant is thinking.";
          readonly default: "Thinking…";
        };
      };
      readonly slots: {
        readonly "": "Supporting content shown when expanded, such as an ordered list of steps supplied by the application.";
      };
      readonly tag: "ki-reasoning";
      readonly whenNotToUse: "hide the answer or controls the user needs to complete a task. Use a general disclosure for unrelated content.";
      readonly whenToUse: "present assistant-supplied steps, progress or a completed plan alongside the answer.";
    };
    readonly "ki-relative-time": {
      readonly description: "Displays the elapsed or remaining time for a timestamp in the reader's language.";
      readonly events: {};
      readonly props: {
        readonly date: {
          readonly type: "string";
          readonly description: "ISO calendar date or date-time. A timestamp without an offset uses local time.";
        };
        readonly numeric: {
          readonly type: "enum";
          readonly values: readonly ["always", "auto"];
          readonly description: "Auto can show words such as yesterday. Always uses a number.";
          readonly default: "auto";
        };
        readonly sync: {
          readonly type: "boolean";
          readonly description: "Refresh the visible wording as the clock crosses a formatting boundary.";
          readonly default: false;
        };
        readonly threshold: {
          readonly type: "number";
          readonly description: "Display an absolute timestamp when the distance reaches this many seconds.\nOmit to keep relative wording at any distance.";
          readonly minimum: 0;
        };
      };
      readonly slots: {};
      readonly tag: "ki-relative-time";
      readonly whenNotToUse: "For an interactive countdown or a date that should always show an absolute value.";
      readonly whenToUse: "For timestamps whose distance from the present matters, such as timeline entries or recent changes.";
    };
    readonly "ki-scroller": {
      readonly description: "A bounded scroll container that clips its content along one declared axis\nand replaces platform scrollbar chrome with a token-resolved indicator.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the scroll region (\"Release notes\", \"Chat\nmessages\"). Assistive technology receives a `region` with this name\nwhose slotted content keeps its own semantics (FR-006). Documented as\nrequired: a scroller without a label renders but exposes no accessible\nname and fails the accessibility audit (015-ki-progress precedent).\nThe label is never rendered visually.";
          readonly required: true;
        };
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Declared scroll axis, mapping the design source's `Type` axis:\n`vertical` (default) scrolls the block axis, `horizontal` the inline\naxis. One axis per instance; the cross axis clips. A structural axis,\nnever appearance — thickness, shape and colors of the indicator are\nper-theme `--ki-scroller-*` tokens. An unrecognized value matches no\nstyle selector and no `horizontal` code path, so the scroller keeps\nthe default vertical behavior (fallback by CSS construction plus a\nsingle strict comparison — no validation code, FR-002/FR-009).";
          readonly default: "vertical";
        };
      };
      readonly slots: {
        readonly "": "The scrollable content: it keeps its own semantics and sizes the scroll extent along the declared axis.";
      };
      readonly tag: "ki-scroller";
      readonly whenNotToUse: "page-level scrolling (the browser's job), carousels or\npaginated media (ki-carousel with ki-indicator), virtualized long\ncollections, multi-column tabular data, or nesting scrollers (v1\nguarantees a single scroll axis per region). Cross-axis overflow is an\nauthoring mistake: the scroller scrolls its declared axis only and clips\nthe other — wrap or size content on the cross axis.";
      readonly whenToUse: "a bounded region inside a view whose content can outgrow it:\nchat or message panes, code and log blocks, tag rows, sidebar navigation,\ntall menus inside cards. Give it bounds (its size comes entirely from your\nlayout) and a `label` (required: the accessible name of the scroll\nregion). Scrolling stays native — wheel, touch, keyboard and indicator\ndrag operate the viewport directly.";
    };
    readonly "ki-search": {
      readonly description: "A query field with a responsive view for suggestions, recent searches and results.";
      readonly events: {
        readonly "ki-clear": "The user cleared the query with the clear control or with Escape.";
        readonly "ki-input": "The current query after 200 ms of inactivity following an edit.";
        readonly "ki-remove-recent": "The removed recent query. Hosts can use this to persist the updated history.";
        readonly "ki-search": "The query to run, emitted on Enter or activation of a suggestion or recent search.";
      };
      readonly props: {
        readonly "back-label": {
          readonly type: "string";
          readonly description: "Accessible name of the full-screen Back button.";
          readonly default: "Back";
        };
        readonly "clear-label": {
          readonly type: "string";
          readonly description: "Accessible name of the query clear button.";
          readonly default: "Clear search";
        };
        readonly highlight: {
          readonly type: "boolean";
          readonly description: "Emphasize literal, case-insensitive matches in suggestion titles.";
          readonly default: true;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the search landmark, input and full-screen dialog.";
          readonly default: "Search";
        };
        readonly loading: {
          readonly type: "boolean";
          readonly description: "Show a loading indicator while the host fetches suggestions.";
          readonly default: false;
        };
        readonly "loading-label": {
          readonly type: "string";
          readonly description: "Accessible name of the loading indicator.";
          readonly default: "Loading suggestions";
        };
        readonly mode: {
          readonly type: "enum";
          readonly values: readonly ["auto", "docked", "fullscreen"];
          readonly description: "View presentation. Auto uses a full-screen dialog below 600 CSS pixels.";
          readonly default: "auto";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Name under which the current query is included in form data.";
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the search view is open. The field opens it on focus, click or input.";
          readonly default: false;
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Optional hint displayed inside the empty search field.";
          readonly default: "";
        };
        readonly "recent-label": {
          readonly type: "string";
          readonly description: "Visible and accessible name of the recent-search group.";
          readonly default: "Recent searches";
        };
        readonly "remove-recent-label": {
          readonly type: "string";
          readonly description: "Accessible name template for recent-query removal. Use {value} for the query title.";
          readonly default: "Remove {value}";
        };
        readonly "suggestion-count-plural": {
          readonly type: "string";
          readonly description: "Polite announcement for zero or multiple suggestions. Use {count} for the number.";
          readonly default: "{count} suggestions";
        };
        readonly "suggestion-count-singular": {
          readonly type: "string";
          readonly description: "Polite announcement when the list contains one suggestion.";
          readonly default: "1 suggestion";
        };
        readonly "suggestions-label": {
          readonly type: "string";
          readonly description: "Accessible name of the suggestion listbox.";
          readonly default: "Suggestions";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Current query. Edits and selected suggestions update this property.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-search-suggestion children supply suggestion and recent-query data.";
        readonly leading: "A control or decorative icon at the start of the collapsed or docked bar.";
        readonly results: "Host-rendered results beneath suggestions and recent searches.";
        readonly trailing: "A control or avatar at the end of the collapsed or docked bar. Supply\na labelled button here to surface voice search.";
      };
      readonly tag: "ki-search";
      readonly whenNotToUse: "selecting one value from a fixed set belongs in ki-select.\nUse ki-input when a plain search field is enough.";
      readonly whenToUse: "accept free-text searches and let the user run a typed or suggested\nquery. Listen for ki-input to update suggestions, and ki-search to render results.";
    };
    readonly "ki-search-suggestion": {
      readonly description: "Declarative search suggestion or recent query rendered by its owning ki-search.";
      readonly events: {};
      readonly props: {
        readonly description: {
          readonly type: "string";
          readonly description: "Optional supporting text displayed below the title.";
        };
        readonly recent: {
          readonly type: "boolean";
          readonly description: "Display in the removable recent-search group.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Query to run. When omitted, the trimmed title is used.";
        };
      };
      readonly slots: {
        readonly "": "Plain text title displayed in the owning search view.";
      };
      readonly tag: "ki-search-suggestion";
      readonly whenNotToUse: "standalone display, form options or arbitrary results content.\nUse the results slot of ki-search for independently rendered results.";
      readonly whenToUse: "supply one suggested or recent query as a direct ki-search child.";
    };
    readonly "ki-segment": {
      readonly description: "A single choice in a ki-segmented-control.";
      readonly events: {};
      readonly props: {
        readonly "aria-label": {
          readonly type: "string";
          readonly description: "Accessible name of an icon-only option. An enabled icon-only option also\nshows this name on focus and hover when ki-tooltip is registered. The\nloader defines the tooltip when the segment draws it. For a text option,\nuse the visible label.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Excludes the option from selection and keyboard navigation.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Required nonempty option identifier. Each value must be unique in its group.";
          readonly required: true;
        };
      };
      readonly slots: {
        readonly "": "Noninteractive visible option label. A label wider than its share of\nthe row wraps onto a second line and every option of the row keeps one\nheight; text that would need a third line ends with an ellipsis, and the\nfull text stays the option's accessible name. Keep it to a few words.";
        readonly start: "Decorative leading icon. Supply aria-label for an icon-only option.";
      };
      readonly tag: "ki-segment";
      readonly whenNotToUse: "standalone, for navigation, or for form submission.";
      readonly whenToUse: "offer one mutually exclusive choice with text or a named icon.";
    };
    readonly "ki-segmented-control": {
      readonly description: "A compact control for one in-place choice among two to five options.";
      readonly events: {
        readonly "ki-change": "Emitted once per changed user choice with the new resolved value.";
      };
      readonly props: {
        readonly "full-width": {
          readonly type: "boolean";
          readonly description: "Distribute the available inline space evenly among all segments. A label\nwider than its equal share wraps onto a second line.";
          readonly default: false;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Required accessible name of the group. Use a short name for the setting.";
          readonly required: true;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["md", "sm", "xs"];
          readonly description: "Track size. The default heights are 28, 32 and 40 CSS px respectively;\nsurrounding density settings can increase or decrease targets.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Resolved selected value. Set it to choose an option programmatically.\nOmit it to select the first available option. The value is empty when\nthere are no available options. Programmatic changes are silent.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "Two to five direct ki-segment children with distinct nonempty values.";
      };
      readonly tag: "ki-segmented-control";
      readonly whenNotToUse: "switching between panels (ki-tabs), submitted form choices\n(ki-radio-group), or more than five options (ki-select).";
      readonly whenToUse: "apply a chart range, view mode, or another immediate setting.";
    };
    readonly "ki-select": {
      readonly description: "A form-associated select-only combobox for choosing one option from\ndeclarative `ki-option` children.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired once after the user commits a different option, composed\nacross the shadow boundary and preceded by `input`; `value` is already\ncurrent when listeners run. When to use: react to the committed choice.\nWhen NOT to use: do not expect it for programmatic `value` writes, which\nare silent.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted choice (\"We do not ship there\"). While it holds text the select\nis invalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting when the person\nchooses another option, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for a `required` select left without a\nchoice; `error-text` words that. Setting the same text again while the\nprop still holds it shows nothing: remove it first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents opening, removes the trigger from keyboard reach, and excludes\nthe select from form submission.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message shown in place of the help text once a `required` select is left\nwithout a choice, and its `validationMessage` (\"Choose a country\").\nWithout it the browser's own message shows, in the browser's language. An\nerror set with `custom-error` or `setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the trigger, read with it as the combobox\ndescription: what the choice decides. While an error shows, the error\ntakes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label and accessible-name source for the combobox trigger.\nWhen NOT to use: do not omit it; unlabeled selects are invalid usage.";
          readonly required: true;
        };
        readonly "label-hint": {
          readonly type: "string";
          readonly description: "Short text shown after the label and read with it as part of the\ncombobox name, so people know before submitting whether to choose:\n\"(optional)\" on the few optional fields of a mostly required form, or\n\"(required)\" the other way round, in the page's own language. It changes\nno validation; set `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions in it (use `help-text`), errors\n(use `error-text`), or a repeat of the label.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key used when a selected option contributes its value.\nWhen NOT to use: omit it when the select should not submit data.";
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Text shown while no option is selected.\nWhen NOT to use: do not use it as a replacement for `label`.";
          readonly default: "";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires a non-empty submitted value. The platform validation message is\ndonated by a hidden native select.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed trigger size (`--ki-select-{size}-*` tokens): the trigger is\n24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and\nindicator; the label and help text follow in three steps. The listbox\nand its options keep their size. An unrecognized value matches no style\nrule and keeps the medium metrics.\nWhen to use: match the size of the fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Live projection of the selected option value, or `\"\"` when unselected.\nAssigning it selects the first matching option silently; the attribute is\nthe reset/default declaration and is not updated by user commits.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "`ki-option` data children. They do not paint; rows are mirrored.";
      };
      readonly tag: "ki-select";
      readonly whenNotToUse: "`ki-radio-group` for a few always-visible choices,\n`ki-input` for free or searchable text, `ki-checkbox`/`ki-switch` for\nbinary decisions, or multiselect and command menus.";
      readonly whenToUse: "choose exactly one value from a known closed list, especially\nwhen there are roughly five or more choices or space is limited.";
    };
    readonly "ki-sidebar": {
      readonly description: "Side navigation with an expanded panel and an optional icon rail.";
      readonly events: {
        readonly "ki-sidebar-change": "Reports the new collapsed state after a user toggle. Programmatic writes are silent.";
      };
      readonly props: {
        readonly "collapse-label": {
          readonly type: "string";
          readonly description: "Accessible toggle name while the sidebar is expanded.";
          readonly default: "Collapse sidebar";
        };
        readonly collapsed: {
          readonly type: "boolean";
          readonly description: "Display the icon rail. May also be assigned by the application.";
          readonly default: false;
        };
        readonly collapsible: {
          readonly type: "boolean";
          readonly description: "Show the expand and collapse control.";
          readonly default: false;
        };
        readonly "expand-label": {
          readonly type: "string";
          readonly description: "Accessible toggle name while the sidebar is collapsed.";
          readonly default: "Expand sidebar";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the navigation landmark.";
          readonly default: "Main";
        };
      };
      readonly slots: {
        readonly "": "Navigation routes and groups, in reading order.";
        readonly brand: "Presentational brand content for the expanded panel.";
        readonly footer: "Account trigger or other app-owned content available in both modes.";
      };
      readonly tag: "ki-sidebar";
      readonly whenNotToUse: "for a few destinations, use top navigation. For mobile\nnavigation, use a mobile navigation pattern or a drawer.";
      readonly whenToUse: "navigate more than five top-level destinations or organize\napplication destinations in named groups.";
    };
    readonly "ki-sidebar-group": {
      readonly description: "A named list of routes within sidebar navigation.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Visible group heading and accessible name of the nested list.";
          readonly required: true;
        };
      };
      readonly slots: {
        readonly "": "One or more ki-sidebar-item routes.";
      };
      readonly tag: "ki-sidebar-group";
      readonly whenNotToUse: "as a destination or outside ki-sidebar.";
      readonly whenToUse: "give related sidebar destinations a common heading.";
    };
    readonly "ki-sidebar-item": {
      readonly description: "One destination in a sidebar.";
      readonly events: {};
      readonly props: {
        readonly count: {
          readonly type: "number";
          readonly description: "Positive unread count. Fractional values round down.";
        };
        readonly "count-label": {
          readonly type: "string";
          readonly description: "Accessible count template, using the {label} and {count} placeholders.";
          readonly default: "{label}, {count} new";
        };
        readonly current: {
          readonly type: "boolean";
          readonly description: "Mark this destination as the current page.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Destination resolved by a native link. Omit for a static row.";
          readonly format: "url";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Name of a registered Lucide glyph. Import its per-icon entry point first.";
        };
      };
      readonly slots: {
        readonly "": "The destination name as text or static inline content.";
        readonly start: "One decorative icon that overrides icon-name.";
      };
      readonly tag: "ki-sidebar-item";
      readonly whenNotToUse: "for commands, nested controls, or standalone links outside the sidebar.";
      readonly whenToUse: "link to a named destination in ki-sidebar or ki-sidebar-group.\nRegister ki-tooltip once when using direct component imports for a rail.";
    };
    readonly "ki-skeleton": {
      readonly description: "Decorative placeholder shapes that reserve space for loading content.";
      readonly events: {};
      readonly props: {
        readonly animated: {
          readonly type: "boolean";
          readonly description: "Sweep a highlight while the user permits motion. Set false to use a static\nplaceholder. Shimmer also stops under reduced motion and forced colours.";
          readonly default: true;
        };
        readonly "block-size": {
          readonly type: "string";
          readonly description: "CSS length for the block axis. For text, this is the height of each line.\nUse it to reserve the height of the content that will replace the shape.";
        };
        readonly "inline-size": {
          readonly type: "string";
          readonly description: "CSS length for the inline axis. Use it to match a fixed content width.\nText and rectangles otherwise fill available inline space.";
        };
        readonly lines: {
          readonly type: "number";
          readonly description: "Number of text lines. Use a whole number from 1 to 20 for the expected\nparagraph length. Extra lines are ignored for circles and rectangles.";
          readonly default: 1;
          readonly minimum: 1;
          readonly maximum: 20;
        };
        readonly shape: {
          readonly type: "enum";
          readonly values: readonly ["circle", "rect", "text"];
          readonly description: "Match the placeholder to the expected text, avatar, or rectangular content.";
          readonly default: "text";
        };
        readonly size: {
          readonly type: "string";
          readonly description: "CSS length shared by both axes. Use it for circles or square blocks.\nAn axis-specific override takes precedence.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-skeleton";
      readonly whenNotToUse: "For a standalone loading announcement, progress measurement,\nor interactive control. Put content and loading feedback in the caller's region.";
      readonly whenToUse: "Reserve the expected layout of a card, list, or assistant reply\nwhile it loads. Give the surrounding region an accessible name and set\nits aria-busy state. Show the skeleton after about 300 ms of waiting.";
    };
    readonly "ki-slider": {
      readonly description: "Adjusts a value or an interval on a bounded scale.";
      readonly events: {
        readonly change: "Bubbles once when a pointer operation commits a different\nselection or a keyboard action changes it. Read the current host value.\nFor updates during a drag, listen for the standard bubbling `input` event.\nProgrammatic updates and form resets are silent.";
      };
      readonly props: {
        readonly centered: {
          readonly type: "boolean";
          readonly description: "Shows a midpoint tick and fills from that point to a single thumb.";
          readonly default: false;
        };
        readonly currency: {
          readonly type: "string";
          readonly description: "ISO 4217 code used with currency format.";
          readonly default: "EUR";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Makes the slider unavailable for pointer, keyboard and form submission.";
          readonly default: false;
        };
        readonly format: {
          readonly type: "enum";
          readonly values: readonly ["currency", "number", "percent"];
          readonly description: "Display format for the readout and accessible values.";
          readonly default: "number";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Optional supporting text, read as the description of each thumb.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible base name. Use a task-specific, localized label.";
          readonly default: "Slider";
        };
        readonly marks: {
          readonly type: "number";
          readonly description: "Number of evenly spaced tick intervals, up to 100. Zero hides ticks.";
          readonly default: 0;
          readonly minimum: 0;
          readonly maximum: 100;
        };
        readonly max: {
          readonly type: "number";
          readonly description: "Inclusive upper bound. A maximum below min collapses the scale.";
          readonly default: 100;
        };
        readonly "maximum-label": {
          readonly type: "string";
          readonly description: "Localized suffix for the upper thumb's accessible name.";
          readonly default: "maximum";
        };
        readonly min: {
          readonly type: "number";
          readonly description: "Inclusive lower bound and step origin.";
          readonly default: 0;
        };
        readonly "minimum-label": {
          readonly type: "string";
          readonly description: "Localized suffix for the lower thumb's accessible name.";
          readonly default: "minimum";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Native form key. Omit when the value should remain local to the control.";
        };
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Axis of the scale. A vertical scale increases towards the top.";
          readonly default: "horizontal";
        };
        readonly range: {
          readonly type: "boolean";
          readonly description: "Enables two non-crossing thumbs in minimum then maximum tab order.";
          readonly default: false;
        };
        readonly step: {
          readonly type: "number";
          readonly description: "Positive increment. Values snap from min and max is always reachable.";
          readonly default: 1;
        };
        readonly value: {
          readonly type: "number-or-string";
          readonly description: "Current selection as a number or, in range mode, a comma-separated pair.\nHTML attributes also accept the scalar as numeric text. Defaults to min\nfor one thumb and to both bounds for a range. User updates are normalized.";
        };
      };
      readonly slots: {};
      readonly tag: "ki-slider";
      readonly whenNotToUse: "when people need to enter exact numbers or choose among a\nfew named options. Use a number input or radio group for those tasks.";
      readonly whenToUse: "coarse adjustments such as volume, balance or a price filter,\nwith a descriptive label.";
    };
    readonly "ki-source": {
      readonly description: "Declares one named web source for a `ki-sources` list.";
      readonly events: {};
      readonly props: {
        readonly href: {
          readonly type: "string";
          readonly description: "Source destination. Accepts HTTP(S) URLs and relative web references.\nThe source list shows the resolved hostname.";
          readonly required: true;
          readonly format: "url";
        };
        readonly snippet: {
          readonly type: "string";
          readonly description: "Optional plain-text excerpt displayed in the source card.";
        };
        readonly "source-id": {
          readonly type: "string";
          readonly description: "Source identifier in this document or shadow root. Overrides the native\nHTML `id` when set. Use this value in guarded specs and in citation refs.";
        };
        readonly title: {
          readonly type: "string";
          readonly description: "Required plain-text source title. In HTML use the `title` attribute.";
          readonly required: true;
        };
      };
      readonly slots: {};
      readonly tag: "ki-source";
      readonly whenNotToUse: "For standalone links outside a source list; use `ki-link`.";
      readonly whenToUse: "As a direct child of `ki-sources`. In HTML provide an `id`,\n`href` and `title`; in guarded specs provide `source-id`, `href` and\n`title`. Use the same identifier on any citation of the source.";
    };
    readonly "ki-sources": {
      readonly description: "A disclosure with the ordered sources behind an answer.";
      readonly events: {};
      readonly props: {
        readonly open: {
          readonly type: "boolean";
          readonly description: "Whether the disclosure is expanded. Set to show the list initially.";
          readonly default: false;
        };
        readonly "source-count-label": {
          readonly type: "string";
          readonly description: "Localized summary when there is one source. Use `{count}` for its number.";
          readonly default: "{count} source";
        };
        readonly "sources-count-label": {
          readonly type: "string";
          readonly description: "Localized summary for multiple sources. Use `{count}` for their number.";
          readonly default: "{count} sources";
        };
      };
      readonly slots: {
        readonly "": "Direct `ki-source` definitions for this answer.";
      };
      readonly tag: "ki-sources";
      readonly whenNotToUse: "For ordinary navigation, unrelated links, or form controls.";
      readonly whenToUse: "To show the evidence behind an answer. Add direct `ki-source`\nchildren and place `ki-citation` markers next to the claims they support.";
    };
    readonly "ki-spinner": {
      readonly description: "A compact status for an indeterminate wait.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Localized name of the ongoing activity, such as \"Saving changes\".\nSupply a meaningful label for every spinner, even when the text is hidden.\nUse the activity's name whenever it can be more specific than \"Loading\".";
          readonly required: true;
        };
        readonly "show-label": {
          readonly type: "boolean";
          readonly description: "Display the label beside the graphic when sighted users also need the\nactivity description. The same text names the status in either case.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm"];
          readonly description: "Diameter of the ring. Choose the size that fits the surrounding content.\nDots use a fixed size. Unrecognized values draw the medium ring.";
          readonly default: "md";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["dots", "ring"];
          readonly description: "Use a ring for general inline activity and dots for assistant typing or\nthinking. Unrecognized values draw a ring.";
          readonly default: "ring";
        };
      };
      readonly slots: {};
      readonly tag: "ki-spinner";
      readonly whenNotToUse: "use ki-progress for page-level work or a known fraction of\na task. Use ki-alert for persistent notices.";
      readonly whenToUse: "show brief inline activity such as saving a change or running a\ntool. Choose typing dots for an assistant that is thinking. Set a localized\nlabel that names the activity and mount the spinner when the wait starts.";
    };
    readonly "ki-stack": {
      readonly description: "A passive flex layout for content on one axis.";
      readonly events: {};
      readonly props: {
        readonly align: {
          readonly type: "enum";
          readonly values: readonly ["baseline", "center", "end", "start", "stretch"];
          readonly description: "Cross-axis alignment, stretch by default.";
          readonly default: "stretch";
        };
        readonly direction: {
          readonly type: "enum";
          readonly values: readonly ["column", "row"];
          readonly description: "Main axis, column by default.";
          readonly default: "column";
        };
        readonly gap: {
          readonly type: "enum";
          readonly values: readonly ["10xl", "11xl", "12xl", "13xl", "14xl", "15xl", "16xl", "17xl", "18xl", "19xl", "20xl", "21xl", "22xl", "23xl", "24xl", "25xl", "26xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "lg", "md", "sm", "xl", "xs", "xxs", "zero"];
          readonly description: "Kimen spacing step, md by default. Unsupported values keep the default gap.";
          readonly default: "md";
        };
        readonly justify: {
          readonly type: "enum";
          readonly values: readonly ["between", "center", "end", "start"];
          readonly description: "Main-axis distribution, start by default. Use between to distribute spare space.";
          readonly default: "start";
        };
        readonly wrap: {
          readonly type: "boolean";
          readonly description: "Allow items to continue on a new line. Defaults to false.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "The content in reading order. A direct child with data-grow takes a share of free space.";
      };
      readonly tag: "ki-stack";
      readonly whenNotToUse: "for page shells, painted grouping (use ki-card), or tabular data.";
      readonly whenToUse: "arrange content in a vertical sequence or a horizontal row with\nconsistent token spacing.";
    };
    readonly "ki-stat": {
      readonly description: "A key metric with an optional comparison against a reference period.";
      readonly events: {};
      readonly props: {
        readonly delta: {
          readonly type: "number";
          readonly description: "Optional finite change. Its sign determines the trend and its magnitude is displayed.";
        };
        readonly "delta-label": {
          readonly type: "string";
          readonly description: "Localized comparison period, such as \"vs last week\".";
        };
        readonly direction: {
          readonly type: "enum";
          readonly values: readonly ["higher-is-better", "lower-is-better", "neutral"];
          readonly description: "Which direction is favorable for this metric. Use neutral to avoid a judgment.";
          readonly default: "higher-is-better";
        };
        readonly "down-label": {
          readonly type: "string";
          readonly description: "Localized spoken direction for a negative delta.";
          readonly default: "down";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Localized name of the metric, such as \"Median render time\".";
          readonly required: true;
        };
        readonly unit: {
          readonly type: "string";
          readonly description: "Literal suffix for decimal readings, such as \"ms\".";
        };
        readonly "up-label": {
          readonly type: "string";
          readonly description: "Localized spoken direction for a positive delta.";
          readonly default: "up";
        };
        readonly value: {
          readonly type: "number";
          readonly description: "Current finite reading.";
          readonly required: true;
        };
      };
      readonly slots: {
        readonly chart: "An optional sparkline after the summary. Give informative\ncharts a textual equivalent, and hide charts that repeat the summary.";
      };
      readonly tag: "ki-stat";
      readonly whenNotToUse: "Present a sequence of readings or inspect multiple data\npoints. Use a chart or table with a text equivalent for that data.";
      readonly whenToUse: "Summarize one numeric metric in a dashboard or report. Set\ndirection to lower-is-better for metrics such as latency and neutral for\nchanges that carry no favorable or unfavorable meaning.";
    };
    readonly "ki-status": {
      readonly description: "A tiny, non-interactive status dot that marks the state of a nearby item.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the state (\"Online\", \"Build failing\"). With a\nlabel the dot is exposed to assistive technology as a named\nnon-interactive image (role `img`); without one it is decorative and\ncontributes nothing to the accessibility tree — the meaning must then\nlive in adjacent visible text (FR-003, FR-008). The label is never\nrendered visually: visible status text belongs to ki-badge. Runtime\nchanges are not announced (no live region, FR-005).";
        };
        readonly ring: {
          readonly type: "boolean";
          readonly description: "Draws a separating ring around the dot for placement over media (an\navatar photo), keeping it distinguishable from the pixels beneath. A\nper-instance functional axis — MarsUI ships Outline=True|False as\nsibling variants under one theme (recorded deviation from the 002\ntoken-only rule) — while ring width and color stay per-theme\n`--ki-status-ring-*` tokens. The ring paints outside the dot's box and\nnever shifts layout.";
          readonly default: false;
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "success", "warning"];
          readonly description: "Semantic intent, never appearance: each tone resolves its fill from\nthe per-theme `--ki-status-{tone}-color` tokens. An unrecognized value\nmatches no style selector, so the dot keeps the neutral appearance\n(fallback by CSS construction — no validation code, FR-007).";
          readonly default: "neutral";
        };
      };
      readonly slots: {};
      readonly tag: "ki-status";
      readonly whenNotToUse: "short labeled status text (that pill is ki-badge — this dot\nnever renders text), notification counters or the overlay attachment\nmechanism (a future, separate nav-badge concern), messages that need\nattention or announcement (ki-alert — the dot has no live region),\nprogress or loading (ki-progress). An unlabeled dot without adjacent\nvisible text is an authoring mistake (WCAG 1.4.1).";
      readonly whenToUse: "mark a state with minimal footprint adjacent to (or overlaid\non) the item it describes: presence on an avatar, health of a service\nlist entry, connection state in a toolbar. Label it (`label`) or pair it\nwith adjacent visible text — color is never the only carrier of the\nmeaning (WCAG 1.4.1).";
    };
    readonly "ki-step": {
      readonly description: "One authored step in a Stepper.";
      readonly events: {};
      readonly props: {
        readonly description: {
          readonly type: "string";
          readonly description: "Optional supporting text displayed below the label.";
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Destination for a completed step. Omit for a passive step.";
          readonly format: "url";
        };
        readonly state: {
          readonly type: "enum";
          readonly values: readonly ["current", "done", "error", "upcoming"];
          readonly description: "The step's progress state. Mark the active step as current.";
          readonly default: "upcoming";
        };
      };
      readonly slots: {
        readonly "": "The visible label. Use text or passive inline markup.";
      };
      readonly tag: "ki-step";
      readonly whenNotToUse: "Standalone or with interactive content in the label.\nA completed step can make the label itself a link.";
      readonly whenToUse: "Place directly inside ki-stepper in task order. Its default slot\nis the step label and its properties describe the step to the owning list.";
    };
    readonly "ki-stepper": {
      readonly description: "An ordered, responsive view of progress through named steps.";
      readonly events: {};
      readonly props: {
        readonly "count-label": {
          readonly type: "string";
          readonly description: "Compact disclosure text without a current step. Include {total}.";
          readonly default: "Steps ({total})";
        };
        readonly "current-label": {
          readonly type: "string";
          readonly description: "Localized text for the current step.";
          readonly default: "Current";
        };
        readonly "done-label": {
          readonly type: "string";
          readonly description: "Localized text for a completed step.";
          readonly default: "Completed";
        };
        readonly "error-label": {
          readonly type: "string";
          readonly description: "Localized text for a step that has an error.";
          readonly default: "Error";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the list. Use a localized description of the task.";
          readonly required: true;
        };
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Use vertical for a stacked list. Horizontal layout compacts below 22rem.";
          readonly default: "horizontal";
        };
        readonly "summary-label": {
          readonly type: "string";
          readonly description: "Compact disclosure text. Place {current} and {total} in the local order.";
          readonly default: "Step {current} of {total}";
        };
        readonly "upcoming-label": {
          readonly type: "string";
          readonly description: "Localized text for an upcoming step.";
          readonly default: "Not started";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-step children in task order. The stepper assigns each\nchild to its row automatically.";
      };
      readonly tag: "ki-stepper";
      readonly whenNotToUse: "A percentage or indeterminate task, a carousel position,\nor navigation among peer views. The task owner updates step states.";
      readonly whenToUse: "Show the current place in onboarding, checkout or a wizard.\nProvide a label and direct ki-step children in task order.";
    };
    readonly "ki-suggestion": {
      readonly description: "A native prompt button displayed by a ki-suggestions group.";
      readonly events: {};
      readonly props: {
        readonly description: {
          readonly type: "string";
          readonly description: "Optional accessible description, visible below the title in cards.";
        };
      };
      readonly slots: {
        readonly "": "Plain text forming the visible and accessible prompt title.";
      };
      readonly tag: "ki-suggestion";
      readonly whenNotToUse: "navigation, static content, or a submitted form value.";
      readonly whenToUse: "offer one short, actionable prompt in a suggestion group.";
    };
    readonly "ki-suggestions": {
      readonly description: "A labelled group of prompt starters or follow-up suggestions.";
      readonly events: {
        readonly "ki-select": "Reports the chosen prompt title. Use this event to send the prompt in\nsend mode. Cancel it to take over the default composer write and focus.";
      };
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Required accessible name for the group.";
          readonly required: true;
        };
        readonly mode: {
          readonly type: "enum";
          readonly values: readonly ["fill", "send"];
          readonly description: "Send through the application or fill its attached editor for revision.";
          readonly default: "send";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["cards", "chips"];
          readonly description: "Wrapping chips for follow-ups or cards with room for a description.";
          readonly default: "chips";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-suggestion children in reading order.";
      };
      readonly tag: "ki-suggestions";
      readonly whenNotToUse: "choose a form value, switch views, or display static example text.";
      readonly whenToUse: "offer suggested prompts to start or continue an assistant conversation.";
    };
    readonly "ki-switch": {
      readonly description: "A token-styled switch for immediate on/off settings.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired once after a user toggle commits, composed across the shadow\nboundary; `checked` is already current when listeners run. `click()` from a\nscript, or a page `<label>` for the switch, toggles it like a native\ncheckbox: one `input`, then one `change`. When to use:\napply the on/off effect. When NOT to use: do not expect it for programmatic\n`checked` writes, which are silent.";
      };
      readonly props: {
        readonly checked: {
          readonly type: "boolean";
          readonly description: "Live on/off state.\nWhen to use: set the initial on state for a setting that applies\nimmediately.\nWhen NOT to use: do not use a switch for choices saved only on submit;\nuse ki-checkbox for that pattern.";
          readonly default: false;
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted setting (\"Two-step sign-in needs a phone number\"). While it\nholds text the switch is invalid, blocks its form, shows the text in\nplace of the help text at once and is announced as invalid. It stops\ncounting when the person toggles the switch, or when the form is reset,\nso it never blocks the corrected answer. It outranks an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for help that is not an error; use\n`help-text`. Setting the same text again while the prop still holds it\nshows nothing: remove it first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents toggling, removes the switch from keyboard reach, excludes it\nfrom form data, and exposes the unavailable state to assistive technology.\nWhen to use: make a setting temporarily unavailable while preserving its\ncurrent state.\nWhen NOT to use: do not use disabled for pending or loading states.";
          readonly default: false;
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the switch, read with it as its description: what\nturning it on changes.\nWhen NOT to use: do not repeat the label. A switch has no constraint of\nits own, so it takes no error text; an error the application sets with\n`custom-error` or `setCustomValidity` shows in this line's place.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key contributed while the switch is on.\nWhen to use: include the immediate setting in native form data when on.\nWhen NOT to use: omit when no form entry should be submitted.";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl"];
          readonly description: "Token-backed size: the track is 32 x 18, 40 x 22, 48 x 26 or 56 x 32px in\nonmars (`xl` is the design's mobile size), with its thumb. `sm` also takes\nthe smaller label (13/20, 8px away). An unrecognized value matches no\nstyle rule and keeps the medium metrics.\nWhen to use: match the size of the text and controls around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Form-data value submitted while on. Omit for native checkbox parity: the\nsubmitted value defaults to `on`.\nWhen to use: submit a domain-specific value instead of the default `on`.\nWhen NOT to use: do not set a value to represent off; off contributes\nnothing.";
        };
      };
      readonly slots: {
        readonly "": "Label content. This is the accessible name source.";
      };
      readonly tag: "ki-switch";
      readonly whenNotToUse: "selections collected for later form submission; use\nki-checkbox for recorded choices, ki-radio-group for mutually exclusive\nchoices, and ki-button for actions.";
      readonly whenToUse: "binary settings whose change takes effect immediately, always\nwith a slotted label.";
    };
    readonly "ki-tab": {
      readonly description: "One selectable tab inside a `ki-tabs` view switcher.";
      readonly events: {};
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Prevents selection by every modality and exposes the unavailable state.";
          readonly default: false;
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "Output-only selected state written by `ki-tabs`. Set the group's `value`\nto choose an initial tab; author-set `selected` is overwritten.";
          readonly default: false;
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Pairing identifier shared with a `ki-tab-panel`. The first tab with a\nvalue owns it; later duplicates render but are not selectable.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "Required visible text label and accessible name source.";
        readonly end: "Trailing icon or media. Follows writing direction.";
        readonly icon: "Decorative SVG. Supply visible text in the default slot.";
        readonly start: "Leading icon or media. Follows writing direction.";
      };
      readonly tag: "ki-tab";
      readonly whenNotToUse: "standalone, for form value\nselection, or for page navigation; use the parent group's `value` instead\nof authoring `selected`.";
      readonly whenToUse: "label one peer content view inside `ki-tabs`, with optional\ndecorative `icon` and `start` or `end` slot media.";
    };
    readonly "ki-tab-panel": {
      readonly description: "One content view paired with a `ki-tab` inside `ki-tabs`.";
      readonly events: {};
      readonly props: {
        readonly value: {
          readonly type: "string";
          readonly description: "Pairing identifier shared with a `ki-tab`. The first panel with a value\nowns it; duplicate or orphan panels stay hidden.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly "": "Panel content.";
      };
      readonly tag: "ki-tab-panel";
      readonly whenNotToUse: "standalone, as lazy mounting, or for page\nnavigation; orphan and duplicate panels are hidden by the parent group.";
      readonly whenToUse: "hold the content for one peer tab view, sharing `value` with\nits `ki-tab`.";
    };
    readonly "ki-table": {
      readonly description: "A scrollable frame for a native data table with optional sorting and selection.";
      readonly events: {
        readonly "ki-selection-change": "A person changes selection with a checkbox. The event supplies the selected\ndata-key values in displayed order.";
        readonly "ki-sort": "A person activates a sortable column. Use the key and direction to sort records\nand move aria-sort to the active header. The event is a request.";
      };
      readonly props: {
        readonly density: {
          readonly type: "enum";
          readonly values: readonly ["compact", "default"];
          readonly description: "Row density. Default measures 48px and compact measures 40px at a 16px root on desktop.";
          readonly default: "default";
        };
        readonly loading: {
          readonly type: "boolean";
          readonly description: "Makes the native table busy and adds a decorative loading row after the current records.";
          readonly default: false;
        };
        readonly "row-selection-label": {
          readonly type: "string";
          readonly description: "Accessible name template for each row checkbox. Include {row} for the row header or key.";
          readonly default: "Select {row}";
        };
        readonly "select-all-label": {
          readonly type: "string";
          readonly description: "Accessible name for the bulk selection checkbox. Translate for the page language.";
          readonly default: "Select all rows";
        };
        readonly selectable: {
          readonly type: "boolean";
          readonly description: "Adds a leading selection column with a checked, mixed or unchecked bulk control.\nGive each selectable body row a distinct, nonempty data-key. Register\nki-checkbox alongside ki-table when using individual component imports.";
          readonly default: false;
        };
        readonly "sticky-header": {
          readonly type: "boolean";
          readonly description: "Keeps the native column header in view inside a vertically constrained frame.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "One native light-DOM table with a caption, head and body. Use data-sort\non sortable headers and data-key on each record available for selection.";
      };
      readonly tag: "ki-table";
      readonly whenNotToUse: "Lay out a screen, show a short one-line list, or present the\nname-value details of one record. Use CSS grid, ki-list or a description list.";
      readonly whenToUse: "Show records with shared fields that people compare, scan or sort.\nSupply a native caption, column headers with scope=\"col\" and record headers\nwith scope=\"row\". Mark numeric cells with data-numeric and secondary cells\nwith data-meta. The host application supplies the native table markup.";
    };
    readonly "ki-tabs": {
      readonly description: "A tab group for switching between peer content views.";
      readonly events: {
        readonly "ki-change": "Fired once after a user-driven selection change from pointer or keyboard\nnavigation. `detail.value` is the resolved selected value and `value` is\nalready current when listeners run. Programmatic `value` writes and\nfirst-render fallback are silent.";
      };
      readonly props: {
        readonly "icon-layout": {
          readonly type: "enum";
          readonly values: readonly ["inline", "stacked"];
          readonly description: "Positions the decorative icon relative to its tab label. When omitted,\nprimary stacks the icon above the label and secondary puts it inline.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the tablist. Always provide one when multiple tab\ngroups may appear in a view. When NOT to use: do not use `label` as a\nvisible heading; render visible context in surrounding content.";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed strip size: every `ki-tab` it holds is 24, 32, 40, 48 or\n56px tall in onmars, with its text, and the gap between tabs follows.\nThe strip decides for all its tabs; a tab has no size of its own. An\nunrecognized value matches no style rule and keeps the medium metrics.\nWhen to use: match the size of the controls around the strip.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Resolved selected value. The attribute declares the initial request;\nthe live property falls back to the first enabled owner tab, or `\"\"`\nwhen no tab is selectable. Programmatic writes are silent.";
          readonly default: "";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["primary", "secondary"];
          readonly description: "Visual treatment for the group. Use one primary group per screen and\nsecondary groups within content.";
          readonly default: "primary";
        };
      };
      readonly slots: {
        readonly "": "`ki-tab` and `ki-tab-panel` children. Tabs are auto-assigned to an\ninternal named slot as managed output.";
      };
      readonly tag: "ki-tabs";
      readonly whenNotToUse: "selecting form values\n(use `ki-radio-group`), page navigation (use links), step flows, or\nstandalone `ki-tab` / `ki-tab-panel` children outside this group.";
      readonly whenToUse: "switch between small sets of peer views inside the same page,\nwith one visible panel at a time. Use primary for the screen-level group\nand secondary inside content.";
    };
    readonly "ki-textarea": {
      readonly description: "A token-styled multiline text field with native form semantics.\n\nLike a native field, it answers `checkValidity()`, `reportValidity()`,\n`setCustomValidity(message)`, `validity`, `validationMessage` and\n`willValidate` synchronously on a defined custom element.";
      readonly events: {
        readonly change: "Fired when the user commits an edited value (on blur, with native\ntextarea timing), composed across the shadow boundary; `value` is already\ncurrent when listeners run. When to use: react to a committed value. When\nNOT to use: do not use it for per-keystroke updates; the native `input`\nevent carries those.";
      };
      readonly props: {
        readonly appearance: {
          readonly type: "enum";
          readonly values: readonly ["default", "filled", "outlined"];
          readonly description: "Field appearance. `default` uses the current theme, `outlined` draws a\nfull border, and `filled` uses a tinted surface and bottom indicator.\nThe visible label stays above the field.\nWhen to use: set an explicit appearance when fields must share a shape\nacross themes.";
          readonly default: "default";
        };
        readonly autocomplete: {
          readonly type: "string";
          readonly description: "Autofill detail token forwarded to the native textarea.\nWhen to use: expose entry purpose such as `street-address` when available.\nWhen NOT to use: omit when no valid autofill purpose applies.";
        };
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted text (\"This title is taken\"). While it holds text the field is\ninvalid, blocks its form, shows the text in place of the help text at\nonce and is announced as invalid. It stops counting at the person's next\nchange of the text, or when the form is reset, so it never blocks the\ncorrected answer. It outranks `error-text` and an error set with\n`setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required` or a length limit the field\nenforces itself; `error-text` words those. Setting the same text again\nwhile the prop still holds it shows nothing: remove it first, then set it\nagain.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables editing, focus, validation and form-data contribution.\nWhen to use: make a field temporarily unavailable. When NOT to use: do not\nuse disabled for readonly review text that should submit.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Message shown in place of the help text once the person's answer fails a\nconstraint (`required` or a length limit), and the field's `validationMessage`. Say how to\nfix the answer. Without it the browser's own message shows, in the\nbrowser's language. An error set with `custom-error` or\n`setCustomValidity` outranks it.\nWhen NOT to use: do not use it for server-side or cross-field errors; set\n`custom-error` or call `setCustomValidity` for those.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "One line of help under the field, read with it as its description: what\nto write, or how long. While an error shows, the error takes its place.\nWhen NOT to use: do not repeat the label, and do not use it for error\nmessages; use `error-text`.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible label rendered by the component and used as the accessible name.\nWhen to use: always provide a concise label for the requested long-form\ntext. When NOT to use: do not substitute placeholder text for the label.";
          readonly required: true;
        };
        readonly "label-hint": {
          readonly type: "string";
          readonly description: "Short text shown after the label and read with it as part of the field's\nname, so people know before submitting whether to answer: \"(optional)\" on\nthe few optional fields of a mostly required form, or \"(required)\" the\nother way round, in the page's own language. It changes no validation;\nset `required` for that, and keep the two consistent.\nWhen NOT to use: do not put instructions or length limits in it (use\n`help-text`), errors (use `error-text`), or a repeat of the label.";
        };
        readonly maxlength: {
          readonly type: "number";
          readonly description: "Soft maximum in UTF-16 code units. Longer user edits and assigned values\nare preserved and fail form validation with `validity.tooLong`.\nWhen to use: let people revise an over-limit draft without losing text.";
          readonly minimum: 0;
          readonly maximum: 2147483647;
        };
        readonly "maxlength-error-text": {
          readonly type: "string";
          readonly description: "Localized message for an over-limit value. `error-text` and\n`setCustomValidity()` take precedence.\nWhen to use: translate the soft maximum message for the page language.";
          readonly default: "Shorten the text to fit the character limit.";
        };
        readonly minlength: {
          readonly type: "number";
          readonly description: "Native minimum length in UTF-16 code units for a nonempty user edit.\nWhen to use: require a minimum number of characters in an answer.";
          readonly minimum: 0;
          readonly maximum: 2147483647;
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Form-data key used when the textarea submits with a form.\nWhen to use: provide for fields whose text must be included in FormData.\nWhen NOT to use: omit for display-only or client-only fields.";
        };
        readonly placeholder: {
          readonly type: "string";
          readonly description: "Hint shown while the textarea is empty.\nWhen to use: add an example or short formatting hint. When NOT to use: do\nnot use placeholder as the accessible name or required instruction.";
        };
        readonly readonly: {
          readonly type: "boolean";
          readonly description: "Makes the textarea focusable and selectable while rejecting edits.\nWhen to use: show submitted or policy text that should still be included\nin form data. When NOT to use: do not use readonly to remove a field from\nsubmission; use disabled.";
          readonly default: false;
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Requires a non-empty value before form submission.\nWhen to use: mark mandatory long-form text. When NOT to use: do not pair\nwith `readonly` expecting it to block; readonly fields are validation\nexempt like native textareas.";
          readonly default: false;
        };
        readonly rows: {
          readonly type: "number";
          readonly description: "Visible line count. Invalid, non-numeric, zero, or negative values fall\nback to 2; no auto-grow or user resize handle exists in v1.\nWhen to use: set the stable multiline height needed by the layout. When\nNOT to use: do not use rows as a responsive size axis.";
          readonly default: 2;
        };
        readonly "show-count": {
          readonly type: "boolean";
          readonly description: "Shows the current count and maximum next to the help or error text and\nannounces reaching or exceeding the limit. Requires `maxlength`.\nWhen to use: give people feedback while writing to a limit.";
          readonly default: false;
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl", "xs"];
          readonly description: "Token-backed field size (`--ki-textarea-{size}-*` tokens): padding,\nradius and text; the label and help text follow in three steps. The\nheight stays `rows` lines. An unrecognized value matches no style rule\nand keeps the medium metrics.\nWhen to use: match the size of the fields around it.\nWhen NOT to use: do not pick a smaller size to fit a dense region or a\nlarger one for touch; declare `data-ki-density` on the region instead,\nwhich composes with every size.";
          readonly default: "md";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Live current text. The `value` attribute declares the reset default;\nelement text content is ignored. Programmatic assignments replace the\ndisplay and emit no events.\nWhen to use: preload or read free-form text, line breaks included. When\nNOT to use: do not put initial text between the element tags.";
          readonly default: "";
        };
      };
      readonly slots: {};
      readonly tag: "ki-textarea";
      readonly whenNotToUse: "single-line values (`ki-input`), constrained choices,\nrich or formatted text editing, or search boxes.\n\nAgent note: initial text is declared through the `value` attribute; element\ntext content is ignored. Enter inserts a line break and never submits the\nenclosing form, the inverse of `ki-input`.";
      readonly whenToUse: "free-form text longer than one line, such as comments,\ndescriptions, messages, delivery notes, or addresses when paired with a\nmatching `autocomplete` purpose.";
    };
    readonly "ki-time-input": {
      readonly description: "A time-of-day field with locale-aware typing and suggested slots. The shadow\nroot keeps the combobox and listbox in the same accessibility ID scope.\nThe host owns native form participation.";
      readonly events: {
        readonly change: "Native-style composed event for a changed user commit.";
        readonly "ki-change": "Emitted when a person commits a different canonical time or clears it.";
      };
      readonly props: {
        readonly "custom-error": {
          readonly type: "string";
          readonly description: "An error of the application's own, such as a server-side verdict on the\nsubmitted time (\"That slot was just booked\"). While it holds text the\nfield is invalid, blocks its form, shows the text in place of the help\ntext at once and is announced as invalid. It stops counting at the\nperson's next edit or pick of a time, or when the form is reset, so it\nnever blocks the corrected answer. It outranks `error-text` and an error\nset with `setCustomValidity`.\nWhen to use: report a verdict from a declarative spec, a live update or a\nframework binding. Remove it when a new attempt starts.\nWhen NOT to use: do not use it for `required`, the bounds or unreadable\ntext, which the field reports itself; `error-text` words those. Setting\nthe same text again while the prop still holds it shows nothing: remove\nit first, then set it again.";
        };
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Disables typing, suggestions and form participation.";
          readonly default: false;
        };
        readonly "error-text": {
          readonly type: "string";
          readonly description: "Validation message to show after blur or a blocked form submission. A `custom-error` outranks it.";
        };
        readonly "help-text": {
          readonly type: "string";
          readonly description: "Guidance read with the field until a validation error replaces it.";
        };
        readonly "invalid-time-text": {
          readonly type: "string";
          readonly description: "Fallback validation message for invalid time syntax or bounds.";
          readonly default: "Enter a valid time within the allowed range.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Visible text naming the time field. Provide it for every use.";
          readonly required: true;
        };
        readonly "list-label": {
          readonly type: "string";
          readonly description: "Accessible name of the suggestion listbox.";
          readonly default: "Suggested times";
        };
        readonly max: {
          readonly type: "string";
          readonly description: "Latest allowed wall-clock time in HH:mm, inclusive.";
        };
        readonly min: {
          readonly type: "string";
          readonly description: "Earliest allowed wall-clock time in HH:mm, inclusive.";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Name under which the canonical time is submitted.";
        };
        readonly "picker-label": {
          readonly type: "string";
          readonly description: "Accessible name of the button that opens suggestions.";
          readonly default: "Choose time";
        };
        readonly required: {
          readonly type: "boolean";
          readonly description: "Empty values block form submission when true.";
          readonly default: false;
        };
        readonly step: {
          readonly type: "number";
          readonly description: "Suggested slot interval in whole minutes. Typed times keep their exact minutes.";
          readonly default: 30;
        };
        readonly "time-zone": {
          readonly type: "string";
          readonly description: "IANA timezone shown alongside help. Does not change wall-clock values.";
        };
        readonly value: {
          readonly type: "string";
          readonly description: "Committed wall-clock time in HH:mm, or empty. The attribute sets the form reset value.";
          readonly default: "";
        };
      };
      readonly slots: {
        readonly start: "Optional leading adornment, outside the input's accessible name.";
      };
      readonly tag: "ki-time-input";
      readonly whenNotToUse: "durations, dates or timestamps. Pair with a date field when\nthe day matters. Timezone conversion belongs to the application.";
      readonly whenToUse: "collect an exact time of day or offer regular appointment slots.\nProvide a visible label and set bounding times when the schedule is limited.";
    };
    readonly "ki-timeline": {
      readonly description: "A chronological list of activity, audit records, or steps from a run.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the ordered list.";
        };
        readonly order: {
          readonly type: "enum";
          readonly values: readonly ["newest-first", "oldest-first"];
          readonly description: "Chronological order of valid dates. Ties and undated entries retain source\norder. Undated entries follow valid dates in either direction.";
          readonly default: "newest-first";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-timeline-item children.";
      };
      readonly tag: "ki-timeline";
      readonly whenNotToUse: "offer a selectable command list, control the current step of a\ntask, or represent progress toward completion.";
      readonly whenToUse: "present chronological events with independently readable summaries,\noptional times and details, including new entries in a live feed.";
    };
    readonly "ki-timeline-item": {
      readonly description: "One event in a timeline, with an optional time and details disclosure.";
      readonly events: {};
      readonly props: {
        readonly datetime: {
          readonly type: "string";
          readonly description: "ISO date or date-time. Invalid or missing dates have no time label.";
        };
        readonly "details-label": {
          readonly type: "string";
          readonly description: "Label of the details control when the details slot is populated.";
          readonly default: "Details";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Decorative Lucide icon name, registered by the caller's per-icon import.";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "neutral", "primary", "success", "warning"];
          readonly description: "Marker tone. The event text carries the meaning. Without an icon, a\nnon-neutral tone draws a solid dot in its ink.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Event summary. Include important status information in the text.";
        readonly details: "Additional event information in a native details disclosure.";
        readonly start: "Decorative avatar or other noninteractive marker in place of the icon.";
      };
      readonly tag: "ki-timeline-item";
      readonly whenNotToUse: "convey the outcome only through marker colour, or use the marker\nas a control. Put actions in the event content or details.";
      readonly whenToUse: "describe an activity, audit, or run event inside a ki-timeline.";
    };
    readonly "ki-toast": {
      readonly description: "A short, transient message about something the person just did, shown\nwithout blocking the page. It leaves on its own after its time, which stops\nwhile the person points at the toaster, works inside it or is away from the\npage; a toast with an action, or reporting an error, waits for the person.";
      readonly events: {
        readonly "ki-dismiss": "Fired once when the toast leaves because its time ran out\n(`reason: \"timeout\"`), the person used the dismiss button (`\"button\"`),\npressed Escape inside it (`\"escape\"`) or activated its action\n(`\"action\"`), after it is hidden and focus has been handed on. Not\ncancelable. When to use: remove the element, or record that the message\nwas seen. When NOT to use: do not expect it for programmatic `dismissed`\nchanges.";
      };
      readonly props: {
        readonly "dismiss-label": {
          readonly type: "string";
          readonly description: "Accessible name of the dismiss button. Override for localization; the\ndefault English word is the component's only built-in text.\n\nWhen to use: whenever the document language is not English.\nWhen NOT to use: do not put the message here; use the default slot.";
          readonly default: "Dismiss";
        };
        readonly dismissed: {
          readonly type: "boolean";
          readonly description: "Reflected state: true once the toast has left. The timer, the dismiss\nbutton, Escape and the action set it; the page may set or clear it.\nWhile true the host stays in the document but renders nothing and leaves\nthe accessibility tree. Clearing it shows the toast again with its full\ntime.\n\nWhen to use: show a toast again, or close it from the page.\nWhen NOT to use: do not read programmatic changes as dismissals;\n`ki-dismiss` reports only the timer and the person.";
          readonly default: false;
        };
        readonly dismissible: {
          readonly type: "boolean";
          readonly description: "Shows the dismiss button, a ghost `ki-icon-button` named by\n`dismiss-label`. Escape still dismisses a focused toast without it.\n\nWhen to use: keep it on unless the toast leaves on its own and the page\noffers no other way to read it again.\nWhen NOT to use: do not turn it off on a toast that waits for the person.";
          readonly default: true;
        };
        readonly duration: {
          readonly type: "number";
          readonly description: "How long the toast stays, in milliseconds, before it leaves on its own;\n`0` keeps it until it is dismissed. Ignored (treated as `0`) when the toast\nholds an action or its tone is `danger`. Unset, or not a finite number of\nzero or more, it is 5000. The time stops while the pointer rests on the\ntoaster, while focus is inside it, or while the page is hidden, and\ncontinues with what was left. Changing it restarts the time.\n\nWhen to use: give a longer message more time.\nWhen NOT to use: do not shorten it below what a person needs to read the\nmessage.";
          readonly minimum: 0;
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Optional bold first line, inside the live region. Empty strings render no\nheading. It is a `strong` element, never a document heading.\n\nWhen to use: a short label for the event (\"Changes saved\").\nWhen NOT to use: do not use it for page structure.";
        };
        readonly queued: {
          readonly type: "boolean";
          readonly description: "Output-only state written by an enclosing `ki-toaster`: true while the\ntoast waits for a place. A queued toast renders nothing, is absent from\nthe accessibility tree and its time does not run. Authors do not set it;\nthe toaster overwrites it.";
          readonly default: false;
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["danger", "info", "neutral", "success", "warning"];
          readonly description: "Picks the icon and its ink, and the live-region urgency: `danger` exposes\n`role=\"alert\"` and never leaves on its own; `neutral`, `info`, `success`,\n`warning`, absent and unrecognized values expose `role=\"status\"`. The\nsurface and the text look the same in every tone. Unknown values render\nneutral.\n\nWhen to use: choose the tone that describes what happened.\nWhen NOT to use: do not use tone for emphasis; a lasting failure belongs\nin `ki-alert`.";
          readonly default: "neutral";
        };
      };
      readonly slots: {
        readonly "": "Message text. It lives inside the live-region boundary.";
        readonly action: "At most one action, as a `ki-button size=\"sm\" variant=\"ghost\"`.\nIts own click handler runs, then the toast leaves (`reason: \"action\"`). A\ntoast holding an action never leaves on its own. When NOT to use: a response\nthe person cannot skip belongs in `ki-dialog`.";
      };
      readonly tag: "ki-toast";
      readonly whenNotToUse: "anything the person must read or act on to continue belongs\nto `ki-dialog`; form validation belongs to the field's error text; a lasting\ncondition of the page belongs to `ki-alert`, which stays inline.\n\nAssistive technology note: a toast announces as it appears, so append it\nwhen the event happens; a toast present at initial page load is exposed with\nits role but its announcement is not guaranteed. The heading and the message\nare the whole announcement: the icon, the action and the dismiss button\nstay outside the live region.";
      readonly whenToUse: "confirm an action that happened elsewhere on screen (\"Changes\nsaved\", \"Link copied\"), report a background result (\"Export ready\"), or\noffer a quick undo. Raise it into a `ki-toaster`, in markup or with its\n`show()` method; express urgency with `tone`.";
    };
    readonly "ki-toaster": {
      readonly description: "The one place toasts appear: it paints its `ki-toast` children in the top\nlayer at a corner of the viewport, stacks them in arrival order, shows the\nnewest few and queues the older ones, without covering the page beside\nthem.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the group the toaster exposes while it shows toasts.\nOverride for localization.\n\nWhen to use: provide the name in the document language.\nWhen NOT to use: do not put a message here.";
          readonly default: "Notifications";
        };
        readonly max: {
          readonly type: "number";
          readonly description: "How many toasts show at once: the newest ones. Older toasts wait, and come\nback with their full time as shown ones leave. A toast holding focus keeps\nits place until focus leaves the toaster; the oldest other one waits\ninstead. A value below 1 or not a whole number shows 3.\n\nWhen to use: lower it on small screens or busy applications.\nWhen NOT to use: do not raise it to show every toast; a tall stack covers\nthe page.";
          readonly default: 3;
          readonly minimum: 1;
        };
        readonly placement: {
          readonly type: "enum";
          readonly values: readonly ["bottom-center", "bottom-end", "top-center", "top-end"];
          readonly description: "Corner or edge of the viewport the stack sits against; `end` follows the\nwriting direction. On a coarse pointer and a viewport narrower than 40rem\nthe stack always sits at the bottom center. Unknown values place the stack\nat the bottom end.\n\nWhen to use: keep toasts away from where the page's own controls live.\nWhen NOT to use: do not change it per toast; one toaster keeps one place.";
          readonly default: "bottom-end";
        };
      };
      readonly slots: {
        readonly "": "The `ki-toast` elements, in arrival order. Other children are not\ncounted, queued or placed.";
      };
      readonly tag: "ki-toaster";
      readonly whenNotToUse: "do not put anything but `ki-toast` elements in it; do not use\nit for persistent content, which belongs in the page or in `ki-alert`.\n\nAssistive technology note: while it shows toasts the toaster is a group\nnamed by `label`, never a landmark; F6 moves focus into it and Escape on a\ntoast returns focus to where it was. An empty toaster exposes nothing and\ncovers nothing.";
      readonly whenToUse: "once per page (or once inside a modal `ki-dialog`), as the place\nevery `ki-toast` of the application appears in: append toasts to it, or call\n`show()`. Choose the corner with `placement`.";
    };
    readonly "ki-tool-call": {
      readonly description: "A disclosure for one assistant tool call, with a status and optional payloads.";
      readonly events: {
        readonly "ki-tool-retry": "A request to retry this tool call. Bind a declared surface action to handle it.";
      };
      readonly props: {
        readonly "approval-label": {
          readonly type: "string";
          readonly description: "Status text for a call waiting on an approval decision.";
          readonly default: "Needs approval";
        };
        readonly "done-label": {
          readonly type: "string";
          readonly description: "Status text for a successful call.";
          readonly default: "Done";
        };
        readonly duration: {
          readonly type: "number";
          readonly description: "Non-negative elapsed time in milliseconds. Displayed only for Done.";
          readonly minimum: 0;
        };
        readonly "error-label": {
          readonly type: "string";
          readonly description: "Caption for the error slot.";
          readonly default: "Error";
        };
        readonly "failed-label": {
          readonly type: "string";
          readonly description: "Status text for a failed call.";
          readonly default: "Failed";
        };
        readonly "input-label": {
          readonly type: "string";
          readonly description: "Caption for the input slot.";
          readonly default: "Input";
        };
        readonly locale: {
          readonly type: "string";
          readonly description: "Language tag used to format the completed duration. Defaults to English.";
          readonly default: "en";
        };
        readonly name: {
          readonly type: "string";
          readonly description: "Tool identifier, such as search_docs, displayed in monospace.";
          readonly required: true;
        };
        readonly open: {
          readonly type: "boolean";
          readonly description: "Override the disclosure state. Without an override, failed calls are open\nand other calls are closed. Set open=\"false\" for an explicit collapse.\nUsing the summary sets the property to the reader's choice.";
        };
        readonly "output-label": {
          readonly type: "string";
          readonly description: "Caption for the output slot.";
          readonly default: "Output";
        };
        readonly "pending-label": {
          readonly type: "string";
          readonly description: "Status text for a call waiting to run.";
          readonly default: "Pending";
        };
        readonly "retry-label": {
          readonly type: "string";
          readonly description: "Visible and accessible label for the built-in retry control.";
          readonly default: "Retry";
        };
        readonly retryable: {
          readonly type: "boolean";
          readonly description: "Offer the built-in Retry button when the call fails.";
          readonly default: false;
        };
        readonly "running-label": {
          readonly type: "string";
          readonly description: "Status text for a call in progress.";
          readonly default: "Running";
        };
        readonly status: {
          readonly type: "enum";
          readonly values: readonly ["approval", "done", "failed", "pending", "running"];
          readonly description: "Lifecycle status. Unknown values display Pending.";
          readonly default: "pending";
        };
        readonly title: {
          readonly type: "string";
          readonly description: "Optional human-readable label displayed beside the identifier.";
        };
      };
      readonly slots: {
        readonly error: "A failure message or a consumer-owned retry control, visible on failed calls.";
        readonly input: "Arguments supplied to the tool. Use ki-code-block for structured text.";
        readonly output: "Result returned by the tool. Use ki-code-block for structured text.";
      };
      readonly tag: "ki-tool-call";
      readonly whenNotToUse: "collecting approval, running or configuring tools. Pair with a\nseparate confirmation control for an approval decision.";
      readonly whenToUse: "show which tool ran, its state and duration, and let the reader\ninspect the supplied input, output or error. Use a conversation log for status updates.";
    };
    readonly "ki-toolbar": {
      readonly description: "Brings frequent page actions together in a floating pill or docked surface.";
      readonly events: {};
      readonly props: {
        readonly "hide-on-scroll": {
          readonly type: "boolean";
          readonly description: "Hides on downward page scroll and reveals on upward scroll or when an\naction receives focus. Use for secondary actions where content needs room.";
          readonly default: false;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name for the group, such as \"Formatting\". Supply it in the page's language.";
          readonly required: true;
        };
        readonly orientation: {
          readonly type: "enum";
          readonly values: readonly ["horizontal", "vertical"];
          readonly description: "Layout and keyboard axis. Set vertical for a floating column. Docked is always horizontal.";
          readonly default: "horizontal";
        };
        readonly tone: {
          readonly type: "enum";
          readonly values: readonly ["standard", "vibrant"];
          readonly description: "Surface palette. Use vibrant to emphasize the toolbar with an accent tint.";
          readonly default: "standard";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["docked", "floating"];
          readonly description: "Floating leaves placement to the page. Docked fixes the surface to the\nviewport's bottom edge. Reserve space below the content when docking.";
          readonly default: "floating";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-button, ki-icon-button (including toggles), native button\nand ki-divider children. Give every icon-only action an accessible name.";
        readonly fab: "A companion ki-fab for the floating variant. It follows the\ntoolbar and has its own Tab stop.";
      };
      readonly tag: "ki-toolbar";
      readonly whenNotToUse: "for site navigation, mutually exclusive choices, or a docked\nbar on a screen already using MobileNav.";
      readonly whenToUse: "group a small set of related page actions, such as text\nformatting or the commands on a compact message screen.";
    };
    readonly "ki-tooltip": {
      readonly description: "A transient, text-only hint with an optional heading.";
      readonly events: {};
      readonly props: {
        readonly for: {
          readonly type: "string";
          readonly description: "ID of the rich tooltip's external trigger in the same document or shadow tree.";
          readonly format: "idref";
        };
        readonly heading: {
          readonly type: "string";
          readonly description: "Rich tooltip heading. Pair it with `for` and optional direct text in the default slot.";
        };
        readonly label: {
          readonly type: "string";
          readonly description: "The entire plain tooltip content. The string is reflected to the slotted\ntrigger's accessible description without changing its name. Empty or\nwhitespace-only labels render no tooltip and expose no description.\nWhen to use: a short hint that clarifies the slotted trigger.\nWhen NOT to use: never use `label` for essential information, rich\ncontent, interactive content, validation messages, or information attached\nto disabled controls; put that content in visible UI or a popover.";
          readonly default: "";
        };
        readonly placement: {
          readonly type: "enum";
          readonly values: readonly ["bottom", "end", "start", "top"];
          readonly description: "Preferred placement for the tooltip. The component may flip or clamp the\nrendered placement to keep the bubble inside the viewport; unknown runtime\nvalues fall back to `top`.\nWhen NOT to use: do not depend on placement for meaning or reading order.";
          readonly default: "top";
        };
      };
      readonly slots: {
        readonly "": "One trigger for a plain tooltip, or direct explanatory text when\n`for` and `heading` are provided. Rich tooltips accept text only.";
      };
      readonly tag: "ki-tooltip";
      readonly whenNotToUse: "essential or unique information in a tooltip; interactive\ncontent in a tooltip; form validation messages, disabled controls, or\ntouch-primary flows. Use visible layout text or a rich `ki-popover` with\n`kind=\"toggletip\"` when the content includes actions.";
      readonly whenToUse: "add a brief clarifying hint for an icon-only, abbreviated, or\notherwise ambiguous control when the same information is discoverable\nelsewhere in the interface.";
    };
    readonly "ki-top-nav": {
      readonly description: "Application navigation with responsive primary links, or a per-screen app\nbar with a real heading, optional search, and overflow actions.";
      readonly events: {};
      readonly props: {
        readonly "collapse-at": {
          readonly type: "string";
          readonly description: "CSS length below which navigation collapses and single-row app bars can center their title.\n`none` keeps links visible. If they do not fit beside the brand and actions,\nthey wrap across the full width below them.";
          readonly default: "48rem";
        };
        readonly "heading-level": {
          readonly type: "number";
          readonly description: "Native heading level for the screen title. Use 1 through 6 to fit the page outline.";
          readonly default: 1;
        };
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the header's primary navigation landmark. Override for localization.";
          readonly default: "Main";
        };
        readonly "navigation-label": {
          readonly type: "string";
          readonly description: "Accessible name for the compact navigation button and menu. Override for localization.";
          readonly default: "Open navigation";
        };
        readonly "overflow-label": {
          readonly type: "string";
          readonly description: "Accessible name for the app-bar overflow button and menu. Override for localization.";
          readonly default: "More actions";
        };
        readonly "scroll-behavior": {
          readonly type: "enum";
          readonly values: readonly ["collapse", "elevate", "none"];
          readonly description: "Tint on scroll with elevate, also shrink tall bars with collapse, or opt out with none.";
          readonly default: "elevate";
        };
        readonly size: {
          readonly type: "enum";
          readonly values: readonly ["lg", "md", "sm", "xl"];
          readonly description: "Bar size. Only app-bar mode has large and extra-large two-row sizes.";
          readonly default: "md";
        };
        readonly sticky: {
          readonly type: "boolean";
          readonly description: "Keep the bar at the block start of the scroll container and draw a bottom border.";
          readonly default: false;
        };
        readonly subtitle: {
          readonly type: "string";
          readonly description: "Supporting text displayed under the screen heading.";
          readonly default: "";
        };
        readonly title: {
          readonly type: "string";
          readonly description: "Screen heading, set with the HTML title attribute or the screenTitle property.";
          readonly default: "";
        };
        readonly "title-align": {
          readonly type: "enum";
          readonly values: readonly ["center", "start"];
          readonly description: "Center a compact single-row title when the app bar has at most one action.";
          readonly default: "start";
        };
        readonly variant: {
          readonly type: "enum";
          readonly values: readonly ["app-bar", "header"];
          readonly description: "Header for primary navigation, or app-bar for the current screen. Defaults to header.";
          readonly default: "header";
        };
      };
      readonly slots: {
        readonly "": "Header mode: up to five direct native anchors; mark the current one with\naria-current=\"page\". They stay the page's own anchors, so the page's link\nrules reach them and outrank the bar's link styles (CSS Scoping gives the\npage's styles precedence over a component's `::slotted()` rules, whatever\ntheir specificity). `a { color: inherit }` is safe: the links then take the\nbar's item ink. A rule that sets `color`, `text-decoration`, `font-*` or\n`padding` on every `a` restyles them too: scope it away from the bar, for\nexample `:where(main, footer) a` or `a:not(ki-top-nav > a)`, and restyle the\nbar's links with the `--ki-top-nav-item-*` tokens.";
        readonly actions: "Header: global actions. App bar: up to three inline; additional direct named buttons or links go into overflow.";
        readonly brand: "Header mode: the brand link or wordmark. Page link rules reach it\nas they reach the primary links.";
        readonly leading: "App bar: a named Back or Open navigation control.";
        readonly search: "App bar: an accessible search control that can shrink inside its row.";
      };
      readonly tag: "ki-top-nav";
      readonly whenNotToUse: "more than five sections or a deep navigation tree (use a\nsidebar), or switches between in-page views (use ki-tabs).";
      readonly whenToUse: "group a brand, up to five primary sections and global controls,\nor set a screen title, leading control and screen actions in app-bar mode.";
    };
    readonly "ki-tree": {
      readonly description: "A named hierarchy with collapsible branches and independent keyboard focus.";
      readonly events: {
        readonly "ki-selection-change": "Emitted after a user selection changes. Selected items are in tree order.";
      };
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the hierarchy. Localize it and make it distinct among nearby trees.";
          readonly default: "Tree";
        };
        readonly selection: {
          readonly type: "enum";
          readonly values: readonly ["multiple", "none", "single"];
          readonly description: "Use none for navigation, single for one selected item, or multiple for checkable branches.";
          readonly default: "single";
        };
      };
      readonly slots: {
        readonly "": "Direct ki-tree-item children in reading order.";
      };
      readonly tag: "ki-tree";
      readonly whenNotToUse: "flat lists of peers, menus of commands, or submitted form values.";
      readonly whenToUse: "browse nested files, categories or an outline, select items in\na hierarchy, or navigate through linked destinations.";
    };
    readonly "ki-tree-item": {
      readonly description: "An item or expandable branch inside a ki-tree.";
      readonly events: {
        readonly "ki-collapse": "Emitted when an existing branch collapses, also when `expanded` is\ncleared: it can fire without a gesture.";
        readonly "ki-expand": "Emitted when an existing branch expands, also when `expanded` is set: it\ncan fire without a gesture.";
        readonly "ki-load": "Emitted once when an empty lazy branch first opens, also one rendered\nexpanded: it can fire without a gesture. The listener supplies the children.";
      };
      readonly props: {
        readonly disabled: {
          readonly type: "boolean";
          readonly description: "Keep the row discoverable by keyboard while preventing user activation.";
          readonly default: false;
        };
        readonly expanded: {
          readonly type: "boolean";
          readonly description: "Whether a branch reveals its children. Has no visible effect on a leaf.";
          readonly default: false;
        };
        readonly href: {
          readonly type: "string";
          readonly description: "Native destination of the row. Prefer selection=\"none\" for navigation trees.";
          readonly format: "url";
        };
        readonly "icon-name": {
          readonly type: "string";
          readonly description: "Optional decorative icon. Import the named Kimen glyph before mounting the tree.";
        };
        readonly lazy: {
          readonly type: "boolean";
          readonly description: "Request children on the first empty expansion. Clear it to finish an empty load.";
          readonly default: false;
        };
        readonly "loading-label": {
          readonly type: "string";
          readonly description: "Localized text for the spinner status during an outstanding lazy request.";
          readonly default: "Loading";
        };
        readonly selected: {
          readonly type: "boolean";
          readonly description: "Selected state. The tree keeps it in sync with single selection or fully checked branches.";
          readonly default: false;
        };
      };
      readonly slots: {
        readonly "": "The row label and directly nested ki-tree-item children.";
      };
      readonly tag: "ki-tree-item";
      readonly whenNotToUse: "standalone controls, form checkboxes, or a row with other\ninteractive descendants.";
      readonly whenToUse: "label a file, category or destination in a hierarchy. Nest more\nki-tree-item children for a branch.";
    };
    readonly "ki-video": {
      readonly description: "A themed video surface: a calm poster facade with exactly one accessible\nplay control over a slotted native `<video>` element. From the first\nactivation on, playback, scrubbing, volume, captions and fullscreen belong\nto the native player — Kimen ships no custom chrome.";
      readonly events: {};
      readonly props: {
        readonly label: {
          readonly type: "string";
          readonly description: "Accessible name of the play control (\"Play the product tour\"). The\ncontrol is a real button exposing role button with exactly this name;\nthe frame contributes no role, name or state of its own (FR-004,\nFR-005). Documented as required: no default human-language string is\nbaked in, and an unlabeled control renders but fails the accessibility\naudit (015-ki-progress precedent). The label is never rendered visually.";
          readonly required: true;
        };
      };
      readonly slots: {
        readonly "": "Exactly one native `<video>` element carrying its own poster, sources and `<track>` captions.";
      };
      readonly tag: "ki-video";
      readonly whenNotToUse: "decorative background or ambient loops (plain CSS and\n`<video>` are the tool), audio-only recordings (use ki-audio),\nembeds from streaming platforms that ship their own player chrome (use\ntheir embed), or static imagery (use an image, not a video). `autoplay`\non the slotted media is unsupported: the facade's contract is that\nplayback begins only by explicit user activation — never on scroll,\nhover or visibility — so preexisting `autoplay` and `controls` on the\nslotted media are cleared when it arrives, and any playback already\nrunning is paused (FR-003; the native chrome returns at activation).";
      readonly whenToUse: "playable content the person deliberately chooses to watch —\nproduct tours, talks, tutorials, announcements — presented as a poster\nwith one play control. Slot exactly one native `<video>` carrying its own\n`poster`, sources and `<track>` captions, omit `controls` (the component\nenables the native chrome the moment the facade yields, FR-002), and give\nthe control a `label` (required: the accessible name of the play button).";
    };
    readonly p: {
      readonly description: "A native paragraph (`<p>`) of running text that takes the host page's typography.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "p";
      readonly whenNotToUse: "Do not use it as a heading, to hold layout, images or components, or for a status message (use ki-alert or ki-status). Never bind an action.";
      readonly whenToUse: "Write one paragraph of explanatory text in a generated panel.";
    };
    readonly strong: {
      readonly description: "Native strong importance (`<strong>`) inside a heading, a paragraph or another emphasis element.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.";
      };
      readonly tag: "strong";
      readonly whenNotToUse: "Do not use it for whole paragraphs, as a heading or for a status (use ki-badge). Never bind an action.";
      readonly whenToUse: "Mark the figure or phrase of a sentence that matters most, such as a total.";
    };
    readonly table: {
      readonly description: "A native data table (`<table>`) for reading records that share the same fields. It is never sorted or selected from a spec.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "In this order: at most one `caption`, at most one `thead`, then any number of `tbody`. No text and no other element: anything else is rejected as invalid-child.";
      };
      readonly tag: "table";
      readonly whenNotToUse: "Do not use it for layout (use a div), for a list of single items (use ki-list) or inside a cell: tables never nest. Never bind an action.";
      readonly whenToUse: "Show records with the same fields side by side, such as orders and their status. Put it in the default slot of a ki-table, and leave its `selectable` off: a table from a spec is never sorted or selected.";
    };
    readonly tbody: {
      readonly description: "A native body row group of a table (`<tbody>`) that holds its records as rows.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Only `tr` rows. No text and no other element: anything else is rejected as invalid-child.";
      };
      readonly tag: "tbody";
      readonly whenNotToUse: "Do not use it outside a table or before its caption or thead. A totals row is one more body row. Never bind an action.";
      readonly whenToUse: "Hold the body rows of a table, after its thead. A table may hold several to group its rows.";
    };
    readonly td: {
      readonly description: "A native data cell (`<td>`) of a table row.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Text, native elements and catalog components, as in a layout `div`. Never a table or a table part: they are rejected as invalid-child.";
      };
      readonly tag: "td";
      readonly whenNotToUse: "Do not use it outside a tr, and never put a table in it. A cell spans exactly one row and one column. Never bind an action on the cell itself.";
      readonly whenToUse: "Hold one field of a record: text, a ki-badge for a status, or a ki-button that acts on the record.";
    };
    readonly th: {
      readonly description: "A native header cell (`<th>`) that heads a column or a row of a table.";
      readonly events: {};
      readonly props: {
        readonly scope: {
          readonly description: "What the cell heads: `col` for the column below it, `row` for the rest of its row. Optional: without it the browser infers it.";
          readonly type: "enum";
          readonly values: readonly ["col", "row"];
        };
      };
      readonly slots: {
        readonly "": "Text, native elements and catalog components, as in a layout `div`. Never a table or a table part: they are rejected as invalid-child.";
      };
      readonly tag: "th";
      readonly whenNotToUse: "Do not use it outside a tr or only to make text bold. A spec cannot sort a column. Never bind an action.";
      readonly whenToUse: "Head each column in the header row (scope `col`) and, when one field identifies the record, head each body row with it (scope `row`).";
    };
    readonly thead: {
      readonly description: "The native header row group of a table (`<thead>`) that holds the row of column headers.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Only `tr` rows. No text and no other element: anything else is rejected as invalid-child.";
      };
      readonly tag: "thead";
      readonly whenNotToUse: "Do not use it outside a table, after a tbody, or twice in one table. Never bind an action.";
      readonly whenToUse: "Hold the header row of a table, after its caption and before its body.";
    };
    readonly tr: {
      readonly description: "A native table row (`<tr>`) of header and data cells.";
      readonly events: {};
      readonly props: {};
      readonly slots: {
        readonly "": "Only `th` and `td` cells. No text and no other element: anything else is rejected as invalid-child.";
      };
      readonly tag: "tr";
      readonly whenNotToUse: "Do not use it outside a thead or a tbody, or to lay content out in a row (use a div with direction row). A row is never selected or clicked: never bind an action.";
      readonly whenToUse: "Hold one record, or the header row, inside a thead or a tbody.";
    };
  };
  readonly elementsVersion: "0.6.0";
};
