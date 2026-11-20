---
# Every ki-* tag in the page, and every @kimen/elements/ki-* import, names a
# real component. The allow-list is copied from
# packages/elements/generated/custom-elements.json: refresh it when a
# component is added, renamed or removed.
type: regex
target:
  source: file
  path: index.html
match: not_contains
---
<ki-(?!(?:accordion|ai-label|alert|audio|avatar|avatar-group|badge|breadcrumb|breadcrumb-item|button|button-group|card|carousel|carousel-item|checkbox|checkbox-group|chip|chip-group|citation|code-block|code-input|combobox|confirmation|conversation|copy-button|counter|date-picker|details|dialog|divider|drawer|empty-state|fab|fab-menu|fab-menu-item|feature-icon|file-upload|format-date|format-number|grid|icon|icon-button|image|indicator|input|link|list|list-item|markdown|menu|menu-group|menu-item|message|mobile-nav|mobile-nav-item|note|number-input|option|pagination|popover|progress|prompt-input|qr|radio|radio-group|rating|reasoning|relative-time|scroller|search|search-suggestion|segment|segmented-control|select|sidebar|sidebar-group|sidebar-item|skeleton|slider|source|sources|spinner|stack|stat|status|step|stepper|suggestion|suggestions|switch|tab|tab-panel|table|tabs|textarea|time-input|timeline|timeline-item|toast|toaster|tool-call|toolbar|tooltip|top-nav|tree|tree-item|video)(?=[\s/>]))[a-z0-9-]+|@kimen/elements/ki-(?!(?:accordion|ai-label|alert|audio|avatar|avatar-group|badge|breadcrumb|breadcrumb-item|button|button-group|card|carousel|carousel-item|checkbox|checkbox-group|chip|chip-group|citation|code-block|code-input|combobox|confirmation|conversation|copy-button|counter|date-picker|details|dialog|divider|drawer|empty-state|fab|fab-menu|fab-menu-item|feature-icon|file-upload|format-date|format-number|grid|icon|icon-button|image|indicator|input|link|list|list-item|markdown|menu|menu-group|menu-item|message|mobile-nav|mobile-nav-item|note|number-input|option|pagination|popover|progress|prompt-input|qr|radio|radio-group|rating|reasoning|relative-time|scroller|search|search-suggestion|segment|segmented-control|select|sidebar|sidebar-group|sidebar-item|skeleton|slider|source|sources|spinner|stack|stat|status|step|stepper|suggestion|suggestions|switch|tab|tab-panel|table|tabs|textarea|time-input|timeline|timeline-item|toast|toaster|tool-call|toolbar|tooltip|top-nav|tree|tree-item|video)['"])[a-z0-9-]+
