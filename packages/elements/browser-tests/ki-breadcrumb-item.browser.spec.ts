// @spec:096-ki-breadcrumb
import { afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { parkPointer } from './axe';
import { defineCustomElement as defineBreadcrumbItem } from '../dist/components/ki-breadcrumb-item.js';
import { defineCustomElement as defineBreadcrumb } from '../dist/components/ki-breadcrumb.js';

const fixture = document.createElement('main');

beforeAll(() => {
  defineBreadcrumbItem();
  defineBreadcrumb();
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

it('S3 follows destination property changes on an existing breadcrumb item', async () => {
  const breadcrumb = document.createElement('ki-breadcrumb');
  const ancestor = document.createElement('ki-breadcrumb-item');
  ancestor.href = '#workspace';
  ancestor.textContent = 'Workspace';
  const current = document.createElement('ki-breadcrumb-item');
  current.current = true;
  current.textContent = 'Settings';
  breadcrumb.append(ancestor, current);
  fixture.append(breadcrumb);

  const link = page.getByRole('link', { name: 'Workspace' });
  await expect.element(link).toHaveAttribute('href', '#workspace');

  ancestor.href = '#another-workspace';

  await expect.element(link).toHaveAttribute('href', '#another-workspace');
});
