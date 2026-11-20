/* tslint:disable */
/* auto-generated angular directive proxies */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone } from '@angular/core';

import { ProxyCmp } from './angular-component-lib/utils';

import type { Components } from '@kimen/elements/components';

import { defineCustomElement as defineKiAlert } from '@kimen/elements/components/ki-alert.js';
import { defineCustomElement as defineKiAvatar } from '@kimen/elements/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '@kimen/elements/components/ki-avatar-group.js';
import { defineCustomElement as defineKiBadge } from '@kimen/elements/components/ki-badge.js';
import { defineCustomElement as defineKiButton } from '@kimen/elements/components/ki-button.js';
import { defineCustomElement as defineKiButtonGroup } from '@kimen/elements/components/ki-button-group.js';
import { defineCustomElement as defineKiCard } from '@kimen/elements/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '@kimen/elements/components/ki-checkbox.js';
import { defineCustomElement as defineKiCheckboxGroup } from '@kimen/elements/components/ki-checkbox-group.js';
import { defineCustomElement as defineKiChip } from '@kimen/elements/components/ki-chip.js';
import { defineCustomElement as defineKiChipGroup } from '@kimen/elements/components/ki-chip-group.js';
import { defineCustomElement as defineKiCopyButton } from '@kimen/elements/components/ki-copy-button.js';
import { defineCustomElement as defineKiCounter } from '@kimen/elements/components/ki-counter.js';
import { defineCustomElement as defineKiDialog } from '@kimen/elements/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '@kimen/elements/components/ki-divider.js';
import { defineCustomElement as defineKiEmptyState } from '@kimen/elements/components/ki-empty-state.js';
import { defineCustomElement as defineKiFab } from '@kimen/elements/components/ki-fab.js';
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
import { defineCustomElement as defineKiMenu } from '@kimen/elements/components/ki-menu.js';
import { defineCustomElement as defineKiMenuGroup } from '@kimen/elements/components/ki-menu-group.js';
import { defineCustomElement as defineKiMenuItem } from '@kimen/elements/components/ki-menu-item.js';
import { defineCustomElement as defineKiNote } from '@kimen/elements/components/ki-note.js';
import { defineCustomElement as defineKiOption } from '@kimen/elements/components/ki-option.js';
import { defineCustomElement as defineKiPopover } from '@kimen/elements/components/ki-popover.js';
import { defineCustomElement as defineKiProgress } from '@kimen/elements/components/ki-progress.js';
import { defineCustomElement as defineKiQr } from '@kimen/elements/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '@kimen/elements/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '@kimen/elements/components/ki-radio-group.js';
import { defineCustomElement as defineKiRelativeTime } from '@kimen/elements/components/ki-relative-time.js';
import { defineCustomElement as defineKiScroller } from '@kimen/elements/components/ki-scroller.js';
import { defineCustomElement as defineKiSegment } from '@kimen/elements/components/ki-segment.js';
import { defineCustomElement as defineKiSegmentedControl } from '@kimen/elements/components/ki-segmented-control.js';
import { defineCustomElement as defineKiSelect } from '@kimen/elements/components/ki-select.js';
import { defineCustomElement as defineKiSkeleton } from '@kimen/elements/components/ki-skeleton.js';
import { defineCustomElement as defineKiSlider } from '@kimen/elements/components/ki-slider.js';
import { defineCustomElement as defineKiSpinner } from '@kimen/elements/components/ki-spinner.js';
import { defineCustomElement as defineKiStack } from '@kimen/elements/components/ki-stack.js';
import { defineCustomElement as defineKiStat } from '@kimen/elements/components/ki-stat.js';
import { defineCustomElement as defineKiStatus } from '@kimen/elements/components/ki-status.js';
import { defineCustomElement as defineKiSwitch } from '@kimen/elements/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '@kimen/elements/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '@kimen/elements/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '@kimen/elements/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '@kimen/elements/components/ki-textarea.js';
import { defineCustomElement as defineKiToast } from '@kimen/elements/components/ki-toast.js';
import { defineCustomElement as defineKiToaster } from '@kimen/elements/components/ki-toaster.js';
import { defineCustomElement as defineKiTooltip } from '@kimen/elements/components/ki-tooltip.js';
import { defineCustomElement as defineKiVideo } from '@kimen/elements/components/ki-video.js';
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
  /**
   * Fired once after the user dismisses the alert — emitted after the alert is
hidden and focus has been handed to the next control. `detail` is `null`
and the event is not cancelable (the alert is already gone when it runs).
When to use: record acknowledgement, or advance an application flow after a
user closes the alert.
When NOT to use: do not treat it as a veto point, and do not expect it for
programmatic `dismissed` changes — it fires only for user activation.
   */
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
  defineCustomElementFn: defineKiButton,
  inputs: ['command', 'commandfor', 'disabled', 'loading', 'loadingLabel', 'name', 'size', 'tone', 'type', 'value', 'variant']
})
@Component({
  selector: 'ki-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['command', 'commandfor', 'disabled', 'loading', 'loadingLabel', 'name', 'size', 'tone', 'type', 'value', 'variant'],
})
export class KiButton {
  protected el: HTMLKiButtonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiButton extends Components.KiButton {}


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
  /**
   * Fires once when the user activates an action card by pointer or keyboard.
   */
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
  /**
   * Fires once for a committed user toggle with a copy of the current selection.
   */
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
  /**
   * Emitted after a filter chip changes its pressed state.
   */
  /**
   * Remove request for an input chip. Cancel it to keep application ownership of the chip.
   */
  /**
   * Emitted by an assist chip when its native button is activated.
   */
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
  /**
   * Emitted after moving a chip. Indices are zero-based positions in the visible chip collection.
   */
}


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
  /**
   * Fired after a successful clipboard write. The detail carries the exact text copied.
   */
  /**
   * Fired when the source cannot be read or clipboard writing is unavailable or fails.
   */
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
  /**
   * Post-close notification for every close path. Footer actions report
`method` when they call `close()`, Escape reports `escape`, and opt-in
backdrop dismissal reports `backdrop`. Invoker dismissals report `command`.
When to use: update application state after the dialog is already closed
and focus has returned through the native mechanism.
When NOT to use: do not expect this event to veto closing; it is not
cancelable in v1.
   */
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
  inputs: ['command', 'commandfor', 'disabled', 'expanded', 'label', 'loading', 'loadingLabel', 'pressed', 'size', 'tone', 'variant']
})
@Component({
  selector: 'ki-icon-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['command', 'commandfor', 'disabled', 'expanded', { name: 'label', required: true }, 'loading', 'loadingLabel', 'pressed', 'size', 'tone', 'variant'],
})
export class KiIconButton {
  protected el: HTMLKiIconButtonElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiIconButton extends Components.KiIconButton {}


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
  /**
   * Reports a load failure or rejected URL once per source attempt. Bubbles
and crosses shadow boundaries so consumers can observe it on a surface.
   */
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
  inputs: ['autocomplete', 'disabled', 'errorText', 'helpText', 'label', 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'size', 'type', 'value']
})
@Component({
  selector: 'ki-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['autocomplete', 'disabled', 'errorText', 'helpText', { name: 'label', required: true }, 'labelHint', 'name', 'placeholder', 'readonly', 'required', 'size', 'type', 'value'],
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
  /**
   * Reports the selected action and, for a checkbox or radio, its new checked state.
   */
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
  defineCustomElementFn: defineKiOption,
  inputs: ['disabled', 'value']
})
@Component({
  selector: 'ki-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'value'],
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
  defineCustomElementFn: defineKiPopover,
  inputs: ['arrow', 'for', 'kind', 'label', 'open', 'placement']
})
@Component({
  selector: 'ki-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['arrow', 'for', 'kind', 'label', 'open', 'placement'],
})
export class KiPopover {
  protected el: HTMLKiPopoverElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiPopover extends Components.KiPopover {
  /**
   * Emitted when the popover opens.
   */
  /**
   * Emitted when the popover closes.
   */
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
  /**
   * Emitted once per changed user choice with the new resolved value.
   */
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
  defineCustomElementFn: defineKiTabs,
  inputs: ['label', 'size', 'value']
})
@Component({
  selector: 'ki-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'size', 'value'],
})
export class KiTabs {
  protected el: HTMLKiTabsElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}



export declare interface KiTabs extends Components.KiTabs {
  /**
   * Fired once after a user-driven selection change from pointer or keyboard
navigation. `detail.value` is the resolved selected value and `value` is
already current when listeners run. Programmatic `value` writes and
first-render fallback are silent.
   */
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
  /**
   * Fired once when the toast leaves because its time ran out
(`reason: "timeout"`), the person used the dismiss button (`"button"`),
pressed Escape inside it (`"escape"`) or activated its action
(`"action"`), after it is hidden and focus has been handed on. Not
cancelable. When to use: remove the element, or record that the message
was seen. When NOT to use: do not expect it for programmatic `dismissed`
changes.
   */
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
  defineCustomElementFn: defineKiTooltip,
  inputs: ['label', 'placement']
})
@Component({
  selector: 'ki-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'placement'],
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


