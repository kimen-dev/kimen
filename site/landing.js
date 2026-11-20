/* Progressive enhancement for the Calma landing. The document retains its
   navigation, example spec and disclosures without JavaScript. */
import {
  ensureMaterial3,
  readScheme,
  readTheme,
  wireSchemeControls,
  writePreference,
} from './pages.js';

let elementsRequest;

export function loadKimenElements() {
  const bundleUrl = new window.URL('./assets/elements/kimen/kimen.esm.js', import.meta.url).href;
  elementsRequest ??= import(/* @vite-ignore */ bundleUrl).catch(() => undefined);
  return elementsRequest;
}

function wirePreferences(root, view, signal) {
  const headerScheme = root.querySelector('[data-header-scheme]');
  const themeRadios = [...root.querySelectorAll('[data-theme-control] input')];
  const preferences = root.querySelector('[data-theme-preferences]');
  // The header's and the themes section's scheme controls are the shared segmented control;
  // pages.js keeps them in sync, remembers a choice and follows the system on Auto.
  const setScheme = wireSchemeControls(root, { signal });
  let themeRequest = 0;

  async function setTheme(theme, persist = false) {
    const request = ++themeRequest;
    const isMaterial = theme === 'material3' && (await ensureMaterial3(root));
    if (signal.aborted || request !== themeRequest) return;
    if (isMaterial) root.documentElement.dataset.kiTheme = theme;
    else root.documentElement.removeAttribute('data-ki-theme');
    const active = isMaterial ? theme : 'onmars';
    for (const radio of themeRadios) radio.checked = radio.value === active;
    if (persist) writePreference(root, 'kimen-theme', active);
  }

  function restorePreferences() {
    setScheme(readScheme(root));
    void setTheme(readTheme(root));
  }

  restorePreferences();
  if (preferences) preferences.hidden = false;
  if (headerScheme) headerScheme.hidden = false;
  // A click on the choice already shown is still an explicit choice and is remembered;
  // it fires no change event, so both events select.
  for (const radio of themeRadios) {
    for (const type of ['change', 'click']) {
      radio.addEventListener(type, () => void setTheme(radio.value, true), { signal });
    }
  }
  view.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) restorePreferences();
    },
    { signal },
  );
  view.addEventListener(
    'storage',
    (event) => {
      if (event.key === null || event.key === 'kimen-theme' || event.key === 'kimen-scheme') {
        restorePreferences();
      }
    },
    { signal },
  );
}

function wireCopy(root, view, signal) {
  for (const button of root.querySelectorAll('[data-copy]')) {
    const label = button.querySelector('.copy-label');
    const icon = button.querySelector('[data-copy-icon] use');
    let resetTimer;
    button.hidden = false;
    button.addEventListener(
      'click',
      async () => {
        try {
          await view.navigator.clipboard.writeText(button.dataset.copy);
          if (signal.aborted) return;
          label.textContent = 'Copied';
          icon.setAttribute('href', '#i-check');
        } catch {
          if (signal.aborted) return;
          const selection = view.getSelection();
          const range = root.createRange();
          range.selectNodeContents(button.closest('[data-copy-source]').querySelector('code'));
          selection?.removeAllRanges();
          selection?.addRange(range);
          label.textContent = 'Use your copy shortcut';
        }
        view.clearTimeout(resetTimer);
        resetTimer = view.setTimeout(() => {
          label.textContent = 'Copy';
          icon.setAttribute('href', '#i-copy');
        }, 1800);
      },
      { signal },
    );
    signal.addEventListener('abort', () => view.clearTimeout(resetTimer), { once: true });
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function drawLeads(root, hero, overlay) {
  const box = overlay.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return;
  const spine = hero.querySelector('.spine').getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const lines = [...hero.querySelectorAll('.ln[data-node]')];
  const existing = new Map(
    [...overlay.querySelectorAll('g')].map((group) => [group.dataset.node, group]),
  );
  const sx = spine.right - box.left;

  lines.forEach((line, index) => {
    const node = line.dataset.node;
    const target = hero.querySelector(`[data-node-target="${node}"]`);
    if (!target) return;
    const from = line.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const sy = from.top + from.height / 2 - box.top;
    const tx = to.left - box.left - 6;
    const ty =
      node === 'card' ? to.top - box.top + 2 : to.top + Math.min(to.height / 2, 24) - box.top;
    const lane = Math.min(tx - 10, sx + 12 + (lines.length - 1 - index) * 7);
    const radius = Math.min(6, Math.abs(ty - sy) / 2);
    const turn = Math.sign(ty - sy) * radius;
    const path = `M ${sx} ${sy} H ${lane - radius} Q ${lane} ${sy} ${lane} ${sy + turn} V ${ty - turn} Q ${lane} ${ty} ${lane + radius} ${ty} H ${tx}`;

    let group = existing.get(node);
    if (!group) {
      group = root.createElementNS(SVG_NS, 'g');
      group.dataset.node = node;
      group.append(root.createElementNS(SVG_NS, 'path'), root.createElementNS(SVG_NS, 'circle'));
      overlay.append(group);
    }
    group.querySelector('path').setAttribute('d', path);
    const dot = group.querySelector('circle');
    dot.setAttribute('cx', String(tx + 3));
    dot.setAttribute('cy', String(ty));
    dot.setAttribute('r', '2.5');
  });
}

function wireHero(root, view, signal) {
  const hero = root.querySelector('.hero');
  if (!hero) return;
  const replay = hero.querySelector('[data-replay]');
  const replayLabel = replay.querySelector('.sr');
  const spec = hero.querySelector('[data-spec]');
  const overlay = hero.querySelector('[data-leads]');
  const lines = [...spec.querySelectorAll('.ln')];
  const steps = [...hero.querySelectorAll('.verdict p')];
  const targets = [...hero.querySelectorAll('[data-node-target]')];
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const timers = [];
  let redrawFrame = 0;

  for (const line of lines) {
    const indent = /^ */.exec(line.textContent)?.[0].length ?? 0;
    line.style.setProperty('--ki-site-indent', String(indent));
  }

  function finish() {
    for (const timer of timers.splice(0)) view.clearTimeout(timer);
    hero.classList.remove('is-staging');
    for (const item of [...lines, ...steps, ...targets, ...overlay.children]) {
      item.classList.remove('is-in', 'is-hit');
    }
    replayLabel.textContent = 'Replay the spec';
  }

  function play() {
    if (motion.matches || signal.aborted) return;
    hero.classList.add('is-staging');
    replayLabel.textContent = 'Skip the spec animation';
    spec.scrollTop = 0;
    let elapsed = 160;
    for (const line of lines) {
      timers.push(
        view.setTimeout(() => {
          line.classList.add('is-in');
          const offset = line.getBoundingClientRect().bottom - spec.getBoundingClientRect().bottom;
          if (offset > 0) spec.scrollTop += offset + line.offsetHeight;
          const node = line.dataset.node;
          if (node) {
            line.classList.add('is-hit');
            hero.querySelector(`[data-node-target="${node}"]`)?.classList.add('is-in');
            overlay.querySelector(`g[data-node="${node}"]`)?.classList.add('is-in');
          }
        }, elapsed),
      );
      elapsed += line.hasAttribute('data-node') ? 160 : 65;
      if (line.hasAttribute('data-bad')) {
        for (const step of steps) {
          timers.push(view.setTimeout(() => step.classList.add('is-in'), elapsed));
          elapsed += 450;
        }
      }
    }
    timers.push(view.setTimeout(finish, elapsed + 300));
  }

  function redraw() {
    view.cancelAnimationFrame(redrawFrame);
    redrawFrame = view.requestAnimationFrame(() => drawLeads(root, hero, overlay));
  }

  // The preview's slotted targets have no box until their elements render, which does not
  // resize the hero; observing them redraws the leads once they can be reached.
  const resizeObserver = new view.ResizeObserver(redraw);
  for (const element of [hero, ...targets]) resizeObserver.observe(element);
  void root.fonts?.ready.then(() => {
    if (!signal.aborted) redraw();
  });
  replay.hidden = motion.matches;
  replay.addEventListener(
    'click',
    () => {
      if (hero.classList.contains('is-staging')) finish();
      else play();
    },
    { signal },
  );
  hero.addEventListener(
    'focusin',
    (event) => {
      if (hero.classList.contains('is-staging') && event.target.closest('[data-node-target]')) {
        finish();
      }
    },
    { signal },
  );
  motion.addEventListener(
    'change',
    () => {
      if (motion.matches) finish();
      replay.hidden = motion.matches;
    },
    { signal },
  );

  // Start once after the example is visible. The finished spec is the static state.
  const visibility = new view.IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visibility.disconnect();
      if (!hero.classList.contains('is-staging') && !hero.contains(root.activeElement)) play();
    },
    { threshold: 0.4 },
  );
  void loadKimenElements().then(() => {
    if (signal.aborted) return;
    redraw();
    visibility.observe(hero.querySelector('.spine'));
  });
  signal.addEventListener(
    'abort',
    () => {
      finish();
      view.cancelAnimationFrame(redrawFrame);
      resizeObserver.disconnect();
      visibility.disconnect();
    },
    { once: true },
  );
}

const BANDS = [
  { theme: 'onmars', scheme: 'dark', label: 'onmars · dark' },
  { theme: 'material3', scheme: 'light', label: 'Material 3 · light' },
  { theme: 'material3', scheme: 'dark', label: 'Material 3 · dark' },
];

function wireBands(root, view, signal) {
  const bands = root.querySelector('[data-bands]');
  if (!bands) return;
  const first = bands.querySelector('[data-band]');
  const seams = [...bands.querySelectorAll('[data-seam]')];
  const picker = root.querySelector('[data-band-picks]');
  const picks = [...picker.querySelectorAll('[data-pick]')];
  const narrow = view.matchMedia('(width <= 64rem)');
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const bandElements = [first];
  const values = [25, 50, 75];
  const gap = 6;
  let scrollFrame = 0;
  let fitFrame = 0;

  function seamPosition(event) {
    const box = bands.getBoundingClientRect();
    const rtl = view.getComputedStyle(bands).direction === 'rtl';
    const inline = rtl ? box.right - event.clientX : event.clientX - box.left;
    return (inline / box.width) * 100;
  }

  function setSeam(index, value) {
    const min = index === 0 ? gap : values[index - 1] + gap;
    const max = index === values.length - 1 ? 100 - gap : values[index + 1] - gap;
    values[index] = Math.min(max, Math.max(min, Math.round(value)));
    bands.style.setProperty(`--ki-site-s${index + 1}`, `${values[index]}%`);
    seams.forEach((seam, offset) => {
      seam.setAttribute('aria-valuemin', String(offset === 0 ? gap : values[offset - 1] + gap));
      seam.setAttribute(
        'aria-valuemax',
        String(offset === values.length - 1 ? 100 - gap : values[offset + 1] - gap),
      );
      seam.setAttribute('aria-valuenow', String(values[offset]));
      seam.setAttribute('aria-valuetext', `${values[offset]}%`);
    });
  }

  function highlightBand() {
    const box = bands.getBoundingClientRect();
    const rtl = view.getComputedStyle(bands).direction === 'rtl';
    let selected = bandElements[0];
    let distance = Infinity;
    for (const band of bandElements) {
      const rect = band.getBoundingClientRect();
      const difference = Math.abs(rtl ? rect.right - box.right : rect.left - box.left);
      if (difference < distance) {
        selected = band;
        distance = difference;
      }
    }
    for (const band of bandElements) band.inert = !narrow.matches || band !== selected;
    for (const pick of picks) {
      pick.setAttribute('aria-pressed', String(pick.dataset.pick === selected.dataset.band));
    }
  }

  function fitBandTitles() {
    view.cancelAnimationFrame(fitFrame);
    fitFrame = view.requestAnimationFrame(() => {
      const titles = bandElements.map((band) => band.querySelector('.surface-title'));
      for (const title of titles) {
        title.style.removeProperty('--ki-site-band-heading-size');
        title.style.removeProperty('--ki-site-band-heading-height');
      }
      if (narrow.matches || !bands.hasAttribute('data-ready')) return;

      // Match the word break at the center seam even when the themes use
      // different typefaces. Keep a single row height across all four bands.
      const box = bands.getBoundingClientRect();
      const center = box.left + box.width / 2;
      const rtl = view.getComputedStyle(bands).direction === 'rtl';
      const sizes = titles.map((title) => {
        const rect = title.getBoundingClientRect();
        const range = root.createRange();
        const at = title.textContent.indexOf(' Light');
        if (at < 0) return Number.parseFloat(view.getComputedStyle(title).fontSize);
        range.setStart(title.firstChild, at);
        range.setEnd(title.firstChild, at + 1);
        const space = range.getBoundingClientRect();
        const inlineStart = rtl ? rect.right : rect.left;
        const width = Math.abs((space.left + space.right) / 2 - inlineStart);
        const base = Number.parseFloat(view.getComputedStyle(title).fontSize);
        return width > 0
          ? Math.min(base * 1.4, (base * Math.abs(center - inlineStart)) / width)
          : base;
      });
      const rowHeight = Math.max(...sizes);
      titles.forEach((title, index) => {
        title.style.setProperty('--ki-site-band-heading-size', `${sizes[index]}px`);
        title.style.setProperty('--ki-site-band-heading-height', `${rowHeight}px`);
      });
    });
  }

  // The copies are made at once and stay hidden until the bands are ready (#520, item 19): their
  // components render while the visitor reads the hero, so the bands never show up empty.
  for (const [index, config] of BANDS.entries()) {
    const copy = first.cloneNode(true);
    copy.dataset.band = String(index + 2);
    copy.dataset.kiTheme = config.theme;
    copy.dataset.kiColorScheme = config.scheme;
    copy.querySelector('.band-label').textContent = config.label;
    copy.querySelector('.band-attr').textContent =
      config.theme === 'onmars'
        ? `data-ki-color-scheme="${config.scheme}"`
        : `data-ki-theme="material3"\ndata-ki-color-scheme="${config.scheme}"`;
    bandElements.at(-1).after(copy);
    bandElements.push(copy);
  }

  function activateBands() {
    bands.dataset.ready = '';
    for (const seam of seams) seam.hidden = false;
    picker.hidden = false;
    for (const hint of root.querySelectorAll('[data-band-hint]')) hint.hidden = false;
    setSeam(0, values[0]);
    highlightBand();
    fitBandTitles();
  }

  // Request Material 3 as the band demo approaches, or when a visitor tabbing
  // ahead chooses Material 3 as the page theme.
  const near = new view.IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      void ensureMaterial3(root).then((loaded) => {
        if (loaded && !signal.aborted) activateBands();
      });
    },
    { rootMargin: '10% 0px' },
  );
  near.observe(bands);

  bands.addEventListener(
    'click',
    (event) => {
      if (
        narrow.matches ||
        !bands.hasAttribute('data-ready') ||
        event.target.closest('[data-seam]')
      ) {
        return;
      }
      const position = seamPosition(event);
      const nearest = values.reduce(
        (index, value, candidate) =>
          Math.abs(value - position) < Math.abs(values[index] - position) ? candidate : index,
        0,
      );
      setSeam(nearest, position);
    },
    { signal },
  );

  seams.forEach((seam, index) => {
    seam.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0) return;
        seam.focus({ preventScroll: true });
        seam.setPointerCapture(event.pointerId);
        seam.classList.add('is-dragging');
      },
      { signal },
    );
    seam.addEventListener(
      'pointermove',
      (event) => {
        if (seam.hasPointerCapture(event.pointerId)) setSeam(index, seamPosition(event));
      },
      { signal },
    );
    seam.addEventListener('lostpointercapture', () => seam.classList.remove('is-dragging'), {
      signal,
    });
    seam.addEventListener(
      'keydown',
      (event) => {
        const rtl = view.getComputedStyle(bands).direction === 'rtl';
        const step = {
          ArrowLeft: rtl ? 2 : -2,
          ArrowRight: rtl ? -2 : 2,
          ArrowDown: -2,
          ArrowUp: 2,
          PageDown: -10,
          PageUp: 10,
        };
        if (Object.hasOwn(step, event.key)) setSeam(index, values[index] + step[event.key]);
        else if (event.key === 'Home') setSeam(index, 0);
        else if (event.key === 'End') setSeam(index, 100);
        else return;
        event.preventDefault();
      },
      { signal },
    );
  });

  for (const pick of picks) {
    pick.addEventListener(
      'click',
      () => {
        const target = bandElements[Number(pick.dataset.pick) - 1]?.getBoundingClientRect();
        if (!target) return;
        const frame = bands.getBoundingClientRect();
        const rtl = view.getComputedStyle(bands).direction === 'rtl';
        bands.scrollBy({
          left: rtl ? target.right - frame.right : target.left - frame.left,
          behavior: motion.matches ? 'instant' : 'smooth',
        });
      },
      { signal },
    );
  }
  bands.addEventListener(
    'scroll',
    () => {
      view.cancelAnimationFrame(scrollFrame);
      scrollFrame = view.requestAnimationFrame(highlightBand);
    },
    { signal, passive: true },
  );
  narrow.addEventListener('change', highlightBand, { signal });
  const resize = new view.ResizeObserver(fitBandTitles);
  resize.observe(bands);
  root.fonts?.addEventListener('loadingdone', fitBandTitles, { signal });
  signal.addEventListener(
    'abort',
    () => {
      view.cancelAnimationFrame(scrollFrame);
      view.cancelAnimationFrame(fitFrame);
      near.disconnect();
      resize.disconnect();
    },
    { once: true },
  );
}

function issue(code, path, message, value) {
  return { ok: false, issues: [{ code, path, message, value }] };
}

// Examples show recorded results of the package's validateUiSpec API.
const CASES = [
  {
    spec: {
      version: 1,
      root: { component: 'ki-button', props: { onclick: 'alert(1)' }, slots: { '': ['Pay now'] } },
    },
    output: issue(
      'unknown-prop',
      'root.props.onclick',
      'ki-button declares no prop "onclick"',
      'onclick',
    ),
  },
  {
    spec: {
      version: 1,
      root: { component: 'ki-badge', props: { tone: 'sparkle' }, slots: { '': ['New'] } },
    },
    output: issue(
      'invalid-prop-type',
      'root.props.tone',
      'ki-badge prop "tone" expects one of "danger", "info", "neutral", "success", "warning"',
      'sparkle',
    ),
  },
  {
    spec: { version: 1, root: { component: 'ki-iframe', props: { src: 'https://example.com' } } },
    output: issue(
      'unknown-component',
      'root.component',
      'component "ki-iframe" is outside the catalog',
      'ki-iframe',
    ),
  },
  {
    spec: {
      version: 1,
      actions: ['save-draft'],
      root: { component: 'ki-button', action: 'delete-account', slots: { '': ['Delete account'] } },
    },
    output: issue(
      'undeclared-action',
      'root.action',
      'action "delete-account" is not declared in the spec\'s action list',
      'delete-account',
    ),
  },
  {
    spec: {
      version: 1,
      root: {
        component: 'ki-badge',
        props: { ['__proto__']: { admin: true } },
        slots: { '': ['Staff'] },
      },
    },
    output: issue(
      'forbidden-key',
      'spec.root.props.__proto__',
      'forbidden key "__proto__" is not allowed in a UI spec',
      '__proto__',
    ),
  },
];

function wireGuard(root, signal) {
  const bench = root.querySelector('[data-guard]');
  if (!bench) return;
  const input = bench.querySelector('[data-guard-in] code');
  const output = bench.querySelector('[data-guard-out] code');
  const picks = bench.querySelector('.guard-picks');
  const buttons = [...picks.querySelectorAll('[data-case]')];
  picks.hidden = false;
  for (const button of buttons) {
    button.addEventListener(
      'click',
      () => {
        const chosen = CASES[Number(button.dataset.case)];
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
        input.textContent = JSON.stringify(chosen.spec, null, 2);
        output.textContent = JSON.stringify(chosen.output, null, 2);
      },
      { signal },
    );
  }
}

function componentDeclarations(manifest) {
  const declarations = new Map();
  if (!Array.isArray(manifest?.modules)) return declarations;
  for (const module of manifest.modules) {
    if (!Array.isArray(module?.declarations)) continue;
    for (const declaration of module.declarations) {
      const tag = declaration?.tagName;
      if (typeof tag === 'string' && /^ki-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(tag)) {
        declarations.set(tag, declaration);
      }
    }
  }
  return declarations;
}

function appendTagLinks(root, cell, tags) {
  const label = root.createElement('p');
  label.className = 'tag';
  for (const tag of tags) {
    if (label.hasChildNodes()) label.append(' · ');
    const link = root.createElement('a');
    link.href = `./docs/components/${tag.slice(3)}/`;
    link.textContent = tag;
    label.append(link);
  }
  cell.append(label);
}

function defaultSample(root, tag, declaration) {
  const cell = root.createElement('div');
  cell.className = 'cell';
  const sample = root.createElement(tag);
  const name = tag.slice(3).replaceAll('-', ' ');
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  for (const member of declaration.members ?? []) {
    if (member.attribute === 'label' || member.attribute === 'heading') {
      sample.setAttribute(member.attribute, title);
    }
  }
  if (declaration.slots?.some((slot) => slot.name === '')) sample.textContent = title;
  // One pattern for every cell (#520, item 20): the live sample, then its tag line. The frame
  // contains the sample's own layout, so page chrome such as ki-mobile-nav's fixed bar stays
  // inside its cell instead of covering the page.
  const frame = root.createElement('div');
  frame.className = 'cell-sample';
  frame.append(sample);
  cell.append(frame);
  return cell;
}

/**
 * End the wall flush (#520, item 20): stretch its last cell across whatever its row leaves
 * empty. Dense packing fills the holes before it.
 */
function fillLastRow(grid, view) {
  const last = grid.lastElementChild;
  if (!(last instanceof view.HTMLElement)) return;
  last.style.removeProperty('grid-column-end');
  const columns = view.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
  if (columns.length < 2 || grid.hidden) return;
  const area = grid.getBoundingClientRect();
  const box = last.getBoundingClientRect();
  const track = area.width / columns.length;
  const rtl = view.getComputedStyle(grid).direction === 'rtl';
  const start = Math.round((rtl ? area.right - box.right : box.left - area.left) / track);
  const span = Math.max(1, Math.round(box.width / track));
  const rest = columns.length - start - span;
  if (rest > 0) last.style.setProperty('grid-column-end', `span ${span + rest}`);
}

export function renderCatalog(manifest, root = document) {
  const grid = root.getElementById('catalog-grid');
  const samples = root.querySelector('[data-catalog-samples]');
  const declarations = componentDeclarations(manifest);
  if (!grid || !samples || declarations.size === 0) return false;
  const represented = new Set();
  const cells = root.createDocumentFragment();

  // Specimen templates provide richer examples for known tags. The manifest
  // decides which templates qualify, which tags get links and what gets a fallback.
  for (const specimen of samples.content.children) {
    const tags = [
      ...new Set(
        [...specimen.querySelectorAll('*')]
          .map((node) => node.localName)
          .filter((tag) => tag.startsWith('ki-')),
      ),
    ];
    if (tags.some((tag) => !declarations.has(tag))) continue;
    const firstAppearances = tags.filter((tag) => !represented.has(tag));
    if (firstAppearances.length === 0) continue;
    const cell = specimen.cloneNode(true);
    appendTagLinks(root, cell, firstAppearances);
    cells.append(cell);
    for (const tag of firstAppearances) represented.add(tag);
  }

  for (const tag of [...declarations.keys()].sort()) {
    if (represented.has(tag)) continue;
    const cell = defaultSample(root, tag, declarations.get(tag));
    appendTagLinks(root, cell, [tag]);
    cells.append(cell);
  }

  grid.replaceChildren(cells);
  grid.hidden = false;
  fillLastRow(grid, root.defaultView);
  const count = root.querySelector('[data-component-count]');
  if (count) count.textContent = String(declarations.size);
  return true;
}

function wireCatalog(root, view, signal) {
  const grid = root.getElementById('catalog-grid');
  if (!grid) return;
  const manifestUrl = new view.URL('./assets/elements/custom-elements.json', import.meta.url);
  const status = root.querySelector('[data-catalog-status]');
  grid.addEventListener(
    'click',
    (event) => {
      const toast = event.target.closest('[data-wall-toast]');
      if (toast) {
        const toaster = toast.closest('.cell').querySelector('ki-toaster');
        void toaster.show?.({ message: 'Changes saved.', tone: 'success' });
      }
      const toggle = event.target.closest('[data-wall-spinner]');
      if (toggle) {
        const spinner = toggle.closest('.cell').querySelector('ki-spinner');
        spinner.hidden = !spinner.hidden;
        toggle.setAttribute('aria-pressed', String(!spinner.hidden));
      }
    },
    { signal },
  );
  const observer = new view.IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void view
        .fetch(manifestUrl, { signal })
        .then((response) => {
          if (!response.ok) throw new Error('Could not load the component manifest.');
          return response.json();
        })
        .then((manifest) => {
          if (signal.aborted) return;
          if (!renderCatalog(manifest, root))
            throw new Error('No components found in the manifest.');
        })
        .catch(() => {
          if (!signal.aborted)
            status.textContent =
              'The live wall is unavailable. Browse the component documentation.';
        });
    },
    { rootMargin: '90% 0px' },
  );
  observer.observe(grid.parentElement);
  // The column count changes with the viewport; the last row is filled again each time.
  const resize = new view.ResizeObserver(() => fillLastRow(grid, view));
  resize.observe(grid);
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect();
      resize.disconnect();
    },
    { once: true },
  );
}

/**
 * The phone header menu (#520, item 22) is a native disclosure. Close it the way a menu closes:
 * on Escape (focus back on its button), on a click outside it, and when a link inside it is
 * followed (a same-page link would otherwise leave it open over the section it jumped to).
 */
function wireTopnavMenu(root, signal) {
  const menu = root.querySelector('[data-topnav-menu]');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  menu.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !menu.open) return;
      menu.open = false;
      summary?.focus();
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (event) => {
      if (!menu.open) return;
      if (!menu.contains(event.target) || event.target.closest?.('a')) menu.open = false;
    },
    { signal },
  );
}

function wireDock(root, view, signal) {
  const dock = root.querySelector('[data-dock]');
  const hero = root.querySelector('.hero');
  if (!dock || !hero) return;
  const observer = new view.IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || !dock.contains(root.activeElement))
      dock.hidden = entry.isIntersecting;
    dock.classList.toggle('is-shown', !dock.hidden);
  });
  observer.observe(hero);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}

export function initializeLanding(root = document) {
  const view = root.defaultView;
  const controller = new view.AbortController();
  const { signal } = controller;
  wirePreferences(root, view, signal);
  wireCopy(root, view, signal);
  wireHero(root, view, signal);
  wireBands(root, view, signal);
  wireGuard(root, signal);
  wireCatalog(root, view, signal);
  wireDock(root, view, signal);
  wireTopnavMenu(root, signal);
  return () => controller.abort();
}

if (document.querySelector('[data-kimen-page="landing"]')) {
  const iconUrl = new window.URL('./assets/elements/icons/circle-check.js', import.meta.url).href;
  void import(/* @vite-ignore */ iconUrl).catch(() => undefined);
  initializeLanding();
}
