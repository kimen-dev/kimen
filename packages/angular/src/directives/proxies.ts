/* tslint:disable */
/* auto-generated angular directive proxies */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone } from '@angular/core';

import { ProxyCmp } from './angular-component-lib/utils';

import type { Components } from '@kimen/elements/components';

import { defineCustomElement as defineKiAccordion } from '@kimen/elements/components/ki-accordion.js';
import { defineCustomElement as defineKiAiLabel } from '@kimen/elements/components/ki-ai-label.js';
import { defineCustomElement as defineKiAlert } from '@kimen/elements/components/ki-alert.js';
import { defineCustomElement as defineKiAudio } from '@kimen/elements/components/ki-audio.js';
import { defineCustomElement as defineKiAvatar } from '@kimen/elements/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '@kimen/elements/components/ki-avatar-group.js';
import { defineCustomElement as defineKiBadge } from '@kimen/elements/components/ki-badge.js';
import { defineCustomElement as defineKiBreadcrumb } from '@kimen/elements/components/ki-breadcrumb.js';
import { defineCustomElement as defineKiBreadcrumbItem } from '@kimen/elements/components/ki-breadcrumb-item.js';
import { defineCustomElement as defineKiButton } from '@kimen/elements/components/ki-button.js';
import { defineCustomElement as defineKiButtonGroup } from '@kimen/elements/components/ki-button-group.js';
import { defineCustomElement as defineKiCard } from '@kimen/elements/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '@kimen/elements/components/ki-checkbox.js';
import { defineCustomElement as defineKiCheckboxGroup } from '@kimen/elements/components/ki-checkbox-group.js';
import { defineCustomElement as defineKiChip } from '@kimen/elements/components/ki-chip.js';
import { defineCustomElement as defineKiChipGroup } from '@kimen/elements/components/ki-chip-group.js';
import { defineCustomElement as defineKiCodeBlock } from '@kimen/elements/components/ki-code-block.js';
import { defineCustomElement as defineKiCodeInput } from '@kimen/elements/components/ki-code-input.js';
import { defineCustomElement as defineKiCombobox } from '@kimen/elements/components/ki-combobox.js';
import { defineCustomElement as defineKiConfirmation } from '@kimen/elements/components/ki-confirmation.js';
import { defineCustomElement as defineKiConversation } from '@kimen/elements/components/ki-conversation.js';
import { defineCustomElement as defineKiCopyButton } from '@kimen/elements/components/ki-copy-button.js';
import { defineCustomElement as defineKiCounter } from '@kimen/elements/components/ki-counter.js';
import { defineCustomElement as defineKiDatePicker } from '@kimen/elements/components/ki-date-picker.js';
import { defineCustomElement as defineKiDetails } from '@kimen/elements/components/ki-details.js';
import { defineCustomElement as defineKiDialog } from '@kimen/elements/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '@kimen/elements/components/ki-divider.js';
import { defineCustomElement as defineKiDrawer } from '@kimen/elements/components/ki-drawer.js';
import { defineCustomElement as defineKiEmptyState } from '@kimen/elements/components/ki-empty-state.js';
import { defineCustomElement as defineKiFab } from '@kimen/elements/components/ki-fab.js';
import { defineCustomElement as defineKiFabMenu } from '@kimen/elements/components/ki-fab-menu.js';
import { defineCustomElement as defineKiFabMenuItem } from '@kimen/elements/components/ki-fab-menu-item.js';
import { defineCustomElement as defineKiFeatureIcon } from '@kimen/elements/components/ki-feature-icon.js';
import { defineCustomElement as defineKiFileUpload } from '@kimen/elements/components/ki-file-upload.js';
import { defineCustomElement as defineKiFormatDate } from '@kimen/elements/components/ki-format-date.js';
import { defineCustomElement as defineKiFormatNumber } from '@kimen/elements/components/ki-format-number.js';
import { defineCustomElement as defineKiGrid } from '@kimen/elements/components/ki-grid.js';
import { defineCustomElement as defineKiIcon } from '@kimen/elements/components/ki-icon.js';
import { defineCustomElement as defineKiIconButton } from '@kimen/elements/components/ki-icon-button.js';
import { defineCustomElement as defineKiImage } from '@kimen/elements/components/ki-image.js';
import { defineCustomElement as defineKiIndicator } from '@kimen/elements/components/ki-indicator.js';
import { defineCustomElement as defineKiInput } from '@kimen/elements/components/ki-input.js';
import { defineCustomElement as defineKiLink } from '@kimen/elements/components/ki-link.js';
import { defineCustomElement as defineKiList } from '@kimen/elements/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '@kimen/elements/components/ki-list-item.js';
import { defineCustomElement as defineKiMarkdown } from '@kimen/elements/components/ki-markdown.js';
import { defineCustomElement as defineKiMenu } from '@kimen/elements/components/ki-menu.js';
import { defineCustomElement as defineKiMenuGroup } from '@kimen/elements/components/ki-menu-group.js';
import { defineCustomElement as defineKiMenuItem } from '@kimen/elements/components/ki-menu-item.js';
import { defineCustomElement as defineKiMessage } from '@kimen/elements/components/ki-message.js';
import { defineCustomElement as defineKiMobileNav } from '@kimen/elements/components/ki-mobile-nav.js';
import { defineCustomElement as defineKiMobileNavItem } from '@kimen/elements/components/ki-mobile-nav-item.js';
import { defineCustomElement as defineKiNote } from '@kimen/elements/components/ki-note.js';
import { defineCustomElement as defineKiNumberInput } from '@kimen/elements/components/ki-number-input.js';
import { defineCustomElement as defineKiOption } from '@kimen/elements/components/ki-option.js';
import { defineCustomElement as defineKiPagination } from '@kimen/elements/components/ki-pagination.js';
import { defineCustomElement as defineKiPopover } from '@kimen/elements/components/ki-popover.js';
import { defineCustomElement as defineKiProgress } from '@kimen/elements/components/ki-progress.js';
import { defineCustomElement as defineKiPromptInput } from '@kimen/elements/components/ki-prompt-input.js';
import { defineCustomElement as defineKiQr } from '@kimen/elements/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '@kimen/elements/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '@kimen/elements/components/ki-radio-group.js';
import { defineCustomElement as defineKiRating } from '@kimen/elements/components/ki-rating.js';
import { defineCustomElement as defineKiReasoning } from '@kimen/elements/components/ki-reasoning.js';
import { defineCustomElement as defineKiRelativeTime } from '@kimen/elements/components/ki-relative-time.js';
import { defineCustomElement as defineKiScroller } from '@kimen/elements/components/ki-scroller.js';
import { defineCustomElement as defineKiSearch } from '@kimen/elements/components/ki-search.js';
import { defineCustomElement as defineKiSearchSuggestion } from '@kimen/elements/components/ki-search-suggestion.js';
import { defineCustomElement as defineKiSegment } from '@kimen/elements/components/ki-segment.js';
import { defineCustomElement as defineKiSegmentedControl } from '@kimen/elements/components/ki-segmented-control.js';
import { defineCustomElement as defineKiSelect } from '@kimen/elements/components/ki-select.js';
import { defineCustomElement as defineKiSidebar } from '@kimen/elements/components/ki-sidebar.js';
import { defineCustomElement as defineKiSidebarGroup } from '@kimen/elements/components/ki-sidebar-group.js';
import { defineCustomElement as defineKiSidebarItem } from '@kimen/elements/components/ki-sidebar-item.js';
import { defineCustomElement as defineKiSkeleton } from '@kimen/elements/components/ki-skeleton.js';
import { defineCustomElement as defineKiSlider } from '@kimen/elements/components/ki-slider.js';
import { defineCustomElement as defineKiSpinner } from '@kimen/elements/components/ki-spinner.js';
import { defineCustomElement as defineKiStack } from '@kimen/elements/components/ki-stack.js';
import { defineCustomElement as defineKiStat } from '@kimen/elements/components/ki-stat.js';
import { defineCustomElement as defineKiStatus } from '@kimen/elements/components/ki-status.js';
import { defineCustomElement as defineKiStep } from '@kimen/elements/components/ki-step.js';
import { defineCustomElement as defineKiStepper } from '@kimen/elements/components/ki-stepper.js';
import { defineCustomElement as defineKiSuggestion } from '@kimen/elements/components/ki-suggestion.js';
import { defineCustomElement as defineKiSuggestions } from '@kimen/elements/components/ki-suggestions.js';
import { defineCustomElement as defineKiSwitch } from '@kimen/elements/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '@kimen/elements/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '@kimen/elements/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTable } from '@kimen/elements/components/ki-table.js';
import { defineCustomElement as defineKiTabs } from '@kimen/elements/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '@kimen/elements/components/ki-textarea.js';
import { defineCustomElement as defineKiTimeInput } from '@kimen/elements/components/ki-time-input.js';
import { defineCustomElement as defineKiTimeline } from '@kimen/elements/components/ki-timeline.js';
import { defineCustomElement as defineKiTimelineItem } from '@kimen/elements/components/ki-timeline-item.js';
import { defineCustomElement as defineKiToast } from '@kimen/elements/components/ki-toast.js';
import { defineCustomElement as defineKiToaster } from '@kimen/elements/components/ki-toaster.js';
import { defineCustomElement as defineKiToolCall } from '@kimen/elements/components/ki-tool-call.js';
import { defineCustomElement as defineKiToolbar } from '@kimen/elements/components/ki-toolbar.js';
import { defineCustomElement as defineKiTooltip } from '@kimen/elements/components/ki-tooltip.js';
import { defineCustomElement as defineKiTopNav } from '@kimen/elements/components/ki-top-nav.js';
import { defineCustomElement as defineKiTree } from '@kimen/elements/components/ki-tree.js';
import { defineCustomElement as defineKiTreeItem } from '@kimen/elements/components/ki-tree-item.js';
import { defineCustomElement as defineKiVideo } from '@kimen/elements/components/ki-video.js';
@ProxyCmp({
  defineCustomElementFn: defineKiAccordion,
  inputs: ['exclusive']
})
@Component({
  selector: 'ki-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['exclusive'],
})
export class KiAccordion {
  protected el: HTMLKiAccordionElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiAccordion extends Components.KiAccordion {}


@ProxyCmp({
  defineCustomElementFn: defineKiAiLabel,
  inputs: ['explanation', 'generatedAt', 'generatedAtLabel', 'label', 'model', 'modelLabel', 'popoverLabel', 'revertLabel', 'revertible', 'size', 'triggerLabel']
})
@Component({
  selector: 'ki-ai-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['explanation', 'generatedAt', 'generatedAtLabel', 'label', 'model', 'modelLabel', 'popoverLabel', 'revertLabel', 'revertible', 'size', 'triggerLabel'],
})
export class KiAiLabel {
  protected el: HTMLKiAiLabelElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiAiLabel extends Components.KiAiLabel {
}


@ProxyCmp({
  defineCustomElementFn: defineKiAlert,
  inputs: ['dismissLabel', 'dismissed', 'dismissible', 'heading', 'tone']
})
@Component({
  selector: 'ki-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['dismissLabel', 'dismissed', 'dismissible', 'heading', 'tone'],
})
export class KiAlert {
  protected el: HTMLKiAlertElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiAlert extends Components.KiAlert {
}


@ProxyCmp({
  defineCustomElementFn: defineKiAudio,
  inputs: ['audioTitle', 'errorLabel', 'muteLabel', 'pauseLabel', 'playLabel', 'rates', 'seekLabel', 'speedLabel', 'src', 'timeLabel', 'transcriptHref', 'transcriptLabel', 'unmuteLabel']
})
@Component({
  selector: 'ki-audio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['audioTitle', 'errorLabel', 'muteLabel', 'pauseLabel', 'playLabel', 'rates', 'seekLabel', 'speedLabel', { name: 'src', required: true }, 'timeLabel', 'transcriptHref', 'transcriptLabel', 'unmuteLabel'],
})
export class KiAudio {
  protected el: HTMLKiAudioElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiAudio extends Components.KiAudio {
}


@ProxyCmp({
  defineCustomElementFn: defineKiAvatar,
  inputs: ['initials', 'label', 'size', 'src']
})
@Component({
  selector: 'ki-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['initials', 'label', 'size', 'src'],
})
export class KiAvatar {
  protected el: HTMLKiAvatarElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiAvatar extends Components.KiAvatar {}


@ProxyCmp({
  defineCustomElementFn: defineKiAvatarGroup,
  inputs: ['max', 'size']
})
@Component({
  selector: 'ki-avatar-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['max', 'size'],
})
export class KiAvatarGroup {
  protected el: HTMLKiAvatarGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiAvatarGroup extends Components.KiAvatarGroup {}


@ProxyCmp({
  defineCustomElementFn: defineKiBadge,
  inputs: ['size', 'tone']
})
@Component({
  selector: 'ki-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['size', 'tone'],
})
export class KiBadge {
  protected el: HTMLKiBadgeElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiBadge extends Components.KiBadge {}


@ProxyCmp({
  defineCustomElementFn: defineKiBreadcrumb,
  inputs: ['label', 'maxItems', 'moreLabel']
})
@Component({
  selector: 'ki-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'maxItems', 'moreLabel'],
})
export class KiBreadcrumb {
  protected el: HTMLKiBreadcrumbElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiBreadcrumb extends Components.KiBreadcrumb {}


@ProxyCmp({
  defineCustomElementFn: defineKiBreadcrumbItem,
  inputs: ['current', 'href']
})
@Component({
  selector: 'ki-breadcrumb-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['current', 'href'],
})
export class KiBreadcrumbItem {
  protected el: HTMLKiBreadcrumbItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiBreadcrumbItem extends Components.KiBreadcrumbItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiButton,
  inputs: ['command', 'commandfor', 'disabled', 'loading', 'loadingLabel', 'name', 'selected', 'size', 'toggle', 'tone', 'type', 'value', 'variant']
})
@Component({
  selector: 'ki-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['command', 'commandfor', 'disabled', 'loading', 'loadingLabel', 'name', 'selected', 'size', 'toggle', 'tone', 'type', 'value', 'variant'],
})
export class KiButton {
  protected el: HTMLKiButtonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiButton extends Components.KiButton {
}


@ProxyCmp({
  defineCustomElementFn: defineKiButtonGroup,
  inputs: ['attached', 'label', 'size', 'toolbar']
})
@Component({
  selector: 'ki-button-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['attached', { name: 'label', required: true }, 'size', 'toolbar'],
})
export class KiButtonGroup {
  protected el: HTMLKiButtonGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiButtonGroup extends Components.KiButtonGroup {}


@ProxyCmp({
  defineCustomElementFn: defineKiCard,
  inputs: ['href', 'interactive', 'variant']
})
@Component({
  selector: 'ki-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['href', 'interactive', 'variant'],
})
export class KiCard {
  protected el: HTMLKiCardElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCard extends Components.KiCard {
}


@ProxyCmp({
  defineCustomElementFn: defineKiCheckbox,
  inputs: ['checked', 'disabled', 'errorText', 'helpText', 'indeterminate', 'labelHint', 'name', 'required', 'size', 'value']
})
@Component({
  selector: 'ki-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'errorText', 'helpText', 'indeterminate', 'labelHint', 'name', 'required', 'size', 'value'],
})
export class KiCheckbox {
  protected el: HTMLKiCheckboxElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiCheckbox extends Components.KiCheckbox {}


@ProxyCmp({
  defineCustomElementFn: defineKiCheckboxGroup,
  inputs: ['disabled', 'errorText', 'helpText', 'label', 'max', 'min', 'name', 'orientation', 'value']
})
@Component({
  selector: 'ki-checkbox-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'max', 'min', 'name', 'orientation', 'value'],
})
export class KiCheckboxGroup {
  protected el: HTMLKiCheckboxGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCheckboxGroup extends Components.KiCheckboxGroup {
}


@ProxyCmp({
  defineCustomElementFn: defineKiChip,
  inputs: ['disabled', 'removable', 'removeLabel', 'selected', 'size', 'type', 'value']
})
@Component({
  selector: 'ki-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'removable', 'removeLabel', 'selected', 'size', 'type', 'value'],
})
export class KiChip {
  protected el: HTMLKiChipElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiChip extends Components.KiChip {
}


@ProxyCmp({
  defineCustomElementFn: defineKiChipGroup,
  inputs: ['focusTarget', 'label', 'reorderAnnouncement', 'reorderable', 'type']
})
@Component({
  selector: 'ki-chip-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['focusTarget', 'label', 'reorderAnnouncement', 'reorderable', 'type'],
})
export class KiChipGroup {
  protected el: HTMLKiChipGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiChipGroup extends Components.KiChipGroup {
}


@ProxyCmp({
  defineCustomElementFn: defineKiCodeBlock,
  inputs: ['copiedLabel', 'copyErrorLabel', 'copyLabel', 'copyable', 'filename', 'highlight', 'highlightLabel', 'label', 'language', 'lineNumbers', 'wrap']
})
@Component({
  selector: 'ki-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['copiedLabel', 'copyErrorLabel', 'copyLabel', 'copyable', 'filename', 'highlight', 'highlightLabel', 'label', 'language', 'lineNumbers', 'wrap'],
})
export class KiCodeBlock {
  protected el: HTMLKiCodeBlockElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCodeBlock extends Components.KiCodeBlock {
}


@ProxyCmp({
  defineCustomElementFn: defineKiCodeInput,
  inputs: ['disabled', 'errorText', 'helpText', 'label', 'length', 'name', 'required', 'size', 'type', 'value']
})
@Component({
  selector: 'ki-code-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'length', 'name', 'required', 'size', 'type', 'value'],
})
export class KiCodeInput {
  protected el: HTMLKiCodeInputElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCodeInput extends Components.KiCodeInput {
}


@ProxyCmp({
  defineCustomElementFn: defineKiCombobox,
  inputs: ['addLabel', 'allowCustom', 'disabled', 'emptyLabel', 'errorText', 'filter', 'helpText', 'label', 'loading', 'loadingLabel', 'multiple', 'name', 'placeholder', 'removeLabel', 'required', 'resultCountLabel', 'resultOneLabel', 'value']
})
@Component({
  selector: 'ki-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['addLabel', 'allowCustom', 'disabled', 'emptyLabel', 'errorText', 'filter', 'helpText', { name: 'label', required: true }, 'loading', 'loadingLabel', 'multiple', 'name', 'placeholder', 'removeLabel', 'required', 'resultCountLabel', 'resultOneLabel', 'value'],
})
export class KiCombobox {
  protected el: HTMLKiComboboxElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCombobox extends Components.KiCombobox {
}


@ProxyCmp({
  defineCustomElementFn: defineKiConfirmation,
  inputs: ['action', 'approveLabel', 'approvedLabel', 'consequence', 'deniedLabel', 'denyLabel', 'expiredLabel', 'heading', 'remember', 'rememberLabel', 'resolvedAt', 'resolvedBy', 'state', 'tone'],
  methods: ['focusPrompt']
})
@Component({
  selector: 'ki-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [{ name: 'action', required: true }, { name: 'approveLabel', required: true }, 'approvedLabel', 'consequence', 'deniedLabel', { name: 'denyLabel', required: true }, 'expiredLabel', { name: 'heading', required: true }, 'remember', 'rememberLabel', 'resolvedAt', 'resolvedBy', 'state', 'tone'],
})
export class KiConfirmation {
  protected el: HTMLKiConfirmationElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiConfirmation extends Components.KiConfirmation {
}


@ProxyCmp({
  defineCustomElementFn: defineKiConversation,
  inputs: ['jumpLabel', 'label', 'stickToBottom']
})
@Component({
  selector: 'ki-conversation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['jumpLabel', 'label', 'stickToBottom'],
})
export class KiConversation {
  protected el: HTMLKiConversationElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiConversation extends Components.KiConversation {}


@ProxyCmp({
  defineCustomElementFn: defineKiCopyButton,
  inputs: ['copiedLabel', 'copyErrorLabel', 'feedbackDuration', 'from', 'label', 'size', 'value', 'variant']
})
@Component({
  selector: 'ki-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['copiedLabel', 'copyErrorLabel', 'feedbackDuration', 'from', 'label', 'size', 'value', 'variant'],
})
export class KiCopyButton {
  protected el: HTMLKiCopyButtonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiCopyButton extends Components.KiCopyButton {
}


@ProxyCmp({
  defineCustomElementFn: defineKiCounter,
  inputs: ['dot', 'for', 'max', 'tone', 'value']
})
@Component({
  selector: 'ki-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['dot', 'for', 'max', 'tone', 'value'],
})
export class KiCounter {
  protected el: HTMLKiCounterElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiCounter extends Components.KiCounter {}


@ProxyCmp({
  defineCustomElementFn: defineKiDatePicker,
  inputs: ['applyLabel', 'cancelLabel', 'changeLabel', 'chooseLabel', 'confirm', 'disabled', 'errorText', 'firstDayOfWeek', 'helpText', 'invalidDateLabel', 'label', 'locale', 'max', 'min', 'mode', 'name', 'nextMonthLabel', 'previousMonthLabel', 'required', 'value']
})
@Component({
  selector: 'ki-date-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['applyLabel', 'cancelLabel', 'changeLabel', 'chooseLabel', 'confirm', 'disabled', 'errorText', 'firstDayOfWeek', 'helpText', 'invalidDateLabel', { name: 'label', required: true }, 'locale', 'max', 'min', 'mode', 'name', 'nextMonthLabel', 'previousMonthLabel', 'required', 'value'],
})
export class KiDatePicker {
  protected el: HTMLKiDatePickerElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiDatePicker extends Components.KiDatePicker {
}


@ProxyCmp({
  defineCustomElementFn: defineKiDetails,
  inputs: ['disabled', 'name', 'open', 'summary']
})
@Component({
  selector: 'ki-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'name', 'open', 'summary'],
})
export class KiDetails {
  protected el: HTMLKiDetailsElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiDetails extends Components.KiDetails {
}


@ProxyCmp({
  defineCustomElementFn: defineKiDialog,
  inputs: ['closeOnBackdrop', 'heading', 'open'],
  methods: ['show', 'close']
})
@Component({
  selector: 'ki-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['closeOnBackdrop', { name: 'heading', required: true }, 'open'],
})
export class KiDialog {
  protected el: HTMLKiDialogElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiDialog extends Components.KiDialog {
}


@ProxyCmp({
  defineCustomElementFn: defineKiDivider,
  inputs: ['orientation']
})
@Component({
  selector: 'ki-divider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['orientation'],
})
export class KiDivider {
  protected el: HTMLKiDividerElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiDivider extends Components.KiDivider {}


@ProxyCmp({
  defineCustomElementFn: defineKiDrawer,
  inputs: ['closeLabel', 'heading', 'modal', 'open', 'placement', 'size'],
  methods: ['show', 'close']
})
@Component({
  selector: 'ki-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['closeLabel', { name: 'heading', required: true }, 'modal', 'open', 'placement', 'size'],
})
export class KiDrawer {
  protected el: HTMLKiDrawerElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiDrawer extends Components.KiDrawer {
}


@ProxyCmp({
  defineCustomElementFn: defineKiEmptyState,
  inputs: ['announce', 'heading', 'headingLevel', 'iconName', 'size', 'tone']
})
@Component({
  selector: 'ki-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['announce', { name: 'heading', required: true }, 'headingLevel', 'iconName', 'size', 'tone'],
})
export class KiEmptyState {
  protected el: HTMLKiEmptyStateElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiEmptyState extends Components.KiEmptyState {}


@ProxyCmp({
  defineCustomElementFn: defineKiFab,
  inputs: ['collapseOnScroll', 'extended', 'href', 'iconName', 'label', 'position', 'size', 'variant']
})
@Component({
  selector: 'ki-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['collapseOnScroll', 'extended', 'href', 'iconName', { name: 'label', required: true }, 'position', 'size', 'variant'],
})
export class KiFab {
  protected el: HTMLKiFabElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiFab extends Components.KiFab {}


@ProxyCmp({
  defineCustomElementFn: defineKiFabMenu,
  inputs: ['closeLabel', 'iconName', 'label', 'open', 'position', 'scrim', 'variant']
})
@Component({
  selector: 'ki-fab-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['closeLabel', 'iconName', { name: 'label', required: true }, 'open', 'position', 'scrim', 'variant'],
})
export class KiFabMenu {
  protected el: HTMLKiFabMenuElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiFabMenu extends Components.KiFabMenu {
}


@ProxyCmp({
  defineCustomElementFn: defineKiFabMenuItem,
  inputs: ['href', 'iconName', 'value']
})
@Component({
  selector: 'ki-fab-menu-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['href', 'iconName', 'value'],
})
export class KiFabMenuItem {
  protected el: HTMLKiFabMenuItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiFabMenuItem extends Components.KiFabMenuItem {
}


@ProxyCmp({
  defineCustomElementFn: defineKiFeatureIcon,
  inputs: ['shape', 'size', 'tone']
})
@Component({
  selector: 'ki-feature-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['shape', 'size', 'tone'],
})
export class KiFeatureIcon {
  protected el: HTMLKiFeatureIconElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiFeatureIcon extends Components.KiFeatureIcon {}


@ProxyCmp({
  defineCustomElementFn: defineKiFileUpload,
  inputs: ['accept', 'browseLabel', 'cancelLabel', 'countError', 'disabled', 'doneLabel', 'dropLabel', 'errorText', 'failedLabel', 'files', 'helpText', 'label', 'listLabel', 'maxFiles', 'maxSize', 'multiple', 'name', 'queuedLabel', 'removeLabel', 'required', 'requiredLabel', 'requiredMessage', 'sizeError', 'typeError', 'uploadingLabel']
})
@Component({
  selector: 'ki-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['accept', 'browseLabel', 'cancelLabel', 'countError', 'disabled', 'doneLabel', 'dropLabel', 'errorText', 'failedLabel', 'files', 'helpText', 'label', 'listLabel', 'maxFiles', 'maxSize', 'multiple', 'name', 'queuedLabel', 'removeLabel', 'required', 'requiredLabel', 'requiredMessage', 'sizeError', 'typeError', 'uploadingLabel'],
})
export class KiFileUpload {
  protected el: HTMLKiFileUploadElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiFileUpload extends Components.KiFileUpload {
}


@ProxyCmp({
  defineCustomElementFn: defineKiFormatDate,
  inputs: ['date', 'dateStyle', 'locale', 'timeStyle', 'timeZone']
})
@Component({
  selector: 'ki-format-date',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['date', 'dateStyle', 'locale', 'timeStyle', 'timeZone'],
})
export class KiFormatDate {
  protected el: HTMLKiFormatDateElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiFormatDate extends Components.KiFormatDate {}


@ProxyCmp({
  defineCustomElementFn: defineKiFormatNumber,
  inputs: ['currency', 'formatStyle', 'maximumFractionDigits', 'minimumFractionDigits', 'notation', 'unit', 'value']
})
@Component({
  selector: 'ki-format-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['currency', 'formatStyle', 'maximumFractionDigits', 'minimumFractionDigits', 'notation', 'unit', 'value'],
})
export class KiFormatNumber {
  protected el: HTMLKiFormatNumberElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiFormatNumber extends Components.KiFormatNumber {}


@ProxyCmp({
  defineCustomElementFn: defineKiGrid,
  inputs: ['columns', 'gap', 'minColumn']
})
@Component({
  selector: 'ki-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['columns', 'gap', 'minColumn'],
})
export class KiGrid {
  protected el: HTMLKiGridElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiGrid extends Components.KiGrid {}


@ProxyCmp({
  defineCustomElementFn: defineKiIcon,
  inputs: ['label', 'name', 'size']
})
@Component({
  selector: 'ki-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', { name: 'name', required: true }, 'size'],
})
export class KiIcon {
  protected el: HTMLKiIconElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiIcon extends Components.KiIcon {}


@ProxyCmp({
  defineCustomElementFn: defineKiIconButton,
  inputs: ['command', 'commandfor', 'disabled', 'expanded', 'label', 'loading', 'loadingLabel', 'pressed', 'selected', 'size', 'toggle', 'tone', 'variant']
})
@Component({
  selector: 'ki-icon-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['command', 'commandfor', 'disabled', 'expanded', { name: 'label', required: true }, 'loading', 'loadingLabel', 'pressed', 'selected', 'size', 'toggle', 'tone', 'variant'],
})
export class KiIconButton {
  protected el: HTMLKiIconButtonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiIconButton extends Components.KiIconButton {
}


@ProxyCmp({
  defineCustomElementFn: defineKiImage,
  inputs: ['alt', 'decorative', 'fallbackLabel', 'fit', 'loading', 'radius', 'ratio', 'src']
})
@Component({
  selector: 'ki-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['alt', 'decorative', 'fallbackLabel', 'fit', 'loading', 'radius', 'ratio', { name: 'src', required: true }],
})
export class KiImage {
  protected el: HTMLKiImageElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiImage extends Components.KiImage {
}


@ProxyCmp({
  defineCustomElementFn: defineKiIndicator,
  inputs: ['count', 'current', 'label']
})
@Component({
  selector: 'ki-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['count', 'current', { name: 'label', required: true }],
})
export class KiIndicator {
  protected el: HTMLKiIndicatorElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiIndicator extends Components.KiIndicator {}


@ProxyCmp({
  defineCustomElementFn: defineKiInput,
  inputs: ['aiSuggestionText', 'autocomplete', 'disabled', 'errorText', 'helpText', 'label', 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'size', 'type', 'value']
})
@Component({
  selector: 'ki-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['aiSuggestionText', 'autocomplete', 'disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'size', 'type', 'value'],
})
export class KiInput {
  protected el: HTMLKiInputElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiInput extends Components.KiInput {}


@ProxyCmp({
  defineCustomElementFn: defineKiLink,
  inputs: ['download', 'external', 'externalLabel', 'href', 'rel', 'target', 'underline', 'variant']
})
@Component({
  selector: 'ki-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['download', 'external', 'externalLabel', { name: 'href', required: true }, 'rel', 'target', 'underline', 'variant'],
})
export class KiLink {
  protected el: HTMLKiLinkElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiLink extends Components.KiLink {}


@ProxyCmp({
  defineCustomElementFn: defineKiList
})
@Component({
  selector: 'ki-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
})
export class KiList {
  protected el: HTMLKiListElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiList extends Components.KiList {}


@ProxyCmp({
  defineCustomElementFn: defineKiListItem,
  inputs: ['size']
})
@Component({
  selector: 'ki-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['size'],
})
export class KiListItem {
  protected el: HTMLKiListItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiListItem extends Components.KiListItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiMarkdown,
  inputs: ['allowImages', 'headingOffset', 'srcText', 'streaming']
})
@Component({
  selector: 'ki-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['allowImages', 'headingOffset', 'srcText', 'streaming'],
})
export class KiMarkdown {
  protected el: HTMLKiMarkdownElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiMarkdown extends Components.KiMarkdown {}


@ProxyCmp({
  defineCustomElementFn: defineKiMenu,
  inputs: ['anchor', 'filterLabel', 'filterResultsLabel', 'open', 'placement']
})
@Component({
  selector: 'ki-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['anchor', 'filterLabel', 'filterResultsLabel', 'open', 'placement'],
})
export class KiMenu {
  protected el: HTMLKiMenuElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiMenu extends Components.KiMenu {
}


@ProxyCmp({
  defineCustomElementFn: defineKiMenuGroup,
  inputs: ['label']
})
@Component({
  selector: 'ki-menu-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label'],
})
export class KiMenuGroup {
  protected el: HTMLKiMenuGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiMenuGroup extends Components.KiMenuGroup {}


@ProxyCmp({
  defineCustomElementFn: defineKiMenuItem,
  inputs: ['checked', 'disabled', 'shortcut', 'tone', 'type', 'value']
})
@Component({
  selector: 'ki-menu-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'shortcut', 'tone', 'type', 'value'],
})
export class KiMenuItem {
  protected el: HTMLKiMenuItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiMenuItem extends Components.KiMenuItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiMessage,
  inputs: ['actionsLabel', 'author', 'branchCount', 'branchIndex', 'branchStatusLabel', 'feedback', 'iconName', 'messageRole', 'nextBranchLabel', 'previousBranchLabel', 'streaming']
})
@Component({
  selector: 'ki-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['actionsLabel', 'author', 'branchCount', 'branchIndex', 'branchStatusLabel', 'feedback', 'iconName', 'messageRole', 'nextBranchLabel', 'previousBranchLabel', 'streaming'],
})
export class KiMessage {
  protected el: HTMLKiMessageElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiMessage extends Components.KiMessage {
}


@ProxyCmp({
  defineCustomElementFn: defineKiMobileNav,
  inputs: ['label', 'variant']
})
@Component({
  selector: 'ki-mobile-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'variant'],
})
export class KiMobileNav {
  protected el: HTMLKiMobileNavElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiMobileNav extends Components.KiMobileNav {}


@ProxyCmp({
  defineCustomElementFn: defineKiMobileNavItem,
  inputs: ['count', 'countLabel', 'current', 'href', 'iconName']
})
@Component({
  selector: 'ki-mobile-nav-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['count', 'countLabel', 'current', { name: 'href', required: true }, { name: 'iconName', required: true }],
})
export class KiMobileNavItem {
  protected el: HTMLKiMobileNavItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiMobileNavItem extends Components.KiMobileNavItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiNote,
  inputs: ['icon', 'size', 'tone']
})
@Component({
  selector: 'ki-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['icon', 'size', 'tone'],
})
export class KiNote {
  protected el: HTMLKiNoteElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiNote extends Components.KiNote {}


@ProxyCmp({
  defineCustomElementFn: defineKiNumberInput,
  inputs: ['decreaseLabel', 'disabled', 'errorText', 'format', 'helpText', 'increaseLabel', 'invalidNumberMessage', 'label', 'max', 'maximumMessage', 'min', 'minimumMessage', 'name', 'required', 'step', 'steppers', 'unit', 'value']
})
@Component({
  selector: 'ki-number-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['decreaseLabel', 'disabled', 'errorText', 'format', 'helpText', 'increaseLabel', 'invalidNumberMessage', { name: 'label', required: true }, 'max', 'maximumMessage', 'min', 'minimumMessage', 'name', 'required', 'step', 'steppers', 'unit', 'value'],
})
export class KiNumberInput {
  protected el: HTMLKiNumberInputElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiNumberInput extends Components.KiNumberInput {}


@ProxyCmp({
  defineCustomElementFn: defineKiOption,
  inputs: ['description', 'disabled', 'value']
})
@Component({
  selector: 'ki-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['description', 'disabled', 'value'],
})
export class KiOption {
  protected el: HTMLKiOptionElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiOption extends Components.KiOption {}


@ProxyCmp({
  defineCustomElementFn: defineKiPagination,
  inputs: ['boundaries', 'compactLabel', 'hrefTemplate', 'label', 'loadMoreLabel', 'nextLabel', 'page', 'pageLabel', 'pages', 'previousLabel', 'shown', 'siblings', 'statusLabel', 'total', 'variant']
})
@Component({
  selector: 'ki-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['boundaries', 'compactLabel', 'hrefTemplate', 'label', 'loadMoreLabel', 'nextLabel', 'page', 'pageLabel', 'pages', 'previousLabel', 'shown', 'siblings', 'statusLabel', 'total', 'variant'],
})
export class KiPagination {
  protected el: HTMLKiPaginationElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiPagination extends Components.KiPagination {
}


@ProxyCmp({
  defineCustomElementFn: defineKiPopover,
  inputs: ['appearance', 'arrow', 'for', 'kind', 'label', 'open', 'placement']
})
@Component({
  selector: 'ki-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['appearance', 'arrow', 'for', 'kind', 'label', 'open', 'placement'],
})
export class KiPopover {
  protected el: HTMLKiPopoverElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiPopover extends Components.KiPopover {
}


@ProxyCmp({
  defineCustomElementFn: defineKiProgress,
  inputs: ['indeterminate', 'label', 'max', 'shape', 'value']
})
@Component({
  selector: 'ki-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['indeterminate', { name: 'label', required: true }, 'max', 'shape', 'value'],
})
export class KiProgress {
  protected el: HTMLKiProgressElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiProgress extends Components.KiProgress {}


@ProxyCmp({
  defineCustomElementFn: defineKiPromptInput,
  inputs: ['accept', 'attachLabel', 'attachmentsLabel', 'disabled', 'fileCountMessage', 'fileSizeMessage', 'fileTypeMessage', 'label', 'maxFiles', 'maxSize', 'name', 'placeholder', 'removeLabel', 'sendLabel', 'status', 'stopLabel', 'submitOn', 'value', 'writingMessage']
})
@Component({
  selector: 'ki-prompt-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['accept', 'attachLabel', 'attachmentsLabel', 'disabled', 'fileCountMessage', 'fileSizeMessage', 'fileTypeMessage', { name: 'label', required: true }, 'maxFiles', 'maxSize', 'name', 'placeholder', 'removeLabel', 'sendLabel', 'status', 'stopLabel', 'submitOn', 'value', 'writingMessage'],
})
export class KiPromptInput {
  protected el: HTMLKiPromptInputElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiPromptInput extends Components.KiPromptInput {
}


@ProxyCmp({
  defineCustomElementFn: defineKiQr,
  inputs: ['label', 'value']
})
@Component({
  selector: 'ki-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'value'],
})
export class KiQr {
  protected el: HTMLKiQrElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiQr extends Components.KiQr {}


@ProxyCmp({
  defineCustomElementFn: defineKiRadio,
  inputs: ['disabled', 'value']
})
@Component({
  selector: 'ki-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'value'],
})
export class KiRadio {
  protected el: HTMLKiRadioElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiRadio extends Components.KiRadio {}


@ProxyCmp({
  defineCustomElementFn: defineKiRadioGroup,
  inputs: ['disabled', 'errorText', 'helpText', 'label', 'labelHint', 'name', 'required', 'size', 'value']
})
@Component({
  selector: 'ki-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'labelHint', 'name', 'required', 'size', 'value'],
})
export class KiRadioGroup {
  protected el: HTMLKiRadioGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiRadioGroup extends Components.KiRadioGroup {}


@ProxyCmp({
  defineCustomElementFn: defineKiRating,
  inputs: ['disabled', 'iconName', 'label', 'max', 'name', 'optionLabel', 'optionSingularLabel', 'precision', 'ratedLabel', 'readonly', 'required', 'requiredMessage', 'scoreLabel', 'value']
})
@Component({
  selector: 'ki-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'iconName', { name: 'label', required: true }, 'max', 'name', 'optionLabel', 'optionSingularLabel', 'precision', 'ratedLabel', 'readonly', 'required', 'requiredMessage', 'scoreLabel', 'value'],
})
export class KiRating {
  protected el: HTMLKiRatingElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiRating extends Components.KiRating {
}


@ProxyCmp({
  defineCustomElementFn: defineKiReasoning,
  inputs: ['doneLabel', 'duration', 'durationLabel', 'open', 'singularDurationLabel', 'status', 'thinkingLabel']
})
@Component({
  selector: 'ki-reasoning',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['doneLabel', 'duration', 'durationLabel', 'open', 'singularDurationLabel', 'status', 'thinkingLabel'],
})
export class KiReasoning {
  protected el: HTMLKiReasoningElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiReasoning extends Components.KiReasoning {
}


@ProxyCmp({
  defineCustomElementFn: defineKiRelativeTime,
  inputs: ['date', 'numeric', 'sync', 'threshold']
})
@Component({
  selector: 'ki-relative-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['date', 'numeric', 'sync', 'threshold'],
})
export class KiRelativeTime {
  protected el: HTMLKiRelativeTimeElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiRelativeTime extends Components.KiRelativeTime {}


@ProxyCmp({
  defineCustomElementFn: defineKiScroller,
  inputs: ['label', 'orientation']
})
@Component({
  selector: 'ki-scroller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [{ name: 'label', required: true }, 'orientation'],
})
export class KiScroller {
  protected el: HTMLKiScrollerElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiScroller extends Components.KiScroller {}


@ProxyCmp({
  defineCustomElementFn: defineKiSearch,
  inputs: ['backLabel', 'clearLabel', 'highlight', 'label', 'loading', 'loadingLabel', 'mode', 'name', 'open', 'placeholder', 'recentLabel', 'removeRecentLabel', 'suggestionCountPlural', 'suggestionCountSingular', 'suggestionsLabel', 'value']
})
@Component({
  selector: 'ki-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['backLabel', 'clearLabel', 'highlight', 'label', 'loading', 'loadingLabel', 'mode', 'name', 'open', 'placeholder', 'recentLabel', 'removeRecentLabel', 'suggestionCountPlural', 'suggestionCountSingular', 'suggestionsLabel', 'value'],
})
export class KiSearch {
  protected el: HTMLKiSearchElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiSearch extends Components.KiSearch {
}


@ProxyCmp({
  defineCustomElementFn: defineKiSearchSuggestion,
  inputs: ['description', 'recent', 'value']
})
@Component({
  selector: 'ki-search-suggestion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['description', 'recent', 'value'],
})
export class KiSearchSuggestion {
  protected el: HTMLKiSearchSuggestionElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSearchSuggestion extends Components.KiSearchSuggestion {}


@ProxyCmp({
  defineCustomElementFn: defineKiSegment,
  inputs: ['accessibleLabel', 'disabled', 'value']
})
@Component({
  selector: 'ki-segment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['accessibleLabel', 'disabled', { name: 'value', required: true }],
})
export class KiSegment {
  protected el: HTMLKiSegmentElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSegment extends Components.KiSegment {}


@ProxyCmp({
  defineCustomElementFn: defineKiSegmentedControl,
  inputs: ['fullWidth', 'label', 'size', 'value']
})
@Component({
  selector: 'ki-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['fullWidth', { name: 'label', required: true }, 'size', 'value'],
})
export class KiSegmentedControl {
  protected el: HTMLKiSegmentedControlElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiSegmentedControl extends Components.KiSegmentedControl {
}


@ProxyCmp({
  defineCustomElementFn: defineKiSelect,
  inputs: ['disabled', 'errorText', 'helpText', 'label', 'labelHint', 'name', 'placeholder', 'required', 'size', 'value']
})
@Component({
  selector: 'ki-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'labelHint', 'name', 'placeholder', 'required', 'size', 'value'],
})
export class KiSelect {
  protected el: HTMLKiSelectElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSelect extends Components.KiSelect {}


@ProxyCmp({
  defineCustomElementFn: defineKiSidebar,
  inputs: ['collapseLabel', 'collapsed', 'collapsible', 'expandLabel', 'label', 'preference']
})
@Component({
  selector: 'ki-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['collapseLabel', 'collapsed', 'collapsible', 'expandLabel', 'label', 'preference'],
})
export class KiSidebar {
  protected el: HTMLKiSidebarElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiSidebar extends Components.KiSidebar {
}


@ProxyCmp({
  defineCustomElementFn: defineKiSidebarGroup,
  inputs: ['label']
})
@Component({
  selector: 'ki-sidebar-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [{ name: 'label', required: true }],
})
export class KiSidebarGroup {
  protected el: HTMLKiSidebarGroupElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSidebarGroup extends Components.KiSidebarGroup {}


@ProxyCmp({
  defineCustomElementFn: defineKiSidebarItem,
  inputs: ['count', 'countLabel', 'current', 'href', 'iconName']
})
@Component({
  selector: 'ki-sidebar-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['count', 'countLabel', 'current', 'href', 'iconName'],
})
export class KiSidebarItem {
  protected el: HTMLKiSidebarItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSidebarItem extends Components.KiSidebarItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiSkeleton,
  inputs: ['animated', 'blockSize', 'inlineSize', 'lines', 'shape', 'size']
})
@Component({
  selector: 'ki-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['animated', 'blockSize', 'inlineSize', 'lines', 'shape', 'size'],
})
export class KiSkeleton {
  protected el: HTMLKiSkeletonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSkeleton extends Components.KiSkeleton {}


@ProxyCmp({
  defineCustomElementFn: defineKiSlider,
  inputs: ['centered', 'currency', 'disabled', 'format', 'helpText', 'label', 'marks', 'max', 'maximumLabel', 'min', 'minimumLabel', 'name', 'orientation', 'range', 'step', 'value']
})
@Component({
  selector: 'ki-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['centered', 'currency', 'disabled', 'format', 'helpText', 'label', 'marks', 'max', 'maximumLabel', 'min', 'minimumLabel', 'name', 'orientation', 'range', 'step', 'value'],
})
export class KiSlider {
  protected el: HTMLKiSliderElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSlider extends Components.KiSlider {}


@ProxyCmp({
  defineCustomElementFn: defineKiSpinner,
  inputs: ['label', 'showLabel', 'size', 'variant']
})
@Component({
  selector: 'ki-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [{ name: 'label', required: true }, 'showLabel', 'size', 'variant'],
})
export class KiSpinner {
  protected el: HTMLKiSpinnerElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSpinner extends Components.KiSpinner {}


@ProxyCmp({
  defineCustomElementFn: defineKiStack,
  inputs: ['align', 'direction', 'gap', 'justify', 'wrap']
})
@Component({
  selector: 'ki-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['align', 'direction', 'gap', 'justify', 'wrap'],
})
export class KiStack {
  protected el: HTMLKiStackElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiStack extends Components.KiStack {}


@ProxyCmp({
  defineCustomElementFn: defineKiStat,
  inputs: ['delta', 'deltaFormat', 'deltaLabel', 'direction', 'downLabel', 'format', 'label', 'unit', 'upLabel', 'value']
})
@Component({
  selector: 'ki-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['delta', 'deltaFormat', 'deltaLabel', 'direction', 'downLabel', 'format', { name: 'label', required: true }, 'unit', 'upLabel', { name: 'value', required: true }],
})
export class KiStat {
  protected el: HTMLKiStatElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiStat extends Components.KiStat {}


@ProxyCmp({
  defineCustomElementFn: defineKiStatus,
  inputs: ['label', 'ring', 'tone']
})
@Component({
  selector: 'ki-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'ring', 'tone'],
})
export class KiStatus {
  protected el: HTMLKiStatusElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiStatus extends Components.KiStatus {}


@ProxyCmp({
  defineCustomElementFn: defineKiStep,
  inputs: ['description', 'href', 'state']
})
@Component({
  selector: 'ki-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['description', 'href', 'state'],
})
export class KiStep {
  protected el: HTMLKiStepElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiStep extends Components.KiStep {}


@ProxyCmp({
  defineCustomElementFn: defineKiStepper,
  inputs: ['countLabel', 'currentLabel', 'doneLabel', 'errorLabel', 'label', 'orientation', 'summaryLabel', 'upcomingLabel']
})
@Component({
  selector: 'ki-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['countLabel', 'currentLabel', 'doneLabel', 'errorLabel', { name: 'label', required: true }, 'orientation', 'summaryLabel', 'upcomingLabel'],
})
export class KiStepper {
  protected el: HTMLKiStepperElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiStepper extends Components.KiStepper {}


@ProxyCmp({
  defineCustomElementFn: defineKiSuggestion,
  inputs: ['description']
})
@Component({
  selector: 'ki-suggestion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['description'],
})
export class KiSuggestion {
  protected el: HTMLKiSuggestionElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSuggestion extends Components.KiSuggestion {}


@ProxyCmp({
  defineCustomElementFn: defineKiSuggestions,
  inputs: ['composer', 'label', 'mode', 'variant']
})
@Component({
  selector: 'ki-suggestions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['composer', { name: 'label', required: true }, 'mode', 'variant'],
})
export class KiSuggestions {
  protected el: HTMLKiSuggestionsElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiSuggestions extends Components.KiSuggestions {
}


@ProxyCmp({
  defineCustomElementFn: defineKiSwitch,
  inputs: ['checked', 'disabled', 'helpText', 'name', 'size', 'value']
})
@Component({
  selector: 'ki-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'helpText', 'name', 'size', 'value'],
})
export class KiSwitch {
  protected el: HTMLKiSwitchElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiSwitch extends Components.KiSwitch {}


@ProxyCmp({
  defineCustomElementFn: defineKiTab,
  inputs: ['disabled', 'selected', 'value']
})
@Component({
  selector: 'ki-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'selected', 'value'],
})
export class KiTab {
  protected el: HTMLKiTabElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTab extends Components.KiTab {}


@ProxyCmp({
  defineCustomElementFn: defineKiTabPanel,
  inputs: ['value']
})
@Component({
  selector: 'ki-tab-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['value'],
})
export class KiTabPanel {
  protected el: HTMLKiTabPanelElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTabPanel extends Components.KiTabPanel {}


@ProxyCmp({
  defineCustomElementFn: defineKiTable,
  inputs: ['density', 'loading', 'rowSelectionLabel', 'selectAllLabel', 'selectable', 'stickyHeader']
})
@Component({
  selector: 'ki-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['density', 'loading', 'rowSelectionLabel', 'selectAllLabel', 'selectable', 'stickyHeader'],
})
export class KiTable {
  protected el: HTMLKiTableElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTable extends Components.KiTable {
}


@ProxyCmp({
  defineCustomElementFn: defineKiTabs,
  inputs: ['iconLayout', 'label', 'size', 'value', 'variant']
})
@Component({
  selector: 'ki-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['iconLayout', 'label', 'size', 'value', 'variant'],
})
export class KiTabs {
  protected el: HTMLKiTabsElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTabs extends Components.KiTabs {
}


@ProxyCmp({
  defineCustomElementFn: defineKiTextarea,
  inputs: ['autocomplete', 'disabled', 'errorText', 'helpText', 'label', 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'rows', 'size', 'value']
})
@Component({
  selector: 'ki-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['autocomplete', 'disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'rows', 'size', 'value'],
})
export class KiTextarea {
  protected el: HTMLKiTextareaElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTextarea extends Components.KiTextarea {}


@ProxyCmp({
  defineCustomElementFn: defineKiTimeInput,
  inputs: ['disabled', 'errorText', 'helpText', 'invalidTimeText', 'label', 'listLabel', 'max', 'min', 'name', 'pickerLabel', 'required', 'step', 'timeZone', 'value']
})
@Component({
  selector: 'ki-time-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'errorText', 'helpText', 'invalidTimeText', { name: 'label', required: true }, 'listLabel', 'max', 'min', 'name', 'pickerLabel', 'required', 'step', 'timeZone', 'value'],
})
export class KiTimeInput {
  protected el: HTMLKiTimeInputElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTimeInput extends Components.KiTimeInput {
}


@ProxyCmp({
  defineCustomElementFn: defineKiTimeline,
  inputs: ['label', 'order']
})
@Component({
  selector: 'ki-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'order'],
})
export class KiTimeline {
  protected el: HTMLKiTimelineElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTimeline extends Components.KiTimeline {}


@ProxyCmp({
  defineCustomElementFn: defineKiTimelineItem,
  inputs: ['datetime', 'detailsLabel', 'iconName', 'tone']
})
@Component({
  selector: 'ki-timeline-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['datetime', 'detailsLabel', 'iconName', 'tone'],
})
export class KiTimelineItem {
  protected el: HTMLKiTimelineItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTimelineItem extends Components.KiTimelineItem {}


@ProxyCmp({
  defineCustomElementFn: defineKiToast,
  inputs: ['dismissLabel', 'dismissed', 'dismissible', 'duration', 'heading', 'queued', 'tone']
})
@Component({
  selector: 'ki-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['dismissLabel', 'dismissed', 'dismissible', 'duration', 'heading', 'queued', 'tone'],
})
export class KiToast {
  protected el: HTMLKiToastElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiToast extends Components.KiToast {
}


@ProxyCmp({
  defineCustomElementFn: defineKiToaster,
  inputs: ['label', 'max', 'placement'],
  methods: ['show']
})
@Component({
  selector: 'ki-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'max', 'placement'],
})
export class KiToaster {
  protected el: HTMLKiToasterElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiToaster extends Components.KiToaster {}


@ProxyCmp({
  defineCustomElementFn: defineKiToolCall,
  inputs: ['approvalLabel', 'doneLabel', 'duration', 'errorLabel', 'failedLabel', 'inputLabel', 'locale', 'name', 'open', 'outputLabel', 'pendingLabel', 'retryLabel', 'retryable', 'runningLabel', 'status', 'toolTitle']
})
@Component({
  selector: 'ki-tool-call',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['approvalLabel', 'doneLabel', 'duration', 'errorLabel', 'failedLabel', 'inputLabel', 'locale', { name: 'name', required: true }, 'open', 'outputLabel', 'pendingLabel', 'retryLabel', 'retryable', 'runningLabel', 'status', 'toolTitle'],
})
export class KiToolCall {
  protected el: HTMLKiToolCallElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiToolCall extends Components.KiToolCall {
}


@ProxyCmp({
  defineCustomElementFn: defineKiToolbar,
  inputs: ['hideOnScroll', 'label', 'orientation', 'tone', 'variant']
})
@Component({
  selector: 'ki-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['hideOnScroll', { name: 'label', required: true }, 'orientation', 'tone', 'variant'],
})
export class KiToolbar {
  protected el: HTMLKiToolbarElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiToolbar extends Components.KiToolbar {}


@ProxyCmp({
  defineCustomElementFn: defineKiTooltip,
  inputs: ['for', 'heading', 'label', 'placement']
})
@Component({
  selector: 'ki-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['for', 'heading', 'label', 'placement'],
})
export class KiTooltip {
  protected el: HTMLKiTooltipElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTooltip extends Components.KiTooltip {}


@ProxyCmp({
  defineCustomElementFn: defineKiTopNav,
  inputs: ['collapseAt', 'headingLevel', 'label', 'navigationLabel', 'overflowLabel', 'screenTitle', 'scrollBehavior', 'size', 'sticky', 'subtitle', 'titleAlign', 'variant']
})
@Component({
  selector: 'ki-top-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['collapseAt', 'headingLevel', 'label', 'navigationLabel', 'overflowLabel', 'screenTitle', 'scrollBehavior', 'size', 'sticky', 'subtitle', 'titleAlign', 'variant'],
})
export class KiTopNav {
  protected el: HTMLKiTopNavElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiTopNav extends Components.KiTopNav {}


@ProxyCmp({
  defineCustomElementFn: defineKiTree,
  inputs: ['label', 'selection']
})
@Component({
  selector: 'ki-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'selection'],
})
export class KiTree {
  protected el: HTMLKiTreeElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTree extends Components.KiTree {
}


@ProxyCmp({
  defineCustomElementFn: defineKiTreeItem,
  inputs: ['disabled', 'expanded', 'href', 'iconName', 'lazy', 'loadingLabel', 'selected']
})
@Component({
  selector: 'ki-tree-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'expanded', 'href', 'iconName', 'lazy', 'loadingLabel', 'selected'],
})
export class KiTreeItem {
  protected el: HTMLKiTreeItemElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTreeItem extends Components.KiTreeItem {
}


@ProxyCmp({
  defineCustomElementFn: defineKiVideo,
  inputs: ['label']
})
@Component({
  selector: 'ki-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [{ name: 'label', required: true }],
})
export class KiVideo {
  protected el: HTMLKiVideoElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiVideo extends Components.KiVideo {}


