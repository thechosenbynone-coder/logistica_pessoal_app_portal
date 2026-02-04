const DEFAULT_PAYLOAD = {
  version: 1,
  dataset: {},
  metrics: {}
};

export function readPortalPayload() {
  if (typeof window === 'undefined') return { ...DEFAULT_PAYLOAD };
  const raw = window.localStorage.getItem('portal_rh_xlsx_v1');
  if (!raw) return { ...DEFAULT_PAYLOAD };
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PAYLOAD,
      ...parsed,
      dataset: { ...DEFAULT_PAYLOAD.dataset, ...(parsed?.dataset || {}) },
      metrics: { ...DEFAULT_PAYLOAD.metrics, ...(parsed?.metrics || {}) }
    };
  } catch {
    return { ...DEFAULT_PAYLOAD };
  }
}

export function mergePortalPayload(prev, patch) {
  return {
    ...prev,
    ...patch,
    dataset: { ...(prev?.dataset || {}), ...(patch?.dataset || {}) },
    metrics: { ...(prev?.metrics || {}), ...(patch?.metrics || {}) }
  };
}

export function writePortalPayload(next) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('portal_rh_xlsx_v1', JSON.stringify(next));
  window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
}
