/* Kimen landing behavior: theme/scheme switching + lazy component loading.
   The head inline script has already applied persisted attributes pre-paint;
   this module wires the controls and defers every non-critical byte. */

const root = document.documentElement;
const MATERIAL3_CSS = './assets/tokens/tokens.material3.css';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: session-only */
    }
  },
};

/** Load the material3 stylesheet once; resolves when it is usable. */
let material3Ready = document.getElementById('material3-css') ? Promise.resolve() : null;

function ensureMaterial3() {
  if (!material3Ready) {
    material3Ready = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MATERIAL3_CSS;
      link.id = 'material3-css';
      link.onload = () => resolve();
      link.onerror = () => resolve(); // stay onmars: unknown theme matches no selector
      document.head.appendChild(link);
    });
  }
  return material3Ready;
}

/** One page-wide morph per switch, skipped under reduced motion. */
function animateFlip() {
  if (reducedMotion.matches) {
    return;
  }
  root.classList.add('theme-anim');
  window.clearTimeout(animateFlip.timer);
  animateFlip.timer = window.setTimeout(() => {
    root.classList.remove('theme-anim');
  }, 400);
}

// Monotonic token: only the LATEST requested theme may apply after an await
// (on a slow connection the material3 load can outlive a newer selection).
let themeRequest = 0;

async function applyTheme(theme) {
  const request = ++themeRequest;
  if (theme === 'material3') {
    await ensureMaterial3();
    if (request !== themeRequest) {
      return; // stale: the user picked something newer while the CSS loaded
    }
    animateFlip();
    root.setAttribute('data-ki-theme', 'material3');
  } else {
    animateFlip();
    root.removeAttribute('data-ki-theme');
  }
  store.set('kimen-theme', theme);
}

function applyScheme(scheme) {
  animateFlip();
  if (scheme === 'light' || scheme === 'dark') {
    root.setAttribute('data-ki-color-scheme', scheme);
  } else {
    root.removeAttribute('data-ki-color-scheme');
  }
  store.set('kimen-scheme', scheme);
}

function syncControl(fieldsetId, currentValue) {
  const fieldset = document.getElementById(fieldsetId);
  if (!fieldset) {
    return;
  }
  for (const input of fieldset.querySelectorAll('input')) {
    input.checked = input.value === currentValue;
  }
}

function wireControl(fieldsetId, onChange) {
  const fieldset = document.getElementById(fieldsetId);
  if (!fieldset) {
    return;
  }
  for (const input of fieldset.querySelectorAll('input')) {
    input.addEventListener('change', () => {
      if (input.checked) {
        onChange(input.value);
      }
    });
  }
}

function syncControls() {
  syncControl('theme-control', root.dataset.kiTheme === 'material3' ? 'material3' : 'onmars');
  syncControl('scheme-control', root.getAttribute('data-ki-color-scheme') ?? 'auto');
}

wireControl('theme-control', applyTheme);
wireControl('scheme-control', applyScheme);
syncControls();
// The browser restores radio state after this module runs (reload/bfcache);
// re-assert reality once the page is shown.
window.addEventListener('pageshow', syncControls);

// Warm the second theme when the browser is idle: the first flip feels instant.
(window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 2000)))(() => {
  const hint = document.createElement('link');
  hint.rel = 'prefetch';
  hint.as = 'style';
  hint.href = MATERIAL3_CSS;
  document.head.appendChild(hint);
});

// Live components: pay for @kimen/elements only when the specimen approaches.
const specimen = document.getElementById('specimen');
if (specimen) {
  const load = () =>
    import('./assets/elements/kimen/kimen.esm.js').catch(() => {
      /* specimen stays skeleton; the rest of the page is unaffected */
    });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(specimen);
  } else {
    load();
  }
}
