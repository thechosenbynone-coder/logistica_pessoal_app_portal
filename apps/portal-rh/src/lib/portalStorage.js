import { mergePayload, readPayload, writePayload } from '../services/portalStorage';

export function readPortalPayload() {
  return readPayload();
}

export function writePortalPayload(next) {
  writePayload(next);
}

export function mergePortalPayload(prev, patch) {
  return mergePayload(prev, patch);
}
