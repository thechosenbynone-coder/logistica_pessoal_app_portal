import { useEffect, useState } from 'react';

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function resolveInitial(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

/**
 * Persist a piece of state in localStorage.
 */
export function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    const fallback = resolveInitial(initialValue);

    if (typeof window === 'undefined') return fallback;

    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;

    return safeParse(raw, fallback);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / private mode errors
    }
  }, [key, state]);

  return [state, setState];
}
