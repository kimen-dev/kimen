import { initializeLanding, loadKimenElements } from '../landing.js';

const initializedDocuments = new WeakMap();

function renderResolvedTokens(root) {
  const view = root.defaultView ?? window;
  const styles = view.getComputedStyle(root.documentElement);
  for (const output of root.querySelectorAll('[data-token-value]')) {
    const token = output.dataset.tokenValue;
    output.textContent = token
      ? styles.getPropertyValue(token).trim() || 'unavailable'
      : 'unavailable';
  }
}

/** Initialize the playground interaction and return a deterministic cleanup. */
export function initializePlayground(root = document) {
  const existingCleanup = initializedDocuments.get(root);
  if (existingCleanup) {
    return existingCleanup;
  }

  const cleanupLanding = initializeLanding(root);
  const form = root.getElementById('deployment-form');
  const status = root.getElementById('deployment-status');
  const progress = root.getElementById('deployment-progress');
  const progressValue = root.getElementById('deployment-progress-value');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (status) {
      status.hidden = false;
      status.dismissed = false;
    }
    if (progress) {
      progress.value = 87;
      progress.setAttribute('value', '87');
    }
    if (progressValue) {
      progressValue.textContent = '87%';
      progressValue.value = '87%';
    }
  };
  const handleThemeChange = () => renderResolvedTokens(root);

  form?.addEventListener('submit', handleSubmit);
  root.addEventListener('kimen-theme-change', handleThemeChange);
  renderResolvedTokens(root);
  void loadKimenElements();

  const cleanup = () => {
    form?.removeEventListener('submit', handleSubmit);
    root.removeEventListener('kimen-theme-change', handleThemeChange);
    cleanupLanding();
    initializedDocuments.delete(root);
  };
  initializedDocuments.set(root, cleanup);
  return cleanup;
}

if (document.body?.dataset.kimenPage === 'playground') {
  initializePlayground(document);
}
