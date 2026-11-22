---
# Every node names a catalog component or native primitive. The allow-list
# is copied from packages/catalog/src/generated/catalog.ts: refresh it when a
# component is added, renamed or removed.
type: regex
target:
  source: file
  path: spec.json
match: not_contains
---
"component"\s*:\s*"(?!(?:caption|div|em|h2|h3|h4|img|ki-accordion|ki-ai-label|ki-alert|ki-audio|ki-avatar|ki-avatar-group|ki-badge|ki-breadcrumb|ki-breadcrumb-item|ki-button|ki-button-group|ki-card|ki-carousel|ki-carousel-item|ki-checkbox|ki-checkbox-group|ki-chip|ki-chip-group|ki-citation|ki-code-block|ki-code-input|ki-combobox|ki-confirmation|ki-conversation|ki-copy-button|ki-counter|ki-date-picker|ki-details|ki-dialog|ki-divider|ki-drawer|ki-empty-state|ki-fab|ki-fab-menu|ki-fab-menu-item|ki-feature-icon|ki-file-upload|ki-format-date|ki-format-number|ki-grid|ki-icon|ki-icon-button|ki-image|ki-indicator|ki-input|ki-link|ki-list|ki-list-item|ki-markdown|ki-menu|ki-menu-group|ki-menu-item|ki-message|ki-mobile-nav|ki-mobile-nav-item|ki-note|ki-number-input|ki-option|ki-pagination|ki-popover|ki-progress|ki-prompt-input|ki-qr|ki-radio|ki-radio-group|ki-rating|ki-reasoning|ki-relative-time|ki-scroller|ki-search|ki-search-suggestion|ki-segment|ki-segmented-control|ki-select|ki-sidebar|ki-sidebar-group|ki-sidebar-item|ki-skeleton|ki-slider|ki-source|ki-sources|ki-spinner|ki-stack|ki-stat|ki-status|ki-step|ki-stepper|ki-suggestion|ki-suggestions|ki-switch|ki-tab|ki-tab-panel|ki-table|ki-tabs|ki-textarea|ki-time-input|ki-timeline|ki-timeline-item|ki-toast|ki-toaster|ki-tool-call|ki-toolbar|ki-tooltip|ki-top-nav|ki-tree|ki-tree-item|ki-video|p|strong|table|tbody|td|th|thead|tr)")[^"]*"
