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
import { defineCustomElement as defineKiCard } from '@kimen/elements/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '@kimen/elements/components/ki-checkbox.js';
import { defineCustomElement as defineKiDialog } from '@kimen/elements/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '@kimen/elements/components/ki-divider.js';
import { defineCustomElement as defineKiIconButton } from '@kimen/elements/components/ki-icon-button.js';
import { defineCustomElement as defineKiIndicator } from '@kimen/elements/components/ki-indicator.js';
import { defineCustomElement as defineKiInput } from '@kimen/elements/components/ki-input.js';
import { defineCustomElement as defineKiList } from '@kimen/elements/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '@kimen/elements/components/ki-list-item.js';
import { defineCustomElement as defineKiOption } from '@kimen/elements/components/ki-option.js';
import { defineCustomElement as defineKiProgress } from '@kimen/elements/components/ki-progress.js';
import { defineCustomElement as defineKiQr } from '@kimen/elements/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '@kimen/elements/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '@kimen/elements/components/ki-radio-group.js';
import { defineCustomElement as defineKiScroller } from '@kimen/elements/components/ki-scroller.js';
import { defineCustomElement as defineKiSelect } from '@kimen/elements/components/ki-select.js';
import { defineCustomElement as defineKiStatus } from '@kimen/elements/components/ki-status.js';
import { defineCustomElement as defineKiSwitch } from '@kimen/elements/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '@kimen/elements/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '@kimen/elements/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '@kimen/elements/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '@kimen/elements/components/ki-textarea.js';
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


import type { KiAlertCustomEvent } from '@kimen/elements/components';

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
  inputs: ['disabled', 'name', 'size', 'tone', 'type', 'value', 'variant']
})
@Component({
  selector: 'ki-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'name', 'size', 'tone', 'type', 'value', 'variant'],
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
  defineCustomElementFn: defineKiCard
})
@Component({
  selector: 'ki-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
})
export class KiCard {
  protected el: HTMLKiCardElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiCard extends Components.KiCard {}


@ProxyCmp({
  defineCustomElementFn: defineKiCheckbox,
  inputs: ['checked', 'disabled', 'indeterminate', 'name', 'required', 'value']
})
@Component({
  selector: 'ki-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'indeterminate', 'name', 'required', 'value'],
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
  defineCustomElementFn: defineKiDialog,
  inputs: ['closeOnBackdrop', 'heading', 'open'],
  methods: ['show', 'close']
})
@Component({
  selector: 'ki-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['closeOnBackdrop', 'heading', 'open'],
})
export class KiDialog {
  protected el: HTMLKiDialogElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


import type { KiDialogCustomEvent } from '@kimen/elements/components';
import type { KiDialogCloseDetail as IKiDialogKiDialogCloseDetail } from '@kimen/elements/components';

export declare interface KiDialog extends Components.KiDialog {
  /**
   * Post-close notification for every close path. Footer actions report
`method` when they call `close()`, Escape reports `escape`, and opt-in
backdrop dismissal reports `backdrop`.
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
  defineCustomElementFn: defineKiIconButton,
  inputs: ['disabled', 'label', 'size', 'tone', 'variant']
})
@Component({
  selector: 'ki-icon-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'label', 'size', 'tone', 'variant'],
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
  defineCustomElementFn: defineKiIndicator,
  inputs: ['count', 'current', 'label']
})
@Component({
  selector: 'ki-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['count', 'current', 'label'],
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
  inputs: ['autocomplete', 'disabled', 'label', 'name', 'placeholder', 'readonly', 'required', 'type', 'value']
})
@Component({
  selector: 'ki-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['autocomplete', 'disabled', 'label', 'name', 'placeholder', 'readonly', 'required', 'type', 'value'],
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
  defineCustomElementFn: defineKiListItem
})
@Component({
  selector: 'ki-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
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
  defineCustomElementFn: defineKiProgress,
  inputs: ['indeterminate', 'label', 'max', 'shape', 'value']
})
@Component({
  selector: 'ki-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['indeterminate', 'label', 'max', 'shape', 'value'],
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
  inputs: ['disabled', 'label', 'name', 'required', 'value']
})
@Component({
  selector: 'ki-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', { name: 'label', required: true }, 'name', 'required', 'value'],
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
  defineCustomElementFn: defineKiScroller,
  inputs: ['label', 'orientation']
})
@Component({
  selector: 'ki-scroller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'orientation'],
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
  defineCustomElementFn: defineKiSelect,
  inputs: ['disabled', 'label', 'name', 'placeholder', 'required', 'value']
})
@Component({
  selector: 'ki-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'label', 'name', 'placeholder', 'required', 'value'],
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
  inputs: ['checked', 'disabled', 'name', 'value']
})
@Component({
  selector: 'ki-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'name', 'value'],
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
  inputs: ['label', 'value']
})
@Component({
  selector: 'ki-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'value'],
})
export class KiTabs {
  protected el: HTMLKiTabsElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


import type { KiTabsCustomEvent } from '@kimen/elements/components';

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
  inputs: ['autocomplete', 'disabled', 'label', 'name', 'placeholder', 'readonly', 'required', 'rows', 'value']
})
@Component({
  selector: 'ki-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['autocomplete', 'disabled', { name: 'label', required: true }, 'name', 'placeholder', 'readonly', 'required', 'rows', 'value'],
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
  inputs: ['label'],
})
export class KiVideo {
  protected el: HTMLKiVideoElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}


export declare interface KiVideo extends Components.KiVideo {}


