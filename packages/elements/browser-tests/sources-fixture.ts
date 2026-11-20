import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { defineCustomElement as defineCitation } from '../dist/components/ki-citation.js';
import { defineCustomElement as defineSource } from '../dist/components/ki-source.js';
import { defineCustomElement as defineSources } from '../dist/components/ki-sources.js';
import { parkPointer } from './axe';

export const definitions = `
  <ki-source id="findings" href="https://example.net/findings" title="Findings" snippet="Observed results."></ki-source>
  <ki-source id="methods" href="https://example.org/methods" title="Methods" snippet="How the study ran."></ki-source>
`;

export function sourcesFixture(): HTMLElement {
  const styles = document.createElement('style');
  const fixture = document.createElement('main');
  beforeAll(() => {
    defineCitation();
    defineSources();
    defineSource();
    styles.textContent = tokensCss;
    document.head.append(styles);
    document.body.append(fixture);
  });
  afterEach(async () => {
    fixture.removeAttribute('dir');
    fixture.removeAttribute('data-ki-density');
    fixture.removeAttribute('style');
    fixture.replaceChildren();
    await parkPointer();
  });
  afterAll(() => {
    fixture.remove();
    styles.remove();
  });
  return fixture;
}

export function shadowLinkHasFocus(element: Element | null): boolean {
  const root = element?.getRootNode();
  return root instanceof ShadowRoot && root.activeElement === element;
}
