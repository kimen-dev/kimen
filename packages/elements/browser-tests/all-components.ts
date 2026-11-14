// Every published custom element, registered from the BUILT output (what
// ships is what is asserted, Art. III). One list for the cross-cutting
// suites, so a new component is added in exactly one place.
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';
import { defineCustomElement as defineKiBadge } from '../dist/components/ki-badge.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiCard } from '../dist/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '../dist/components/ki-checkbox.js';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '../dist/components/ki-divider.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { defineCustomElement as defineKiIndicator } from '../dist/components/ki-indicator.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiProgress } from '../dist/components/ki-progress.js';
import { defineCustomElement as defineKiQr } from '../dist/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { defineCustomElement as defineKiScroller } from '../dist/components/ki-scroller.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { defineCustomElement as defineKiStatus } from '../dist/components/ki-status.js';
import { defineCustomElement as defineKiSwitch } from '../dist/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '../dist/components/ki-textarea.js';
import { defineCustomElement as defineKiTooltip } from '../dist/components/ki-tooltip.js';
import { defineCustomElement as defineKiVideo } from '../dist/components/ki-video.js';
import { visualGalleries } from './visual/galleries';
import type { VisualComponent } from './visual/galleries';

const definitions: readonly (() => void)[] = [
  defineKiAlert,
  defineKiAvatar,
  defineKiAvatarGroup,
  defineKiBadge,
  defineKiButton,
  defineKiCard,
  defineKiCheckbox,
  defineKiDialog,
  defineKiDivider,
  defineKiIconButton,
  defineKiIndicator,
  defineKiInput,
  defineKiList,
  defineKiListItem,
  defineKiOption,
  defineKiProgress,
  defineKiQr,
  defineKiRadio,
  defineKiRadioGroup,
  defineKiScroller,
  defineKiSelect,
  defineKiStatus,
  defineKiSwitch,
  defineKiTab,
  defineKiTabPanel,
  defineKiTabs,
  defineKiTextarea,
  defineKiTooltip,
  defineKiVideo,
];

/** Registers every `ki-*` element. Idempotent: each define guards itself. */
export function defineAllComponents(): void {
  for (const define of definitions) {
    define();
  }
}

/** Every component that has a state gallery — the whole published set. */
export const allComponents = Object.keys(visualGalleries) as VisualComponent[];
