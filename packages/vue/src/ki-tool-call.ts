/* eslint-disable */
/* tslint:disable */
/* auto-generated vue proxies */
import { defineContainer, type StencilVueComponent } from '@stencil/vue-output-target/runtime';

import type { JSX } from '@kimen/elements/components';

import { defineCustomElement as defineKiToolCall } from '@kimen/elements/components/ki-tool-call.js';



export const KiToolCall: StencilVueComponent<JSX.KiToolCall> = /*@__PURE__*/ defineContainer<JSX.KiToolCall>('ki-tool-call', defineKiToolCall, [
  'name',
  'toolTitle',
  'status',
  'duration',
  'open',
  'locale',
  'retryable',
  'pendingLabel',
  'runningLabel',
  'doneLabel',
  'failedLabel',
  'approvalLabel',
  'inputLabel',
  'outputLabel',
  'errorLabel',
  'retryLabel',
  'ki-tool-status-change',
  'ki-tool-retry'
], [
  'ki-tool-status-change',
  'ki-tool-retry'
]);

