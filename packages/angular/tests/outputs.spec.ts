// @spec:034-framework-wrappers
// Angular event binding (S2-analog; adversarial-review regression of a
// runtime-reproduced upstream defect): the kebab-case template binding
// (ki-dismiss) must receive the element's real CustomEvent EXACTLY ONCE
// through the native DOM listener path. The un-normalized 1.4.1 output
// threw "@Output ki-dismiss not initialized" on this exact binding, and a
// declared output would double-fire (native listener + output
// subscription under modern Ivy) — the normalization removes the output
// machinery entirely.
import '@angular/compiler';
import type { Type } from '@angular/core';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, describe, expect, it } from 'vitest';

// The ngc-compiled library output (partial-Ivy + JIT fallback): esbuild's
// test transform emits no DI metadata for the raw sources, so the runtime
// scenario exercises exactly what ships. `nx test` depends on `build`.
 
const { KiAlert } = (await import(
  // @ts-expect-error -- built artifact, no bundled types at this path
  '../dist/fesm2022/kimen-angular.mjs'
)) as { KiAlert: Type<unknown> };

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

describe('angular event outputs', () => {
  it('S2 delivers the ki-dismiss CustomEvent through the (ki-dismiss) template binding', () => {
    const received: unknown[] = [];

    @Component({
      imports: [KiAlert],
      template: `<ki-alert dismissible (ki-dismiss)="onDismiss($event)">Saved</ki-alert>`,
    })
    class HostComponent {
      onDismiss(event: unknown): void {
        received.push(event);
      }
    }

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('ki-alert');
    expect(alert).not.toBeNull();
    alert?.dispatchEvent(new CustomEvent('ki-dismiss', { detail: null }));
    expect(received).toHaveLength(1);
  });
});
