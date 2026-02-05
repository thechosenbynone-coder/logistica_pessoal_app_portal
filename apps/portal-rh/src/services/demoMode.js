import { buildDemoPayload } from './demoSeed';
import { clearDemo, ensureDemoSeed, getMode, readPayload, setMode, writePayload } from './portalStorage';

const DEMO_SCENARIO_KEY = 'portal_rh_demo_scenario';

export function isDemoMode() {
  return getMode() === 'demo';
}

export function setDemoMode(enabled) {
  setMode(enabled ? 'demo' : 'prod');
}

export function getDemoScenario() {
  if (typeof window === 'undefined') return 'saudavel';
  const stored = window.localStorage.getItem(DEMO_SCENARIO_KEY);
  return ['saudavel', 'risco', 'critico'].includes(stored) ? stored : 'saudavel';
}

export function setDemoScenario(scenario) {
  if (typeof window === 'undefined') return;
  if (!['saudavel', 'risco', 'critico'].includes(scenario)) return;
  window.localStorage.setItem(DEMO_SCENARIO_KEY, scenario);
}

export function seedDemoDataIfNeeded(scenario, force = false) {
  if (!isDemoMode()) return;
  if (!force) {
    ensureDemoSeed();
    return;
  }
  const payload = buildDemoPayload(scenario || getDemoScenario());
  writePayload(payload, 'demo');
}

export function clearDemoData() {
  clearDemo();
}

export function ensureDemoSeedFromRoute() {
  // manter nome por compatibilidade, mas agora só garante seed caso demo esteja vazio
  const current = readPayload('demo');
  if (current?.dataset && Object.keys(current.dataset).length > 0) return;
  ensureDemoSeed();
}
