import { buildDemoPayload } from './demoSeed';

export type PortalMode = 'demo' | 'prod';

export const MODE_KEY = 'portal_rh_mode';
export const DEMO_KEY = 'portal_rh_xlsx_demo_v1';
export const PROD_KEY = 'portal_rh_xlsx_v1';

const DEFAULT_PAYLOAD = {
  version: 1,
  importedAt: null,
  dataset: {},
  metrics: {}
};

function notifyUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
}

function isPayloadEmpty(payload: any) {
  const ds = payload?.dataset || {};
  const hasRows = ['colaboradores', 'documentacoes', 'programacoes'].some(
    (key) => Array.isArray(ds[key]) && ds[key].length > 0
  );
  return !hasRows;
}

export function getMode(): PortalMode {
  if (typeof window === 'undefined') return 'demo';
  const raw = window.localStorage.getItem(MODE_KEY);
  return raw === 'prod' ? 'prod' : 'demo';
}

export function setMode(mode: PortalMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODE_KEY, mode);
  notifyUpdate();
}

export function getPayloadKey(mode: PortalMode = getMode()): string {
  return mode === 'demo' ? DEMO_KEY : PROD_KEY;
}

export function readPayload(mode: PortalMode = getMode()): any {
  if (typeof window === 'undefined') return { ...DEFAULT_PAYLOAD };
  const raw = window.localStorage.getItem(getPayloadKey(mode));
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

export function writePayload(nextPayload: any, mode: PortalMode = getMode()): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getPayloadKey(mode), JSON.stringify(nextPayload));
  notifyUpdate();
}

export function mergePayload(prev: any, patch: any): any {
  return {
    ...prev,
    ...patch,
    dataset: { ...(prev?.dataset || {}), ...(patch?.dataset || {}) },
    metrics: { ...(prev?.metrics || {}), ...(patch?.metrics || {}) }
  };
}

export function clearDemo(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_KEY);
  notifyUpdate();
}

export function ensureDemoSeed(): void {
  if (getMode() !== 'demo') return;
  const current = readPayload('demo');
  if (!isPayloadEmpty(current)) return;
  const seed = buildDemoPayload('saudavel');
  writePayload(seed, 'demo');
}
