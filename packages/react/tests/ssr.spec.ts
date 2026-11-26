import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { KiAlert } from '../src/ki-alert';

describe('React wrapper server rendering', () => {
  it('renders host markup and HTML attributes while deferring element props to the browser', () => {
    const onKiDismiss = vi.fn();
    const markup = renderToString(
      createElement(KiAlert, { id: 'notice', tone: 'danger', onKiDismiss }, 'Saved'),
    );

    expect(KiAlert.displayName).toBe('ki-alert');
    expect(markup).toBe('<ki-alert id="notice">Saved</ki-alert>');
    expect(onKiDismiss).not.toHaveBeenCalled();
  });
});
