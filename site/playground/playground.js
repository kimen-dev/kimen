import {
  clearPreference,
  ensureMaterial3,
  loadKimenElements,
  readTheme,
  wireSchemeControls,
  writePreference,
} from '../pages.js';

const initializedDocuments = new WeakMap();
const INITIAL_THEME = 'onmars';
const INITIAL_SCHEME = 'auto';
const CHANGE_HIGHLIGHT_MS = 600;

/** Normalize the common computed rgb()/rgba() forms for easy comparison. */
function formatColor(color) {
  const rgb = /^rgba?\(([^)]+)\)$/u.exec(color);
  if (!rgb) return color;
  const [red, green, blue, alpha = 1] = rgb[1]
    .trim()
    .split(/[\s,/]+/u)
    .map(Number);
  const bytes = [red, green, blue];
  if (alpha < 1) bytes.push(alpha * 255);
  if (!bytes.every(Number.isFinite)) return color;
  return `#${bytes.map((byte) => Math.round(byte).toString(16).padStart(2, '0')).join('')}`;
}

/** Read the authored declarations for the matching root in the shipped token stylesheets. */
function tokenDeclarations(root, tokens) {
  const declarations = new Map();
  const view = root.defaultView;
  const html = root.documentElement;

  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.media && !view.matchMedia(rule.media.mediaText).matches) continue;
      if (rule instanceof view.CSSSupportsRule && !view.CSS.supports(rule.conditionText)) continue;
      if (rule.selectorText && rule.style && html.matches(rule.selectorText)) {
        for (const token of tokens) {
          const value = rule.style.getPropertyValue(token).trim();
          if (value) declarations.set(token, value);
        }
      } else if (rule.cssRules) {
        walk(rule.cssRules);
      }
    }
  };
  for (const sheet of root.styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin sheets are unreadable and are not token sources.
    }
  }
  return declarations;
}

/**
 * Show primitives by their short names, as the reference does: var(--ki-color-white-100) reads
 * white-100. The minified token CSS has no space after its commas; put one back.
 */
function shortDeclaration(value) {
  return value
    .replace(
      /var\(--ki-(?:color-|foundation-migrated-[a-z]+-(?:material3-(?:dark-)?)?)([a-z0-9-]+)\)/gu,
      '$1',
    )
    .replace(/,(?=\S)/gu, ', ');
}

// The drawer's groups, matched in this order: status and primary tokens also start with
// surface-, text- or outline-. Shape is the semantic corner set; --ki-radius-* is the
// primitive scale it points at.
const TOKEN_GROUPS = [
  ['status', /^--ki-(?:surface|text|outline)-(?:success|danger|warning|info)(?:-|$)/u],
  ['primary', /^--ki-(?:surface|text|outline)-primary(?:-|$)/u],
  ['surface', /^--ki-surface-/u],
  ['text', /^--ki-text-/u],
  ['outline', /^--ki-outline-/u],
  ['shape', /^--ki-corner-/u],
];
const GROUP_ORDER = ['surface', 'primary', 'text', 'outline', 'status', 'shape'];

/** Every semantic token the shipped stylesheets declare at the root, by drawer group. */
function semanticTokens(root) {
  const groups = new Map(GROUP_ORDER.map((group) => [group, []]));
  const seen = new Set();
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) walk(rule.cssRules);
      if (!rule.style || !rule.selectorText?.includes(':root')) continue;
      for (const name of rule.style) {
        if (seen.has(name)) continue;
        const group = TOKEN_GROUPS.find(([, pattern]) => pattern.test(name))?.[0];
        if (!group) continue;
        seen.add(name);
        groups.get(group).push(name);
      }
    }
  };
  for (const sheet of root.styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin sheets are unreadable and are not token sources.
    }
  }
  return GROUP_ORDER.flatMap((group) => groups.get(group).map((token) => ({ group, token })));
}

/**
 * Replace the no-JavaScript sample rows with the full semantic set (#520, item 16). A token
 * whose value is a color gets a swatch; dimensions and images do not.
 */
function renderTokenRows(root) {
  const tbody = root.querySelector('.token-table tbody');
  const empty = tbody?.querySelector('[data-token-empty]');
  const tokens = semanticTokens(root);
  if (!tbody || !empty || tokens.length === 0) return;
  const styles = root.defaultView.getComputedStyle(root.documentElement);
  const rows = tokens.map(({ group, token }) => {
    const row = root.createElement('tr');
    row.className = 'token-row';
    row.dataset.group = group;
    const name = root.createElement('th');
    name.scope = 'row';
    const code = root.createElement('code');
    code.textContent = token;
    name.append(code);
    const declared = root.createElement('td');
    const declaredValue = root.createElement('span');
    declaredValue.dataset.tokenDeclared = '';
    declaredValue.textContent = '—';
    declared.append(declaredValue);
    const current = root.createElement('td');
    if (root.defaultView.CSS.supports('color', styles.getPropertyValue(token).trim())) {
      const swatch = root.createElement('span');
      swatch.className = 'token-swatch';
      swatch.dataset.swatch = '';
      swatch.setAttribute('aria-hidden', 'true');
      current.append(swatch);
    }
    const value = root.createElement('span');
    value.dataset.tokenValue = token;
    value.textContent = '—';
    current.append(value);
    row.append(name, declared, current);
    return row;
  });
  for (const row of tbody.querySelectorAll('.token-row')) row.remove();
  empty.before(...rows);
}

function inspectTokens(root, rows, previous) {
  const view = root.defaultView;
  const styles = view.getComputedStyle(root.documentElement);
  const declarations = tokenDeclarations(
    root,
    rows.map(({ token }) => token),
  );
  const probe = root.createElement('span');
  probe.hidden = true;
  probe.className = 'token-color-probe';
  root.body.append(probe);

  const changed = [];
  for (const { row, token, declared, current, swatch } of rows) {
    const raw = styles.getPropertyValue(token).trim();
    // A token declared `initial` is deliberately unset in this theme (onmars draws no
    // tooltip arrow image, for instance): say so rather than report it unavailable.
    let value = raw || (declarations.get(token) === 'initial' ? 'unset' : 'Unavailable');
    if (swatch && raw) {
      probe.style.color = `var(${token})`;
      value = formatColor(view.getComputedStyle(probe).color);
      swatch.style.setProperty('--ki-site-swatch-color', `var(${token})`);
    }
    declared.textContent = shortDeclaration(declarations.get(token) ?? '') || 'Unavailable';
    current.textContent = value;
    if (previous.has(token) && previous.get(token) !== value) changed.push(row);
    previous.set(token, value);
  }
  probe.remove();
  return changed;
}

function wireFilter(root, rows, signal) {
  const input = root.querySelector('[data-token-filter]');
  const empty = root.querySelector('[data-token-empty]');
  const groups = root.querySelector('[data-token-groups]');
  const results = root.querySelector('[data-token-results]');
  const apply = () => {
    const query = input.value.trim().toLowerCase();
    const group = groups.querySelector('input:checked').value;
    let matches = 0;
    for (const { row, token } of rows) {
      const visible = (group === 'all' || row.dataset.group === group) && token.includes(query);
      row.hidden = !visible;
      if (visible) matches += 1;
    }
    empty.hidden = matches > 0;
    results.textContent = matches === 1 ? '1 matching token' : `${matches} matching tokens`;
  };

  input.addEventListener('input', apply, { signal });
  groups.addEventListener('change', apply, { signal });
  root.querySelector('[data-clear-filter]').addEventListener(
    'click',
    () => {
      input.value = '';
      groups.querySelector('input[value="all"]').checked = true;
      apply();
      input.focus();
    },
    { signal },
  );
}

function wireDrawer(root, signal) {
  const body = root.getElementById('token-table-wrap');
  const toggle = root.querySelector('[data-drawer-toggle]');
  toggle.addEventListener(
    'click',
    () => {
      body.hidden = !body.hidden;
      toggle.setAttribute('aria-expanded', String(!body.hidden));
    },
    { signal },
  );
}

function wireDeployment(root, signal) {
  const form = root.getElementById('deployment-form');
  const status = root.getElementById('deployment-status');
  const progress = root.getElementById('deployment-progress');
  const progressValue = root.getElementById('deployment-progress-value');

  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const fields = new root.defaultView.FormData(form);
      status.textContent = `${fields.get('service')} is deployed to ${fields.get('region')}.`;
      status.dismissed = false;
      status.hidden = false;
      progress.value = 87;
      progress.setAttribute('value', '87');
      progressValue.textContent = '87%';
    },
    { signal },
  );
}

/** Initialize the playground once per document and return its listener cleanup. */
export function initializePlayground(root = document) {
  const existingCleanup = initializedDocuments.get(root);
  if (existingCleanup) return existingCleanup;

  const view = root.defaultView;
  const { documentElement: html } = root;
  const controller = new view.AbortController();
  const { signal } = controller;
  renderTokenRows(root);
  const rows = [...root.querySelectorAll('.token-row')].map((row) => {
    const current = row.querySelector('[data-token-value]');
    return {
      row,
      token: current.dataset.tokenValue,
      current,
      declared: row.querySelector('[data-token-declared]'),
      swatch: row.querySelector('[data-swatch]'),
    };
  });
  const values = new Map();
  const themeInputs = [...root.querySelectorAll('[data-theme-control] input')];
  const themeName = root.getElementById('resolved-theme');
  const currentColumn = root.getElementById('current-col');
  let themeRequest = 0;
  let highlight;
  let highlightedRows = new Set();

  const refresh = (animate = true) => {
    const theme = html.dataset.kiTheme === 'material3' ? 'Material 3' : 'onmars';
    const scheme = html.dataset.kiColorScheme;
    themeName.value = `${theme} · ${scheme}`;
    currentColumn.textContent = `Now · ${theme} ${scheme}`;
    const changed = inspectTokens(root, rows, values);
    if (
      !animate ||
      changed.length === 0 ||
      view.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    for (const row of changed) {
      row.classList.add('is-changed');
      highlightedRows.add(row);
    }
    view.clearTimeout(highlight);
    highlight = view.setTimeout(() => {
      for (const row of highlightedRows) row.classList.remove('is-changed');
      highlightedRows = new Set();
    }, CHANGE_HIGHLIGHT_MS);
  };

  const setTheme = async (theme, { persist = false, animate = true } = {}) => {
    const request = ++themeRequest;
    for (const input of themeInputs) input.checked = input.value === theme;

    const loaded = theme === 'material3' && (await ensureMaterial3(root));
    if (signal.aborted || themeRequest !== request) return;
    if (loaded) html.dataset.kiTheme = 'material3';
    else html.removeAttribute('data-ki-theme');
    const active = loaded ? 'material3' : INITIAL_THEME;
    for (const input of themeInputs) input.checked = input.value === active;
    if (persist) writePreference(root, 'kimen-theme', active);
    refresh(animate);
  };
  const setScheme = wireSchemeControls(root, { signal, onChange: refresh });

  // A click on the theme already shown is still an explicit choice and is remembered;
  // it fires no change event, so both events select.
  for (const input of themeInputs) {
    for (const type of ['change', 'click']) {
      input.addEventListener(
        type,
        () => {
          if (input.checked) void setTheme(input.value, { persist: true });
        },
        { signal },
      );
    }
  }
  root.querySelector('[data-reset]').addEventListener(
    'click',
    () => {
      clearPreference(root, 'kimen-theme');
      clearPreference(root, 'kimen-scheme');
      setScheme(INITIAL_SCHEME);
      void setTheme(INITIAL_THEME);
    },
    { signal },
  );

  wireFilter(root, rows, signal);
  wireDrawer(root, signal);
  wireDeployment(root, signal);
  for (const selector of [
    '[data-playground-controls]',
    '[data-token-groups]',
    '[data-token-search]',
    '[data-drawer-toggle]',
  ]) {
    root.querySelector(selector).hidden = false;
  }
  refresh(false);
  void setTheme(readTheme(root), { animate: false });
  void loadKimenElements();

  const cleanup = () => {
    controller.abort();
    view.clearTimeout(highlight);
    for (const row of highlightedRows) row.classList.remove('is-changed');
    initializedDocuments.delete(root);
  };
  initializedDocuments.set(root, cleanup);
  return cleanup;
}

if (document.body?.dataset.kimenPage === 'playground') {
  initializePlayground(document);
}
