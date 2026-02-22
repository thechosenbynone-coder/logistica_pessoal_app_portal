import { useState, useCallback } from 'react';

/**
 * Custom hook for geolocation.
 * @param {Object} options - { timeoutMs: number }
 */
export function useGeolocation(options = {}) {
  const { timeoutMs = 8000 } = options;
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    return new Promise((resolve) => {
      setLoading(true);
      setError(null);

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const err = { ok: false, error: 'Geolocalização não disponível neste dispositivo.' };
        setError(err.error);
        setLoading(false);
        resolve(err);
        return;
      }

      const timer = setTimeout(() => {
        const err = { ok: false, error: 'Não foi possível obter sua localização a tempo.' };
        setError(err.error);
        setLoading(false);
        resolve(err);
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const result = {
            ok: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            ts: new Date().toISOString(),
          };
          setLocation(result);
          setLoading(false);
          resolve(result);
        },
        (err) => {
          clearTimeout(timer);
          const code = err?.code;
          const friendlyError =
            code === 1
              ? 'Permissão de localização negada.'
              : code === 2
                ? 'Não foi possível identificar sua localização.'
                : 'Não foi possível obter sua localização.';
          const result = { ok: false, error: friendlyError };
          setError(result.error);
          setLoading(false);
          resolve(result);
        },
        { enableHighAccuracy: true, timeout: timeoutMs }
      );
    });
  }, [timeoutMs]);

  return { location, loading, error, getLocation };
}
