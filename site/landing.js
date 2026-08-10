/* Progressive behavior shared by the landing and playground. The document is
   complete without this module; JavaScript adds persisted themes, live custom
   elements, the CEM-derived catalog and the dialog demonstration. */

const initializedDocuments = new WeakMap();
const material3Requests = new WeakMap();
const themeRequestIds = new WeakMap();

function windowFor(root) {
  return root.defaultView ?? window;
}

function storageFor(root) {
  try {
    return windowFor(root).localStorage;
  } catch {
    return null;
  }
}

function readPreference(root, key) {
  try {
    return storageFor(root)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writePreference(root, key, value) {
  try {
    storageFor(root)?.setItem(key, value);
  } catch {
    // A hardened or private context may intentionally disable storage.
  }
}

function material3Url(root = document) {
  return new (windowFor(root).URL)('./assets/tokens/tokens.material3.css', import.meta.url).href;
}

function prefersReducedMotion(root) {
  return windowFor(root).matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function animateThemeFlip(root) {
  if (prefersReducedMotion(root)) {
    return;
  }

  const element = root.documentElement;
  const view = windowFor(root);
  element.classList.add('theme-anim');
  view.clearTimeout(animateThemeFlip.timer);
  animateThemeFlip.timer = view.setTimeout(() => element.classList.remove('theme-anim'), 500);
}

function ensureMaterial3(root) {
  const existing = root.getElementById('material3-css');
  if (existing) {
    return Promise.resolve();
  }

  let request = material3Requests.get(root);
  if (!request) {
    request = new Promise((resolve) => {
      const link = root.createElement('link');
      link.id = 'material3-css';
      link.rel = 'stylesheet';
      link.href = material3Url(root);
      link.addEventListener('load', resolve, { once: true });
      // The default Onmars variables remain valid if a network policy blocks
      // the optional second theme, so failure is deliberately non-fatal.
      link.addEventListener('error', resolve, { once: true });
      root.head.append(link);
    });
    material3Requests.set(root, request);
  }
  return request;
}

function announceThemeChange(root) {
  const view = windowFor(root);
  root.dispatchEvent(
    new view.CustomEvent('kimen-theme-change', {
      detail: {
        theme: root.documentElement.dataset.kiTheme ?? 'onmars',
        scheme: root.documentElement.dataset.kiColorScheme ?? 'auto',
      },
    }),
  );
}

/** Apply a token theme without allowing a slow stylesheet request to win a race. */
export async function applyTheme(theme, root = document) {
  const requestId = (themeRequestIds.get(root) ?? 0) + 1;
  themeRequestIds.set(root, requestId);

  if (theme === 'material3') {
    await ensureMaterial3(root);
    if (themeRequestIds.get(root) !== requestId) {
      return;
    }
    animateThemeFlip(root);
    root.documentElement.dataset.kiTheme = 'material3';
  } else {
    animateThemeFlip(root);
    root.documentElement.removeAttribute('data-ki-theme');
    theme = 'onmars';
  }

  writePreference(root, 'kimen-theme', theme);
  syncThemeControls(root);
  announceThemeChange(root);
}

/** Apply an explicit scheme or return the document to operating-system auto. */
export function applyScheme(scheme, root = document) {
  animateThemeFlip(root);
  if (scheme === 'light' || scheme === 'dark') {
    root.documentElement.dataset.kiColorScheme = scheme;
  } else {
    root.documentElement.removeAttribute('data-ki-color-scheme');
    scheme = 'auto';
  }

  writePreference(root, 'kimen-scheme', scheme);
  syncThemeControls(root);
  announceThemeChange(root);
}

/** Keep every desktop, mobile and in-content control aligned to one truth. */
export function syncThemeControls(root = document) {
  const currentTheme =
    root.documentElement.dataset.kiTheme === 'material3' ? 'material3' : 'onmars';
  const currentScheme = root.documentElement.dataset.kiColorScheme ?? 'auto';

  for (const input of root.querySelectorAll('[data-theme-control] input[type="radio"]')) {
    input.checked = input.value === currentTheme;
  }
  for (const input of root.querySelectorAll('[data-scheme-control] input[type="radio"]')) {
    input.checked = input.value === currentScheme;
  }
}

function componentDeclarations(manifest) {
  if (!manifest || !Array.isArray(manifest.modules)) {
    return [];
  }

  return manifest.modules
    .flatMap((module) => (Array.isArray(module.declarations) ? module.declarations : []))
    .filter(
      (declaration) =>
        typeof declaration?.tagName === 'string' && declaration.tagName.startsWith('ki-'),
    )
    .map((declaration) => ({
      description:
        typeof declaration.description === 'string' && declaration.description.trim()
          ? declaration.description.trim().split('\n')[0]
          : 'A contract-driven Kimen custom element.',
      tagName: declaration.tagName,
    }))
    .sort((left, right) => left.tagName.localeCompare(right.tagName));
}

/** Render manifest data as text nodes, never as executable markup. */
export function renderCatalog(manifest, root = document) {
  const grid = root.getElementById('catalog-grid');
  if (!grid) {
    return;
  }

  const declarations = componentDeclarations(manifest);
  const count = root.getElementById('component-count');
  if (count && declarations.length > 0) {
    count.textContent = String(declarations.length);
    count.setAttribute('value', String(declarations.length));
  }
  const catalogCount = root.getElementById('catalog-count');
  if (catalogCount && declarations.length > 0) {
    catalogCount.textContent = String(declarations.length);
  }

  grid.replaceChildren();
  for (const declaration of declarations) {
    const card = root.createElement('a');
    card.className = 'catalog-card panel';
    card.href = `./docs/components/${declaration.tagName.slice(3)}/`;

    const title = root.createElement('span');
    title.className = 'catalog-tag';
    title.textContent = `<${declaration.tagName}>`;
    const description = root.createElement('span');
    description.className = 'catalog-description';
    description.textContent = declaration.description;
    card.append(title, description);
    grid.append(card);
  }

  if (declarations.length === 0) {
    renderCatalogFallback(root);
  }
  grid.setAttribute('aria-busy', 'false');
}

function renderCatalogFallback(root) {
  const grid = root.getElementById('catalog-grid');
  if (!grid) {
    return;
  }

  grid.replaceChildren();
  const fallback = root.createElement('p');
  fallback.className = 'catalog-fallback panel';
  const link = root.createElement('a');
  link.href = './docs/components/alert/';
  link.textContent = 'Browse all components in the documentation.';
  fallback.append(link);
  grid.append(fallback);
  grid.setAttribute('aria-busy', 'false');
}

async function loadCatalog(root) {
  if (!root.getElementById('catalog-grid')) {
    return;
  }

  try {
    const manifestUrl = new (windowFor(root).URL)(
      './assets/elements/custom-elements.json',
      import.meta.url,
    );
    const response = await windowFor(root).fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`manifest request failed: ${response.status}`);
    }
    renderCatalog(await response.json(), root);
  } catch {
    renderCatalogFallback(root);
  }
}

let elementsRequest;

/** Load the canonical Stencil browser build once when a live surface approaches. */
export function loadKimenElements() {
  const bundleUrl = new window.URL('./assets/elements/kimen/kimen.esm.js', import.meta.url).href;
  elementsRequest ??= import(/* @vite-ignore */ bundleUrl).catch(() => undefined);
  return elementsRequest;
}

function observeComponentSurfaces(root, cleanups) {
  const surfaces = [...root.querySelectorAll('[data-component-surface]')];
  if (surfaces.length === 0) {
    return;
  }

  const view = windowFor(root);
  if (!('IntersectionObserver' in view)) {
    void loadKimenElements();
    return;
  }

  const observer = new view.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadKimenElements();
      }
    },
    { rootMargin: '600px' },
  );
  for (const surface of surfaces) {
    observer.observe(surface);
  }
  cleanups.push(() => observer.disconnect());
}

function wireDialog(root, cleanups) {
  const dialog = root.getElementById('demo-dialog');
  const open = root.getElementById('open-demo-dialog');
  const closeButtons = [
    root.getElementById('cancel-demo-dialog'),
    root.getElementById('confirm-demo-dialog'),
  ].filter(Boolean);

  if (!dialog || !open) {
    return;
  }

  const show = () => {
    void loadKimenElements().then(() => dialog.show?.());
  };
  const close = () => dialog.close?.();
  open.addEventListener('click', show);
  for (const button of closeButtons) {
    button.addEventListener('click', close);
  }
  cleanups.push(() => {
    open.removeEventListener('click', show);
    for (const button of closeButtons) {
      button.removeEventListener('click', close);
    }
  });
}

function prefetchMaterial3(root, cleanups) {
  if (root.querySelector('link[data-material3-prefetch]')) {
    return;
  }

  const view = windowFor(root);
  const schedule = view.requestIdleCallback ?? ((callback) => view.setTimeout(callback, 2000));
  const cancel = view.cancelIdleCallback ?? view.clearTimeout;
  const request = schedule(() => {
    const hint = root.createElement('link');
    hint.rel = 'prefetch';
    hint.as = 'style';
    hint.href = material3Url(root);
    hint.dataset.material3Prefetch = '';
    root.head.append(hint);
  });
  cleanups.push(() => cancel.call(view, request));
}

/** Initialize one site document. Repeated calls reuse the same cleanup handle. */
export function initializeLanding(root = document) {
  const existingCleanup = initializedDocuments.get(root);
  if (existingCleanup) {
    return existingCleanup;
  }

  const cleanups = [];
  const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof windowFor(root).HTMLInputElement) || !input.checked) {
      return;
    }
    if (input.closest('[data-theme-control]')) {
      void applyTheme(input.value, root);
    } else if (input.closest('[data-scheme-control]')) {
      applyScheme(input.value, root);
    }
  };
  const handlePageShow = () => syncThemeControls(root);

  root.addEventListener('change', handleChange);
  windowFor(root).addEventListener('pageshow', handlePageShow);
  cleanups.push(() => root.removeEventListener('change', handleChange));
  cleanups.push(() => windowFor(root).removeEventListener('pageshow', handlePageShow));

  const storedTheme = readPreference(root, 'kimen-theme');
  const storedScheme = readPreference(root, 'kimen-scheme');
  if (storedTheme === 'material3') {
    root.documentElement.dataset.kiTheme = 'material3';
    void ensureMaterial3(root);
  } else if (storedTheme === 'onmars') {
    root.documentElement.removeAttribute('data-ki-theme');
  }
  if (storedScheme === 'light' || storedScheme === 'dark') {
    root.documentElement.dataset.kiColorScheme = storedScheme;
  } else if (storedScheme === 'auto') {
    root.documentElement.removeAttribute('data-ki-color-scheme');
  } else {
    root.documentElement.dataset.kiColorScheme = 'dark';
    writePreference(root, 'kimen-scheme', 'dark');
  }

  syncThemeControls(root);
  prefetchMaterial3(root, cleanups);
  observeComponentSurfaces(root, cleanups);
  wireDialog(root, cleanups);
  void loadCatalog(root);

  const cleanup = () => {
    for (const dispose of cleanups.splice(0)) {
      dispose();
    }
    initializedDocuments.delete(root);
  };
  initializedDocuments.set(root, cleanup);
  return cleanup;
}

if (document.body?.dataset.kimenPage === 'landing') {
  initializeLanding(document);
}
