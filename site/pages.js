// Shared preferences for the static site pages. The page remains usable when
// the browser blocks access to local storage.
const SCHEMES = ['auto', 'light', 'dark'];
const THEMES = ['onmars', 'material3'];
const material3Requests = new WeakMap();

function readPreference(root, key, allowed, fallback) {
  try {
    const value = root.defaultView.localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(root, key, value) {
  try {
    root.defaultView.localStorage.setItem(key, value);
  } catch {
    // The choice still takes effect for this visit.
  }
}

export function clearPreference(root, key) {
  try {
    root.defaultView.localStorage.removeItem(key);
  } catch {
    // The default still takes effect for this visit.
  }
}

export function readScheme(root = document) {
  return readPreference(root, 'kimen-scheme', SCHEMES, 'auto');
}

export function readTheme(root = document) {
  return readPreference(root, 'kimen-theme', THEMES, 'onmars');
}

export function resolveScheme(scheme, root = document) {
  if (scheme !== 'auto') return scheme;
  return root.defaultView?.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyScheme(scheme, root = document) {
  root.documentElement.dataset.kiColorScheme = resolveScheme(scheme, root);
}

/**
 * Wire every shared color-scheme control on the page (segmented.css): keep them in sync,
 * remember an explicit choice, and follow system changes while Auto is active. With no saved
 * choice the page follows the system (031 FR-003).
 */
export function wireSchemeControls(root, { signal, onChange } = {}) {
  const radios = [...root.querySelectorAll('[data-scheme-control] input[type="radio"]')];
  const media = root.defaultView?.matchMedia('(prefers-color-scheme: light)');
  let preference = readScheme(root);

  const set = (scheme) => {
    preference = scheme;
    applyScheme(scheme, root);
    for (const radio of radios) radio.checked = radio.value === scheme;
  };
  set(preference);

  const selectScheme = (event) => {
    const control = event.currentTarget;
    if (!control.checked) return;
    set(control.value);
    writePreference(root, 'kimen-scheme', preference);
    onChange?.();
  };
  // A click on the scheme already shown is still an explicit choice and is remembered;
  // it fires no change event, so both events select.
  for (const radio of radios) {
    radio.addEventListener('change', selectScheme, { signal });
    radio.addEventListener('click', selectScheme, { signal });
  }
  media?.addEventListener(
    'change',
    () => {
      if (preference !== 'auto') return;
      applyScheme(preference, root);
      onChange?.();
    },
    { signal },
  );

  return set;
}

/** Request the optional palette once. Leave a failed request available for retry. */
export function ensureMaterial3(root = document) {
  const pending = material3Requests.get(root);
  if (pending) return pending;

  const existing = root.getElementById('material3-css');
  if (existing?.sheet) return Promise.resolve(true);

  const link = existing ?? root.createElement('link');
  const request = new Promise((resolve) => {
    link.addEventListener('load', () => resolve(true), { once: true });
    link.addEventListener(
      'error',
      () => {
        link.remove();
        resolve(false);
      },
      { once: true },
    );
    if (!existing) {
      link.id = 'material3-css';
      link.rel = 'stylesheet';
      link.href = new window.URL('./assets/tokens/tokens.material3.css', import.meta.url).href;
      root.head.append(link);
    }
  }).finally(() => material3Requests.delete(root));
  material3Requests.set(root, request);
  return request;
}

/** Load the Kimen element bundle once. It registers the custom elements lazily. */
let bundle;
export function loadKimenElements() {
  const bundleUrl = new window.URL('./assets/elements/kimen/kimen.esm.js', import.meta.url).href;
  bundle ??= import(/* @vite-ignore */ bundleUrl).catch(() => undefined);
  return bundle;
}

/** Wire the privacy page: its scheme control and the saved theme. Returns the listener cleanup. */
export function initializePrivacy(root = document) {
  const controller = new root.defaultView.AbortController();
  wireSchemeControls(root, { signal: controller.signal });
  for (const control of root.querySelectorAll('[data-privacy-scheme]')) control.hidden = false;
  if (readTheme(root) === 'material3') {
    void ensureMaterial3(root).then((loaded) => {
      if (controller.signal.aborted) return;
      if (loaded) root.documentElement.dataset.kiTheme = 'material3';
      else root.documentElement.removeAttribute('data-ki-theme');
    });
  }
  return () => controller.abort();
}

if (document.body?.dataset.kimenPage === 'privacy') initializePrivacy(document);
